"""Verify isolated female source invariants, dense hair fit, UV/image and skin export.

Records every failure before exiting. A pass is candidate evidence only.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh, bvh
from build_catalog_head_style_study import rig_signature, motion_signature
from build_catalog_female_foundation_study import topology_signature, weights_signature


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def roundtrip_error(source, exported):
    reference, source_faces = world_mesh(source)
    points, exported_faces = world_mesh(exported)
    reference = [reference[i] for i in sorted({index for face in source_faces for index in face})]
    points = [points[i] for i in sorted({index for face in exported_faces for index in face})]
    def distance(a, b):
        tree = KDTree(len(b))
        for i, point in enumerate(b): tree.insert(point, i)
        tree.balance()
        return max(tree.find(point)[2] for point in a)
    return max(distance(points, reference), distance(reference, points))


def uv_corner_rows(obj, layer):
    """Rest-space corner tuples preserve UV seams despite GLB triangulation."""
    return [(obj.matrix_world @ obj.data.vertices[loop.vertex_index].co,
             Vector((layer.data[loop.index].uv.x, layer.data[loop.index].uv.y)))
            for loop in obj.data.loops]


def uv_corner_identity(source_rows, imported_rows, position_tolerance=.00003, uv_tolerance=1e-6):
    """Require reciprocal position+UV coverage, not an unordered UV multiset."""
    def compare(rows, reference):
        tree = KDTree(len(reference))
        for i, (position, _) in enumerate(reference): tree.insert(position, i)
        tree.balance()
        unmatched = 0; maximum = 0.0
        for position, uv in rows:
            candidates = tree.find_range(position, position_tolerance)
            error = min(((uv - reference[i][1]).length for _, i, _ in candidates), default=float('inf'))
            if error >= uv_tolerance: unmatched += 1
            if math.isfinite(error): maximum = max(maximum, error)
        return {'unmatched_corners': unmatched, 'maximum_uv_error': maximum}
    forward = compare(imported_rows, source_rows)
    reciprocal = compare(source_rows, imported_rows)
    return {'passed': forward['unmatched_corners'] == 0 and reciprocal['unmatched_corners'] == 0,
            'position_tolerance_m': position_tolerance, 'uv_tolerance': uv_tolerance,
            'imported_to_source': forward, 'source_to_imported': reciprocal,
            'comparison': 'reciprocal rest-position + face-corner UV; seam values accepted only at matching positions'}


def read_glb(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 4)[0] == 2
    assert struct.unpack_from('<I', data, 8)[0] == len(data)
    size = struct.unpack_from('<I', data, 12)[0]
    model = json.loads(data[20:20 + size])
    offset = 20 + size
    bin_size = struct.unpack_from('<I', data, offset)[0]
    return model, data[offset + 8:offset + 8 + bin_size]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--glb', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    report = {'source_blend': str(args.blend), 'source_sha256': digest(args.blend), 'glb': str(args.glb), 'glb_sha256': digest(args.glb), 'verifier_sha256': digest(__file__), 'threshold_m': .00003, 'failures': [], 'status': 'running'}
    def check(condition, label, details=None):
        if not condition: report['failures'].append({'gate': label, 'details': details})
    try:
        bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
        arm = bpy.data.objects['Armature_Catalog']; body = bpy.data.objects['body_underlayer_female']; head = bpy.data.objects['H02_head']; hair = bpy.data.objects['H02_hair']; reset(arm)
        study = json.loads((args.blend.parent / 'study-report.json').read_text())
        check(digest(study['source']) == study['source_sha256'], 'original_foundation_source_unchanged')
        check(digest(Path(__file__).with_name('build_catalog_female_foundation_study.py')) == study['builder_sha256'], 'builder_matches_saved_study')
        check(rig_signature(arm) == study['baseline']['rig'], 'shared_bind_matrices_preserved')
        check(motion_signature() == study['baseline']['motion'], 'shared_walk_run_curves_preserved')
        check(topology_signature(body) == study['baseline']['body_topology'], 'body_vertex_order_and_topology_preserved')
        check(weights_signature(body) == study['baseline']['body_weights'], 'body_weights_preserved')
        check(len(arm.data.bones) == 24 and all(abs(value - 1) < 1e-7 for value in arm.scale), 'metre_scale_24_bone_rig')
        attribute = body.data.attributes.get('female_original_vertex_index')
        check(attribute is not None and all(value.value == i for i, value in enumerate(attribute.data)), 'stable_female_original_indices')
        skin_rows = {}
        for obj in [body, head, hair]:
            max_influences = max(len(vertex.groups) for vertex in obj.data.vertices)
            weight_error = max(abs(sum(group.weight for group in vertex.groups) - 1) for vertex in obj.data.vertices)
            skin_rows[obj.name] = {'max_influences': max_influences, 'max_weight_sum_error': weight_error}
            check(max_influences <= 4 and weight_error < 1e-6, 'four_normalized_influences', skin_rows[obj.name])
        for obj in [head, hair]:
            check(len(obj.vertex_groups) == 1 and obj.vertex_groups[0].name == 'Head', 'single_head_attachment', obj.name)
        report['foundation_invariants'] = skin_rows
        hair_rows = []
        for motion in ['walk', 'run']:
            action = bpy.data.actions[motion]
            reset(arm); arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
            start, end = action.frame_range
            frames = sorted({round(start, 5), round(end, 5)} | {i / 4 for i in range(math.ceil(start * 4), math.floor(end * 4) + 1)})
            for frame in frames:
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame)); bpy.context.view_layer.update()
                overlaps = bvh(hair)[0].overlap(bvh(body)[0])
                row = {'motion': motion, 'frame': frame, 'hair_body_pairs': len(overlaps)}
                if overlaps:
                    body_points, body_faces = world_mesh(body)
                    indices = sorted({vertex for _, face in overlaps for vertex in body_faces[face]})
                    contact_points = [body_points[i] for i in indices]
                    row['body_contact_bounds_m'] = [[min(point[axis] for point in contact_points), max(point[axis] for point in contact_points)] for axis in range(3)]
                    bones = {}
                    for i in indices:
                        group = max(body.data.vertices[i].groups, key=lambda group: group.weight)
                        name = body.vertex_groups[group.group].name
                        bones[name] = bones.get(name, 0) + 1
                    row['dominant_contact_bones'] = bones
                hair_rows.append(row)
        rest_head = arm.matrix_world @ arm.data.bones['Head'].matrix_local
        inverse_head = rest_head.inverted(); reset(arm)
        reference, _ = world_mesh(hair)
        for name, axis, angle in [('rest', (0, 0, 1), 0), ('turn-left', (0, 0, 1), .6), ('turn-right', (0, 0, 1), -.6), ('nod', (1, 0, 0), .4), ('look-up', (1, 0, 0), -.3), ('tilt', (0, 1, 0), .25)]:
            reset(arm); bone = arm.pose.bones['Head']; matrix = bone.matrix.copy()
            pose = (Quaternion(axis, angle).to_matrix() @ matrix.to_3x3()).to_4x4(); pose.translation = matrix.translation; bone.matrix = pose
            bpy.context.view_layer.update()
            transform = arm.matrix_world @ bone.matrix @ inverse_head
            points, _ = world_mesh(hair)
            error = max((point - transform @ original).length for point, original in zip(points, reference))
            pairs = len(bvh(hair)[0].overlap(bvh(body)[0]))
            hair_rows.append({'pose': name, 'hair_body_pairs': pairs, 'attachment_error_m': error})
            check(error < .00002, 'rigid_hair_attachment', hair_rows[-1])
        report['hair_clearance'] = {'sample_count': len(hair_rows), 'motion_samples': len([row for row in hair_rows if 'motion' in row]), 'gesture_samples': 6, 'maximum_pairs': max(row['hair_body_pairs'] for row in hair_rows), 'checks': hair_rows}
        check(not any(row['hair_body_pairs'] for row in hair_rows), 'complete_hair_neck_shoulder_clearance', [row for row in hair_rows if row['hair_body_pairs']][:12])
        reset(arm)
        model, binary = read_glb(args.glb)
        material_index = next(i for i, mat in enumerate(model['materials']) if mat['name'] == 'face_surface')
        face_material = model['materials'][material_index]
        texture_index = face_material['pbrMetallicRoughness']['baseColorTexture']['index']
        image_index = model['textures'][texture_index]['source']; image = model['images'][image_index]
        view = model['bufferViews'][image['bufferView']]; offset = view.get('byteOffset', 0)
        image_bytes = binary[offset:offset + view['byteLength']]
        image_hash = hashlib.sha256(image_bytes).hexdigest()
        image_matches = image_hash == digest(args.blend.parent / 'sample-face.png')
        face_primitives = [primitive for mesh in model['meshes'] for primitive in mesh['primitives'] if primitive.get('material') == material_index]
        check(bool(face_primitives) and all('TEXCOORD_0' in primitive['attributes'] for primitive in face_primitives), 'face_TEXCOORD_0_preserved')
        check(image_matches, 'embedded_diagnostic_image_preserved', {'mime': image['mimeType'], 'embedded_sha256': image_hash})
        source_corners = uv_corner_rows(head, head.data.uv_layers['canonical_face_uv'])
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
        imported = [obj for obj in bpy.data.objects if obj not in before]
        exported_rig = next(obj for obj in imported if obj.type == 'ARMATURE'); exported_rig.animation_data_create()
        mapping = {source: next(obj for obj in imported if obj.type == 'MESH' and obj.name.startswith(source.name)) for source in [body, head, hair]}
        exported_head = mapping[head]
        reset(exported_rig); bpy.context.view_layer.update()
        reimport_uv = exported_head.data.uv_layers.active
        imported_corners = uv_corner_rows(exported_head, reimport_uv)
        corner_identity = uv_corner_identity(source_corners, imported_corners)
        check(corner_identity['passed'], 'canonical_uv_corner_identity_preserved', corner_identity)
        # A UV permutation keeps the old verifier's multiset unchanged while
        # assigning valid values to incorrect geometry. The new gate must reject it.
        first = 0
        second = next(i for i, (position, uv) in enumerate(imported_corners)
                      if (position - imported_corners[first][0]).length > .05
                      and (uv - imported_corners[first][1]).length > .1)
        first_uv = reimport_uv.data[first].uv.copy(); second_uv = reimport_uv.data[second].uv.copy()
        try:
            reimport_uv.data[first].uv = second_uv; reimport_uv.data[second].uv = first_uv
            permuted = uv_corner_rows(exported_head, reimport_uv)
            negative = uv_corner_identity(source_corners, permuted)
            multiset_unchanged = sorted(tuple(uv) for _, uv in permuted) == sorted(tuple(uv) for _, uv in imported_corners)
            check(multiset_unchanged and not negative['passed'], 'negative_uv_permutation_rejected', negative)
        finally:
            reimport_uv.data[first].uv = first_uv; reimport_uv.data[second].uv = second_uv
        restored = uv_corner_identity(source_corners, uv_corner_rows(exported_head, reimport_uv))
        check(restored['passed'], 'negative_uv_probe_restored', restored)
        report['face_transport'] = {'canonical_layout_sha256': digest(args.blend.parent / 'canonical-face-layout.json'), 'material': 'face_surface', 'uv_layer': 'canonical_face_uv', 'face_primitive_count': len(face_primitives), 'embedded_image_matches_source_png': image_matches, 'embedded_sha256': image_hash, 'image_mime_type': image['mimeType'], 'reimport_uv_corner_identity': corner_identity, 'negative_uv_permutation_probe': {'uv_multiset_unchanged': multiset_unchanged, 'rejected': not negative['passed'], 'result': negative, 'restored_passed': restored['passed']}, 'contract_limit': 'Diagnostic fictional local texture only; no real selfie or identity proof.'}
        export_rows = []
        for motion, frames in [(None, [0]), ('walk', [.8, 1, 6.25, 13, 19.5, 25.6]), ('run', [.8, 1, 5, 7.25, 8, 9.5, 12.75, 15.25, 16])]:
            reset(arm); reset(exported_rig)
            if motion:
                action = bpy.data.actions[motion]
                for target in [arm, exported_rig]: target.animation_data.action = action; target.animation_data.action_slot = action.slots[0]
            for frame in frames:
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame)); bpy.context.view_layer.update()
                errors = {source.name: roundtrip_error(source, exported) for source, exported in mapping.items()}
                export_rows.append({'motion': motion or 'rest', 'frame': frame, 'max_error_m': errors})
        maximum = max(error for row in export_rows for error in row['max_error_m'].values())
        report['export_deformation'] = {'pose_count': len(export_rows), 'maximum_error_m': maximum, 'threshold_m': .00003, 'comparison': 'bidirectional rendered vertices', 'checks': export_rows}
        check(maximum < .00003 and len(export_rows) == 16, 'sixteen_pose_export_fidelity', maximum)
        report['status'] = 'passed' if not report['failures'] else 'failed'
    except Exception as error:
        report['status'] = 'failed'; report['failures'].append({'gate': 'verifier_exception', 'details': repr(error)})
    (args.output_dir / 'foundation-verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('FEMALE_FOUNDATION_VERIFICATION', json.dumps({key: value for key, value in report.items() if key not in ['hair_clearance', 'export_deformation']}))
    if report['status'] != 'passed': raise RuntimeError('Female study gates failed; see source-bound report')


if __name__ == '__main__': main()
