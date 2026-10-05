"""Build an isolated female scaffold, UV-ready neutral head and H02 hair envelope.

This is a candidate study, not a fitted wardrobe or an accepted character.
The diagnostic texture is a fictional local transport fixture, not a selfie.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import struct
import sys
import zlib
from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_head import material
from build_catalog_t01 import reset, setup_render
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature

SKIN = (.72, .385, .215)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def topology_signature(obj):
    data = {'vertices': len(obj.data.vertices), 'faces': [list(p.vertices) for p in obj.data.polygons]}
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def weights_signature(obj):
    data = {'groups': [g.name for g in obj.vertex_groups],
            'weights': [[(g.group, g.weight) for g in v.groups] for v in obj.data.vertices]}
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def linear_byte(value):
    return round(255 * (12.92 * value if value <= .0031308 else 1.055 * value ** (1 / 2.4) - .055))


def write_face_fixture(path, size=512):
    """PNG fixture with a quiet calibration grid and clearly fictional features."""
    skin = tuple(linear_byte(value) for value in SKIN)
    rows = []
    for y in range(size):
        row = bytearray([0])
        v = 1 - (y + .5) / size
        for x in range(size):
            u = (x + .5) / size
            color = skin
            # The patch boundary stays exactly neutral to prove seam blending.
            if .61 < u < .89 and .27 < v < .77:
                if x % 32 == 0 or y % 32 == 0:
                    color = tuple(min(255, value + 5) for value in skin)
                for center in (.684, .816):
                    eye = ((u - center) / .021) ** 2 + ((v - .548) / .037) ** 2
                    if eye < 1: color = (244, 239, 222)
                    if ((u - center) / .009) ** 2 + ((v - .548) / .020) ** 2 < 1: color = (76, 43, 25)
                    if ((u - center) / .004) ** 2 + ((v - .548) / .015) ** 2 < 1: color = (23, 16, 13)
                    if ((u - center + .004) / .0028) ** 2 + ((v - .558) / .005) ** 2 < 1: color = (255, 255, 255)
                    if abs(v - (.607 + .015 * (1 - min(1, abs(u - center) / .027)))) < .003 and abs(u - center) < .027: color = (104, 65, 40)
                if abs(u - .75) < .043:
                    smile_v = .416 + .025 * ((u - .75) / .043) ** 2
                    if abs(v - smile_v) < .0035: color = (133, 62, 43)
            row.extend((*color, 255))
        rows.append(row)
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    payload = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    payload += chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
    path.write_bytes(payload)


def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for face in mesh.polygons: face.use_smooth = True
    return obj


def bind_head(obj, arm):
    group = obj.vertex_groups.new(name='Head')
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Shared head attachment', 'ARMATURE')
    modifier.object = arm
    obj.parent = arm
    obj.matrix_world = Matrix.Identity(4)


def head_point(phi, theta):
    cosine = math.cos(phi)
    jaw = 1 - .06 * max(0, -cosine)
    return (.139 * math.sin(phi) * math.cos(theta) * jaw,
            .012 + .131 * math.sin(phi) * math.sin(theta),
            1.608 + .172 * cosine)


def build_head(arm, skin, image):
    segments, rings = 64, 32
    vertices = [head_point(0, 0)]
    for row in range(1, rings):
        vertices.extend(head_point(math.pi * row / rings, 2 * math.pi * i / segments) for i in range(segments))
    bottom = len(vertices); vertices.append(head_point(math.pi, 0))
    def index(row, col): return 1 + (row - 1) * segments + col % segments
    faces, uv_faces = [], []
    for i in range(segments):
        u, next_u = i / segments, (i + 1) / segments
        faces.append((0, index(1, i), index(1, i + 1)))
        uv_faces.append(((u + next_u) / 2, 1, u, 1 - 1 / rings, next_u, 1 - 1 / rings))
        for row in range(1, rings - 1):
            faces.append((index(row, i), index(row + 1, i), index(row + 1, i + 1), index(row, i + 1)))
            uv_faces.append((u, 1 - row / rings, u, 1 - (row + 1) / rings, next_u, 1 - (row + 1) / rings, next_u, 1 - row / rings))
        faces.append((index(rings - 1, i), bottom, index(rings - 1, i + 1)))
        uv_faces.append((u, 1 / rings, (u + next_u) / 2, 0, next_u, 1 / rings))
    head = mesh_object('H02_head', vertices, faces, skin)
    uv = head.data.uv_layers.new(name='canonical_face_uv')
    face_material = material('face_surface', SKIN, .82)
    node = face_material.node_tree.nodes.new('ShaderNodeTexImage')
    node.name = 'Local diagnostic face fixture'
    node.image = image
    node.interpolation = 'Linear'
    face_material.node_tree.links.new(node.outputs['Color'], face_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    head.data.materials.append(face_material)
    for polygon, values in zip(head.data.polygons, uv_faces):
        for loop, offset in zip(polygon.loop_indices, range(0, len(values), 2)):
            uv.data[loop].uv = values[offset:offset + 2]
        center = sum((head.data.vertices[i].co for i in polygon.vertices), Vector()) / len(polygon.vertices)
        theta = math.atan2(center.y - .012, center.x) % (2 * math.pi)
        if 1.20 * math.pi <= theta <= 1.80 * math.pi and 1.47 <= center.z <= 1.755:
            polygon.material_index = 1
    # Recalculate outward normals while retaining authored UV loops and ordering.
    bm = bmesh.new(); bm.from_mesh(head.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(head.data); bm.free()
    bind_head(head, arm)
    return head


def build_hair(arm, bottom, radius):
    hair_mat = material('A H02 matte chestnut hair', (.082, .030, .015), .88)
    vertices, faces = [], []
    segments, rows = 64, 18
    # Closed scalp cap; the forehead stays visible and the back flows into broad locks.
    for row in range(rows):
        for i in range(segments):
            theta = 2 * math.pi * i / segments
            front = max(0, -math.sin(theta)); back = max(0, math.sin(theta))
            phi = (.98 * front + 1.88 * (1 - front) + .35 * back) * row / (rows - 1)
            vertices.append((.151 * math.sin(phi) * math.cos(theta), .012 + .148 * math.sin(phi) * math.sin(theta), 1.608 + .184 * math.cos(phi)))
    for row in range(rows - 1):
        for i in range(segments):
            j = (i + 1) % segments
            faces.append((row * segments + i, row * segments + j, (row + 1) * segments + j, (row + 1) * segments + i))
    cap = mesh_object('H02_hair', vertices, faces, hair_mat)
    bpy.context.view_layer.objects.active = cap; cap.select_set(True)
    solid = cap.modifiers.new('Closed matte scalp shell', 'SOLIDIFY'); solid.thickness = .009; solid.offset = 0
    bpy.ops.object.modifier_apply(modifier=solid.name)
    # Broad swept volumes, rather than many separate bead-shaped curls.
    parts = [cap]
    for i in range(7):
        angle = -.03 + (math.pi + .06) * i / 6
        vertices, faces = [], []
        steps, around = 12, 12
        for row in range(steps):
            t = row / (steps - 1)
            z = 1.73 * (1 - t) + (bottom + .022 * math.cos(angle) ** 2) * t
            x = ((.115 * (1 - t) + radius * t) * math.cos(angle))
            y = .032 + (.070 * (1 - t) + .165 * t) * math.sin(angle) + .018 * math.sin(math.pi * t)
            width = .039 * math.sin(math.pi * (.12 + .76 * t))
            depth = .028 * math.sin(math.pi * (.12 + .76 * t))
            for j in range(around):
                a = 2 * math.pi * j / around
                vertices.append((x + width * math.cos(a), y + depth * math.sin(a), z))
        for row in range(steps - 1):
            for j in range(around):
                k = (j + 1) % around
                faces.append((row * around + j, row * around + k, (row + 1) * around + k, (row + 1) * around + j))
        faces.append(tuple(reversed(range(around)))); faces.append(tuple((steps - 1) * around + j for j in range(around)))
        parts.append(mesh_object(f'H02 broad swept lock {i}', vertices, faces, hair_mat))
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts: part.select_set(True)
    bpy.context.view_layer.objects.active = cap
    bpy.ops.object.join()
    remesh = cap.modifiers.new('Continuous broad H02 silhouette', 'REMESH'); remesh.mode = 'VOXEL'; remesh.voxel_size = .006; remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smoothing = cap.modifiers.new('Matte rounded hair transitions', 'SMOOTH'); smoothing.factor = .45; smoothing.iterations = 3
    bpy.ops.object.modifier_apply(modifier=smoothing.name)
    bind_head(cap, arm)
    return cap


def export_uv(path, objects):
    bpy.ops.object.select_all(action='DESELECT')
    records = []
    for obj in objects:
        obj.select_set(True)
        if obj.type == 'MESH':
            records.append((obj, obj.parent, obj.matrix_world.copy()))
            obj.parent = None; obj.matrix_world = records[-1][2]
    bpy.context.view_layer.objects.active = objects[0]
    try:
        bpy.ops.outliner.orphans_purge(do_recursive=True)
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
            export_animations=False, export_apply=False, export_texcoords=True, export_image_format='AUTO')
    finally:
        for obj, parent, matrix in records: obj.parent = parent; obj.matrix_world = matrix


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--review-dir', type=Path, required=True)
    parser.add_argument('--hair-bottom', type=float, default=1.385)
    parser.add_argument('--hair-radius', type=float, default=.190)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True); args.review_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']; body = bpy.data.objects['body_underlayer_male']; reset(arm)
    baseline = {'body_geometry': geometry_signature(body), 'body_topology': topology_signature(body), 'body_weights': weights_signature(body), 'rig': rig_signature(arm), 'motion': motion_signature()}
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and obj != body: bpy.data.objects.remove(obj, do_unlink=True)
    body.name = 'body_underlayer_female'
    # Small, local average-build contour study. Rig joints, hands, feet and neck remain fixed.
    for vertex in body.data.vertices:
        p = vertex.co
        arm_amount = sum(group.weight for group in vertex.groups if any(body.vertex_groups[group.group].name.startswith(side + name) for side in ('Left', 'Right') for name in ('Arm', 'ForeArm', 'Hand', 'Shoulder')))
        if arm_amount > .05 or not .82 < p.z < 1.34: continue
        hip = math.exp(-((p.z - .99) / .09) ** 2)
        waist = math.exp(-((p.z - 1.15) / .065) ** 2)
        p.x *= 1 + .035 * hip - .025 * waist
        p.y *= 1 + .015 * hip - .020 * waist
    indices = body.data.attributes.new(name='female_original_vertex_index', type='INT', domain='POINT')
    for vertex in body.data.vertices: indices.data[vertex.index].value = vertex.index
    skin = material('A female neutral warm skin', SKIN, .82)
    body.data.materials.clear(); body.data.materials.append(skin)
    texture_path = args.output_dir / 'sample-face.png'; write_face_fixture(texture_path)
    image = bpy.data.images.load(str(texture_path.resolve()), check_existing=False)
    image.name = 'H02 canonical diagnostic face'; image.colorspace_settings.name = 'sRGB'; image.pack()
    head = build_head(arm, skin, image)
    hair = build_hair(arm, args.hair_bottom, args.hair_radius)
    layout = {'schema': 'canonical-latlong-face-v1', 'uv_layer': 'canonical_face_uv', 'u': 'theta/(2*pi), seam at positive X', 'v': '1-phi/pi, top=1', 'front_center_uv': [.75, .5], 'front_direction': '-Y', 'face_material': 'face_surface', 'face_material_slot': 1, 'diagnostic_image': 'sample-face.png', 'image_sha256': digest(texture_path), 'image_size': [512, 512], 'face_patch_angular_range_radians': [1.20 * math.pi, 1.80 * math.pi], 'contract': 'Local fictional UV/image round-trip fixture only; no selfie generation or identity proof.'}
    (args.output_dir / 'canonical-face-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    camera = setup_render(); reset(arm)
    bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir / 'female-foundation.blend').resolve()))
    for filename, objects in [('female-foundation.glb', [arm, body, head, hair]), ('H02.glb', [arm, head, hair]), ('hair-H02.glb', [arm, hair])]: export_uv(args.output_dir / filename, objects)
    current = {'body_geometry': geometry_signature(body), 'body_topology': topology_signature(body), 'body_weights': weights_signature(body), 'rig': rig_signature(arm), 'motion': motion_signature()}
    assert baseline['body_topology'] == current['body_topology']
    assert baseline['body_weights'] == current['body_weights']
    assert baseline['rig'] == current['rig'] and baseline['motion'] == current['motion']
    report = {'stage': 'isolated female foundation and H02 hair candidate; no wardrobe fit or acceptance', 'source': str(args.source), 'source_sha256': digest(args.source), 'builder_sha256': digest(__file__), 'baseline': baseline, 'current': current, 'unchanged_rig_and_actions': True, 'body_vertices': len(body.data.vertices), 'head_vertices': len(head.data.vertices), 'hair_vertices': len(hair.data.vertices), 'bones': len(arm.data.bones), 'hair_bottom_m': args.hair_bottom, 'hair_radius_m': args.hair_radius, 'exports': {name: digest(args.output_dir / name) for name in ('female-foundation.glb', 'H02.glb', 'hair-H02.glb')}, 'limitations': ['Average-build contour study; final female silhouette review pending.', 'Diagnostic face texture proves transport only after verification; no personalization endpoint.', 'No female wardrobe, headwear fit, expressions, runtime registration or acceptance.']}
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    for label, position in [('front', (0, -3, 1.12)), ('side', (3, 0, 1.12)), ('three-quarter', (2, -3, 1.12)), ('back', (0, 3, 1.12))]:
        camera.data.ortho_scale = 2.03; camera.location = position
        camera.rotation_euler = (Vector((0, 0, .92)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.scene.render.filepath = str((args.review_dir / (label + '-review.png')).resolve())
        bpy.ops.render.render(write_still=True)
    print('FEMALE_FOUNDATION_STUDY', json.dumps(report))


if __name__ == '__main__': main()
