"""Small authoring helpers shared by the bear builder, dance and source checks."""
import hashlib
import json
import math
from pathlib import Path
import struct

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

from build_catalog_t01 import reset, select, setup_render, world_mesh


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, payload):
    Path(path).write_text(json.dumps(payload, indent=2) + '\n')


def material(name, hex_color, roughness=.82):
    channels = [int(hex_color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4
              for value in channels]
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*linear, 1)
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = 0
    return result


def ellipsoid(name, center, radii, mat, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    select(obj)
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def bind_rigid(obj, arm, bone_name):
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Bear shared-rig attachment', 'ARMATURE')
    modifier.object = arm
    modifier.use_deform_preserve_volume = False
    obj.parent = arm
    obj.matrix_world = Matrix.Identity(4)


def world_rotation(bone, axis, degrees):
    local_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    bone.rotation_mode = 'QUATERNION'
    bone.rotation_quaternion = Quaternion(local_axis.normalized(), math.radians(degrees))


def add_world_rotation(bone, axis, degrees):
    if abs(degrees) < 1e-6:
        return
    local_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    bone.rotation_mode = 'QUATERNION'
    bone.rotation_quaternion = Quaternion(local_axis.normalized(), math.radians(degrees)) @ bone.rotation_quaternion


def rotate_world(arm, bone_name, world_axis, degrees):
    """Rotate a pose bone around an exact world axis in current posed space."""
    if abs(degrees) < 1e-6:
        return
    pb = arm.pose.bones[bone_name]
    cur_rot = pb.matrix.to_3x3().normalized()
    local_axis = cur_rot.inverted() @ Vector(world_axis).normalized()
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion(local_axis, math.radians(degrees))
    bpy.context.view_layer.update()


def rotate_local(arm, bone_name, local_axis, degrees):
    """Rotate a pose bone around its own local bone axis in current posed space."""
    if abs(degrees) < 1e-6:
        return
    pb = arm.pose.bones[bone_name]
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion(Vector(local_axis).normalized(), math.radians(degrees))
    bpy.context.view_layer.update()


def relaxed_pose(arm, degrees):
    reset(arm)
    for side, sign in [('Left', 1), ('Right', -1)]:
        world_rotation(arm.pose.bones[f'{side}Arm'], (0, 1, 0), sign * degrees)
    bpy.context.view_layer.update()


def triangles(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    count = sum(len(polygon.vertices) - 2 for polygon in mesh.polygons)
    evaluated.to_mesh_clear()
    return count


def _skin_role(bone_name):
    if any(part in bone_name for part in ('Arm', 'Hand', 'Shoulder')):
        return 'arm'
    if any(part in bone_name for part in ('Head', 'neck', 'head')):
        return 'head'
    if any(part in bone_name for part in ('Spine', 'Hips', 'Leg', 'Foot', 'Toe')):
        return 'torso-leg'
    return 'other'


def decimate_and_normalize_skin(mesh, arm, ratio=0.28, min_weight=1e-3, max_influences=4):
    """Weld split seam vertices, apply UV-delimited collapse decimation, and float32-normalize top-4 bone weights."""
    mesh.data.calc_loop_triangles()
    original_triangles = len(mesh.data.loop_triangles)
    original_vertices = len(mesh.data.vertices)

    # Weld coincident 3D seam vertices while keeping per-corner loop UVs intact on BMLoop.
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.validate(clean_customdata=False)
    mesh.data.update()

    # Preserve eye-socket curvature in Head-local cm plus 1-ring mixed-role skinning seams
    # (arm <-> torso-leg underarm folds and arm <-> head collar seams) while keeping ears/paws/shoes smooth.
    preserve_group_name = '_bear_face_preserve'
    to_head = (
        (arm.matrix_world @ arm.data.bones['Head'].matrix_local).inverted() @ mesh.matrix_world
        if 'Head' in arm.data.bones
        else None
    )
    eye_preserve = set()
    crease_seed = set()
    for v in mesh.data.vertices:
        if to_head is not None:
            hp = to_head @ v.co
            if abs(hp.x) <= 24.0 and 30.0 <= hp.y <= 46.0 and hp.z >= 28.0:
                eye_preserve.add(v.index)
                continue
        role_weights = {'arm': 0.0, 'head': 0.0, 'torso-leg': 0.0, 'other': 0.0}
        for g in v.groups:
            if g.weight > 1e-3:
                role_weights[_skin_role(mesh.vertex_groups[g.group].name)] += g.weight
        if role_weights['arm'] >= 0.25 and (role_weights['torso-leg'] >= 0.25 or role_weights['head'] >= 0.25):
            crease_seed.add(v.index)

    adjacency = {i: set() for i in range(len(mesh.data.vertices))}
    for poly in mesh.data.polygons:
        verts = list(poly.vertices)
        for vi in verts:
            adjacency[vi].update(verts)
    crease_expanded = set(crease_seed)
    for vi in list(crease_seed):
        crease_expanded.update(adjacency[vi])
    face_verts = sorted(eye_preserve | crease_expanded)

    if face_verts:
        vg_face = mesh.vertex_groups.new(name=preserve_group_name)
        vg_face.add(face_verts, 1.0, 'REPLACE')

    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    dec = mesh.modifiers.new(name='Bear_Decimate', type='DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = ratio
    dec.use_collapse_triangulate = True
    dec.delimit = {'UV'}
    if face_verts:
        dec.vertex_group = preserve_group_name
        dec.invert_vertex_group = True
    bpy.ops.object.modifier_move_to_index(modifier=dec.name, index=0)
    bpy.ops.object.modifier_apply(modifier=dec.name)
    if preserve_group_name in mesh.vertex_groups:
        mesh.vertex_groups.remove(mesh.vertex_groups[preserve_group_name])
    mesh.data.validate(clean_customdata=False)
    mesh.data.update()
    bpy.ops.outliner.orphans_purge(do_recursive=True)

    bone_names = {b.name for b in arm.data.bones}
    for vg in list(mesh.vertex_groups):
        if vg.name not in bone_names:
            mesh.vertex_groups.remove(vg)
    fallback_group = next(vg.index for vg in mesh.vertex_groups if vg.name in bone_names)

    assignments = []
    max_weight_sum_error = 0.0
    for v in mesh.data.vertices:
        raw = [
            (g.group, float(g.weight))
            for g in v.groups
            if mesh.vertex_groups[g.group].name in bone_names and g.weight >= min_weight
        ]
        if not raw:
            raw = [
                (g.group, float(g.weight))
                for g in v.groups
                if mesh.vertex_groups[g.group].name in bone_names and g.weight > 0.0
            ]
        if not raw:
            raw = [(fallback_group, 1.0)]
        raw.sort(key=lambda item: (-item[1], item[0]))
        top = raw[:max_influences]
        total = math.fsum(w for _, w in top)
        f32 = [struct.unpack('f', struct.pack('f', w / total))[0] for _, w in top]
        f32[0] = struct.unpack('f', struct.pack('f', 1.0 - math.fsum(f32[1:])))[0]
        err = abs(math.fsum(f32) - 1.0)
        if err > max_weight_sum_error:
            max_weight_sum_error = err
        assignments.append((v.index, [(top[i][0], f32[i]) for i in range(len(top))]))

    all_indices = list(range(len(mesh.data.vertices)))
    for vg in mesh.vertex_groups:
        vg.remove(all_indices)
    for v_idx, pairs in assignments:
        for g_idx, w in pairs:
            mesh.vertex_groups[g_idx].add([v_idx], w, 'REPLACE')
    mesh.data.update()
    mesh.data.calc_loop_triangles()

    return {
        'ratio': ratio,
        'original_vertices': original_vertices,
        'original_triangles': original_triangles,
        'decimated_vertices': len(mesh.data.vertices),
        'decimated_triangles': len(mesh.data.loop_triangles),
        'max_weight_sum_error': max_weight_sum_error,
    }


def export_model(path, arm, meshes, animation=False, animation_mode='ACTIVE_ACTIONS'):
    """Explicit skinned roots, UVs and active/all actions; no cameras or old gaits."""
    # glTF export_apply=False deliberately preserves skinning, but ignores MASK.
    # Bake only the masks on a disposable body copy, with the armature disabled.
    temporary = []
    selected_meshes = []
    for source in meshes:
        if not any(mod.type == 'MASK' for mod in source.modifiers):
            selected_meshes.append(source)
            continue
        clone = source.copy()
        clone.data = source.data.copy()
        bpy.context.collection.objects.link(clone)
        clone.name = source.name + '_export'
        bpy.context.view_layer.objects.active = clone
        armatures = [mod for mod in clone.modifiers if mod.type == 'ARMATURE']
        for mod in armatures:
            mod.show_viewport = False
        for mod in list(clone.modifiers):
            if mod.type == 'MASK':
                bpy.ops.object.modifier_apply(modifier=mod.name)
        for mod in armatures:
            mod.show_viewport = True
        selected_meshes.append(clone)
        temporary.append(clone)
    bpy.ops.object.select_all(action='DESELECT')
    records = []
    for obj in [arm, *selected_meshes]:
        obj.select_set(True)
        if obj.type == 'MESH':
            records.append((obj, obj.parent, obj.matrix_world.copy()))
            obj.parent = None
            obj.matrix_world = records[-1][2]
    bpy.context.view_layer.objects.active = arm
    try:
        bpy.ops.export_scene.gltf(
            filepath=str(path), export_format='GLB', use_selection=True,
            export_apply=False, export_texcoords=True, export_image_format='AUTO',
            export_animations=animation, export_animation_mode=animation_mode,
            export_force_sampling=True, export_frame_range=(animation_mode != 'ACTIONS'), export_frame_step=1,
            export_nla_strips=False, export_bake_animation=False,
            export_nla_strips_merged_animation_name='celebrate',
            export_optimize_animation_size=False, export_def_bones=False,
        )
    finally:
        for obj, parent, matrix in records:
            obj.parent = parent
            obj.matrix_world = matrix
        for obj in temporary:
            bpy.data.objects.remove(obj, do_unlink=True)


def render_reviews(output_dir, center_z=1.07, views=None, still=True, samples=8):
    output_dir = Path(output_dir)
    camera = setup_render()
    scene = bpy.context.scene
    scene.cycles.samples = samples
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    camera.data.ortho_scale = 2.50
    target = Vector((0, 0, center_z))
    paths = {}
    for label, offset in views or [
        ('front', (0, -5, .10)), ('side', (-5, 0, .10)),
        ('back', (0, 5, .10)), ('three-quarter', (-2.2, -5, .15)),
    ]:
        camera.location = target + Vector(offset)
        camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
        path = output_dir / f'{label}-review.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        paths[label] = str(path)
    if still:
        # Match AvatarModel's 2.7 m normalization and the product camera exactly.
        points = [point for obj in bpy.data.objects if obj.type == 'MESH' for point in world_mesh(obj)[0]]
        minimum_z, maximum_z = min(point.z for point in points), max(point.z for point in points)
        scale = 2.7 / (maximum_z - minimum_z)
        center_x = (min(point.x for point in points) + max(point.x for point in points)) / 2
        center_y = (min(point.y for point in points) + max(point.y for point in points)) / 2
        target = Vector((center_x, center_y, minimum_z + 1.25 / scale))
        camera.data.type = 'PERSP'
        camera.data.sensor_fit = 'VERTICAL'
        camera.data.lens = camera.data.sensor_height / (2 * math.tan(math.radians(17)))
        camera.location = Vector((center_x, center_y - 5.2 / scale, minimum_z + 1.35 / scale))
        camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.resolution_x = 320
        scene.render.resolution_y = 368
        path = output_dir / 'bear-still.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        paths['still'] = str(path)
    return paths
