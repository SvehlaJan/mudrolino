"""Create an isolated texture-ready H01 study: painted face and beard on a UV head.

Ears, nose and hair keep the reference-A style study construction. Eyes, brows,
lips and the full short beard come from a painted canonical lat-long texture
(tools/avatar/paint_catalog_face.mjs --face=H01). The body, rig, garments and
walk/run curves stay exact. This is a candidate study, not an accepted head.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_catalog_head as head_builder
from build_catalog_head import head_objects, material, surface_point, smooth
from build_catalog_t01 import reset, setup_render, select
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature, lower_face
from build_catalog_female_foundation_study import export_uv

# Modeled features replaced by the painted texture.
PAINTED = ('H01 rounded face', 'H01 eye', 'H01 brown iris', 'H01 pupil', 'H01 brow', 'H01 smile', 'H01 lower lip', 'H01 moustache')
ROWS, COLUMNS = 64, 96


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def textured_face(image):
    """The reference-A face surface with lat-long UVs: u = theta/(2*pi), v = 1 - phi/pi."""
    vertices = [tuple(surface_point(math.pi * r / ROWS, 2 * math.pi * i / COLUMNS)) for r in range(ROWS + 1) for i in range(COLUMNS + 1)]
    faces, corners = [], []
    for r in range(ROWS):
        for i in range(COLUMNS):
            a = r * (COLUMNS + 1) + i
            faces.append((a, a + 1, a + COLUMNS + 2, a + COLUMNS + 1))
            corners.append([(i / COLUMNS, 1 - r / ROWS), ((i + 1) / COLUMNS, 1 - r / ROWS),
                            ((i + 1) / COLUMNS, 1 - (r + 1) / ROWS), (i / COLUMNS, 1 - (r + 1) / ROWS)])
    mesh = bpy.data.meshes.new('H01 rounded face'); mesh.from_pydata(vertices, [], faces); mesh.update()
    layer = mesh.uv_layers.new(name='canonical_face_uv')
    for polygon, uvs in zip(mesh.polygons, corners):
        for loop, uv in zip(polygon.loop_indices, uvs): layer.data[loop].uv = uv
    # Merge poles and the seam; loop UVs keep 0 and 1 on either side of the seam.
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new('H01 rounded face', mesh); bpy.context.collection.objects.link(obj)
    face = material('face_surface', (.72, .385, .215))
    node = face.node_tree.nodes.new('ShaderNodeTexImage'); node.name = 'Painted H01 face'
    node.image = image; node.interpolation = 'Linear'
    face.node_tree.links.new(node.outputs['Color'], face.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return smooth(obj, face)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--face-image', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--review-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True); args.review_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']; reset(arm)
    unchanged = {obj.name: geometry_signature(obj) for obj in bpy.data.objects if obj.type == 'MESH' and obj.name != 'H01_head'}
    rig_before = rig_signature(arm); motion_before = motion_signature()
    old_head = bpy.data.objects['H01_head']; old_mesh = old_head.data
    bpy.data.objects.remove(old_head, do_unlink=True)
    if old_mesh.users == 0: bpy.data.meshes.remove(old_mesh)
    for mat in list(bpy.data.materials):
        if mat.name.startswith('A ') and mat.users == 0: bpy.data.materials.remove(mat)
    texture_path = args.output_dir / 'sample-face.png'
    texture_path.write_bytes(args.face_image.read_bytes())
    image = bpy.data.images.load(str(texture_path.resolve()), check_existing=False)
    image.name = 'H01 painted default face'; image.colorspace_settings.name = 'sRGB'; image.pack()

    # Same swept front waves as the reference-A study.
    original_sphere = head_builder.sphere
    def swept_sphere(name, location, scale, mat, rotation=(0, 0, 0), segments=32, rings=16):
        if name == 'H01 sculpted wave' and location[1] < 0:
            scale = (scale[0] * 1.32, scale[1] * .88, scale[2] * .85)
        return original_sphere(name, location, scale, mat, rotation, segments, rings)
    head_builder.sphere = swept_sphere
    try: parts, _ = head_objects()
    finally: head_builder.sphere = original_sphere
    kept = [o for o in parts if not o.name.startswith(PAINTED)]
    for obj in [o for o in parts if o.name.startswith(PAINTED)]:
        mesh = obj.data; bpy.data.objects.remove(obj, do_unlink=True)
        if mesh.users == 0: bpy.data.meshes.remove(mesh)
    # Primitive sphere UVs would export as an unused TEXCOORD_1 on every head primitive.
    for obj in kept:
        while obj.data.uv_layers: obj.data.uv_layers.remove(obj.data.uv_layers[0])
    parts = [textured_face(image)] + kept
    for obj in parts:
        obj.data.transform(obj.matrix_world); obj.matrix_world = Matrix.Identity(4)
        assert not obj.data.color_attributes, obj.name  # no COLOR_0 tint may multiply the texture
        for vertex in obj.data.vertices:
            point = vertex.co.copy()
            if obj.name.startswith('H01 nose'):
                point.x *= 1.08
                point.z = 1.593 + (point.z - 1.593) * 1.16
                point.y = -.113 + (point.y + .113) * .85
            if obj.name.startswith('H01 hair') and point.z > 1.685:
                point.z = 1.685 + (point.z - 1.685) * .88
                point.x *= 1.04
            elif point.z > 1.700:
                point.z = 1.700 + (point.z - 1.700) * .88
            vertex.co = lower_face(point)
        if obj.name.startswith('H01 hair'):
            select(obj); modifier = obj.modifiers.new('Softer swept silhouette study', 'SMOOTH')
            modifier.factor = .45; modifier.iterations = 5
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
    head = bpy.context.object; head.name = 'H01_head'
    group = head.vertex_groups.new(name='Head'); group.add(list(range(len(head.data.vertices))), 1, 'REPLACE')
    modifier = head.modifiers.new('Shared head bone', 'ARMATURE'); modifier.object = arm
    head.parent = arm; head.matrix_world = Matrix.Identity(4)
    assert rig_signature(arm) == rig_before
    assert all(geometry_signature(bpy.data.objects[name]) == signature for name, signature in unchanged.items())
    export_uv(args.output_dir / 'H01.glb', [arm, head])
    body = bpy.data.objects['body_underlayer_male']
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups] == [g.name for g in body.vertex_groups]
    modifier = masked.modifiers.new('Shared body skin', 'ARMATURE'); modifier.object = arm; masked.parent = arm
    garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
    assert len(garments) == 3, [o.name for o in garments]
    export_uv(args.output_dir / 'outfit.glb', [arm, masked, head, *garments])
    assert motion_signature() == motion_before
    bpy.data.objects.remove(masked, do_unlink=True)
    layout = {'schema': 'canonical-latlong-face-v1', 'uv_layer': 'canonical_face_uv', 'u': 'theta/(2*pi), seam at positive X',
              'v': '1-phi/pi, top=1', 'front_center_uv': [.75, .5], 'front_direction': '-Y', 'face_material': 'face_surface',
              'coverage': 'entire H01 head surface; ears, nose and hair are separate untextured geometry',
              'surface': 'build_catalog_head.surface_point, upper-skull compression and build_catalog_head_style_study.lower_face',
              'diagnostic_image': 'sample-face.png', 'image_sha256': digest(texture_path), 'image_size': list(image.size),
              'contract': 'Fictional painted default face; also the UV/image round-trip fixture. No selfie generation or identity proof.'}
    (args.output_dir / 'canonical-face-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    camera = setup_render(); reset(arm)
    bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir / 'H01.blend').resolve()))
    reviews = []
    for label, position in [('front', (0, -3, 1.64)), ('side', (3, 0, 1.64)), ('back', (0, 3, 1.64)), ('three-quarter', (2, -3, 1.64))]:
        camera.data.ortho_scale = .50; camera.location = position
        camera.rotation_euler = (Vector((0, 0, 1.63)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        file = args.review_dir / (label + '-review.png'); bpy.context.scene.render.filepath = str(file.resolve())
        bpy.ops.render.render(write_still=True); reviews.append(file.name)
    report = {'stage': 'isolated texture-ready face study; final style, expression and headwear compatibility pending',
              'source': str(args.source), 'source_sha256': digest(args.source), 'builder_sha256': digest(__file__),
              'face_image_source': str(args.face_image), 'face_image_sha256': digest(texture_path),
              'head_vertices': len(head.data.vertices), 'head_polygons': len(head.data.polygons),
              'materials': [m.name for m in head.data.materials], 'removed_modeled_features': list(PAINTED[1:]),
              'unchanged_geometry': unchanged, 'rig_signature': rig_before, 'motion_signature': motion_before,
              'body_rig_garments_exact': True, 'walk_run_exact': True,
              'exports': {name: digest(args.output_dir / name) for name in ('H01.glb', 'outfit.glb')}, 'reviews': reviews}
    (args.output_dir / 'texture-study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEAD_TEXTURE_STUDY', json.dumps(report))


if __name__ == '__main__': main()
