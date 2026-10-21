"""Small authoring helpers shared by the bear builder, dance and source checks."""
import hashlib
import json
import math
from pathlib import Path

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


def export_model(path, arm, meshes, animation=False):
    """Explicit skinned roots, UVs and one active action; no cameras or old gaits."""
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
            export_animations=animation, export_animation_mode='ACTIVE_ACTIONS',
            export_force_sampling=True, export_frame_range=True, export_frame_step=1,
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
        scene.render.resolution_x = 288
        scene.render.resolution_y = 336
        path = output_dir / 'bear-still.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        paths['still'] = str(path)
    return paths
