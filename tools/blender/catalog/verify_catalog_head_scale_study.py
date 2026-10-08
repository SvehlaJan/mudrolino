"""Verify an isolated head-scale revision against its source-bound study report.

Gates: unchanged sources/rig/gaits/body; head equals the uniformly scaled source;
rigid single-Head binding; hair clear of the body and outfit over quarter-frame
walk/run plus six gestures; face TEXCOORD_0/image and UV corner identity through
GLB reimport; 16-pose export fidelity. Records every failure before exiting.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh, bvh
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from verify_catalog_female_foundation_study import uv_corner_rows, uv_corner_identity, read_glb, roundtrip_error
from catalog_headwear_plan import scaled_point, hair_hang_scale, shorten_rear_hair

GESTURES = [('turn-left', (0, 0, 1), .6), ('turn-right', (0, 0, 1), -.6), ('nod', (1, 0, 0), .4),
            ('look-up', (1, 0, 0), -.3), ('tilt', (0, 1, 0), .25)]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def material_tree(obj, keyword):
    """BVH of the polygons whose material name contains keyword."""
    points, faces = world_mesh(obj)
    slots = {i for i, m in enumerate(obj.data.materials) if m and keyword in m.name.lower()}
    chosen = [face for face, poly in zip(faces, obj.data.polygons) if poly.material_index in slots]
    return BVHTree.FromPolygons(points, chosen) if chosen else None


def skin_in_front_of_hair(head, hair, centre):
    """Rays from outside (face excluded) whose first skin hit lies in front of a hair hit."""
    centre = Vector(centre)
    hair_tree, head_tree = bvh(hair)[0], bvh(head)[0]
    count = 0
    for i in range(180):
        theta = 2 * math.pi * i / 180
        for j in range(60):
            elevation = math.radians(-55 + 115 * j / 59)
            d = Vector((math.cos(elevation) * math.cos(theta), math.cos(elevation) * math.sin(theta), math.sin(elevation)))
            if d.y < -.2:
                continue
            hair_hit = hair_tree.ray_cast(centre + d, -d, 1.0)
            skin_hit = head_tree.ray_cast(centre + d, -d, 1.0)
            if skin_hit[0] is not None and hair_hit[0] is not None and skin_hit[3] < hair_hit[3] - 1e-5:
                count += 1
    return count


def gait_frames(action):
    start, end = action.frame_range
    return sorted({round(start, 5), round(end, 5)} | {i / 4 for i in range(math.ceil(start * 4), math.floor(end * 4) + 1)})


def pose_gesture(arm, axis, angle):
    reset(arm)
    bone = arm.pose.bones['Head']
    matrix = bone.matrix.copy()
    pose = (Quaternion(axis, angle).to_matrix() @ matrix.to_3x3()).to_4x4()
    pose.translation = matrix.translation
    bone.matrix = pose
    bpy.context.view_layer.update()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    study = json.loads((args.study_dir / 'study-report.json').read_text())
    blend = Path(next(iter(study['blend'])))
    report = {'study_dir': str(args.study_dir), 'study_report_sha256': digest(args.study_dir / 'study-report.json'),
              'verifier_sha256': digest(__file__), 'failures': [], 'status': 'running'}

    def check(condition, gate, details=None):
        if not condition:
            report['failures'].append({'gate': gate, 'details': details})

    try:
        check(all(digest(p) == h for p, h in study['source_hashes'].items()), 'sources_unchanged')
        check(digest(Path(__file__).with_name('build_catalog_head_scale_study.py')) == study['builder_sha256'], 'builder_matches_study')
        check(digest(blend) == study['blend'][str(blend)], 'saved_blend_matches_study')
        check(all(digest(args.study_dir / n) == h for n, h in study['exports'].items()), 'exports_match_study')

        # Head equals the uniformly scaled source head, vertex for vertex.
        bpy.ops.wm.open_mainfile(filepath=str(Path(study['source']).resolve()))
        source_points = {}
        taper = study.get('hair_taper')
        for name in study['scaled_head_geometry']:
            obj = bpy.data.objects[name]
            hanging = taper is not None and 'hair' in name.lower()
            source_points[name] = []
            for v in obj.data.vertices:
                world = obj.matrix_world @ v.co
                scale = hair_hang_scale(world.z, study['scale'], **taper) if hanging else study['scale']
                point = scaled_point(world, study['pivot_world_m'], scale)
                shorten = study.get('rear_shorten')
                if hanging and shorten:
                    z_from = scaled_point((0, 0, shorten['z_from']), study['pivot_world_m'], hair_hang_scale(shorten['z_from'], study['scale'], **taper))[2]
                    point[2] = shorten_rear_hair(point[2], point[1], z_from, shorten['fraction'], shorten['y_start'], shorten['y_full'])
                source_points[name].append(point)
        # Hair roots are embedded in the scalp. Visible skin through hair is measured by
        # rays from outside that hit skin in front of hair (the face is excluded).
        source_skin_in_front = None
        if 'H02_hair' in study['scaled_head_geometry']:
            reset(bpy.data.objects['Armature_Catalog'])
            source_skin_in_front = skin_in_front_of_hair(bpy.data.objects['H02_head'], bpy.data.objects['H02_hair'], study['landmarks']['skull_centre'])

        bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
        arm = bpy.data.objects['Armature_Catalog']
        reset(arm)
        heads = [bpy.data.objects[name] for name in study['scaled_head_geometry']]
        check(rig_signature(arm) == study['baseline']['rig'], 'rig_unchanged')
        check(motion_signature() == study['baseline']['motion'], 'gaits_unchanged')
        check(all(geometry_signature(bpy.data.objects[n]) == s for n, s in study['baseline']['unchanged_geometry'].items()),
              'non_head_geometry_unchanged')
        scale_error = max((h.matrix_world @ v.co - Vector(p)).length
                          for h in heads for v, p in zip(h.data.vertices, source_points[h.name]))
        check(scale_error < 1e-6, 'head_is_scaled_source', scale_error)
        if source_skin_in_front is not None:
            hair_obj, head_obj = bpy.data.objects['H02_hair'], bpy.data.objects['H02_head']
            report['skin_in_front_of_hair_rays'] = {
                'source': source_skin_in_front, 'scaled': skin_in_front_of_hair(head_obj, hair_obj, study['landmarks']['skull_centre']),
                'rest_head_hair_pairs_info': len(bvh(hair_obj)[0].overlap(bvh(head_obj)[0]))}
            check(report['skin_in_front_of_hair_rays']['scaled'] <= source_skin_in_front, 'no_skin_through_hair',
                  report['skin_in_front_of_hair_rays'])
        for head in heads:
            check(len(head.vertex_groups) == 1 and head.vertex_groups[0].name == 'Head', 'single_head_group', head.name)
            check(all(len(v.groups) == 1 and abs(v.groups[0].weight - 1) < 1e-7 for v in head.data.vertices),
                  'rigid_head_weight', head.name)

        body = next(o for o in bpy.data.objects if o.name.startswith('body_underlayer_'))
        garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
        hair_obj = bpy.data.objects.get('H02_hair')
        rows = []

        def sample(label):
            bpy.context.view_layer.update()
            hair = bvh(hair_obj)[0] if hair_obj else material_tree(heads[0], 'hair')
            row = {'pose': label, 'hair_body_pairs': len(hair.overlap(bvh(body)[0]))}
            for garment in garments:
                garment_tree = bvh(garment)[0]
                row[garment.name] = sum(len(bvh(h)[0].overlap(garment_tree)) for h in heads)
            rows.append(row)

        for motion in ('walk', 'run'):
            action = bpy.data.actions[motion]
            reset(arm)
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            for frame in gait_frames(action):
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                sample(f'{motion}:{frame}')
        for name, axis, angle in [('rest', (0, 0, 1), 0), *GESTURES]:
            pose_gesture(arm, axis, angle)
            sample(name)
        reset(arm)
        worst = {key: max(row[key] for row in rows) for key in rows[0] if key != 'pose'}
        report['clearance'] = {'samples': len(rows), 'gesture_samples': 6, 'maximum_pairs': worst,
                               'contacts': [row for row in rows if any(row[k] for k in worst)][:20]}
        check(not any(worst.values()), 'hair_and_outfit_clearance', worst)

        # Face texture and UV corners survive the head GLB.
        head_glb = args.study_dir / ('H01.glb' if 'H01_head' in study['scaled_head_geometry'] else 'H02.glb')
        model, binary = read_glb(head_glb)
        material_index = next(i for i, m in enumerate(model['materials']) if m['name'] == 'face_surface')
        texture = model['textures'][model['materials'][material_index]['pbrMetallicRoughness']['baseColorTexture']['index']]
        view = model['bufferViews'][model['images'][texture['source']]['bufferView']]
        image = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        check(hashlib.sha256(image).hexdigest() == digest(args.study_dir / 'sample-face.png'), 'embedded_face_image_preserved')
        primitives = [p for mesh in model['meshes'] for p in mesh['primitives'] if p.get('material') == material_index]
        check(bool(primitives) and all('TEXCOORD_0' in p['attributes'] for p in primitives), 'face_TEXCOORD_0_preserved')
        face_head = heads[0]
        source_corners = uv_corner_rows(face_head, face_head.data.uv_layers['canonical_face_uv'])
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(head_glb.resolve()))
        imported = [o for o in bpy.data.objects if o not in before]
        rig = next(o for o in imported if o.type == 'ARMATURE')
        rig.animation_data_create()
        mapping = {h: next(o for o in imported if o.type == 'MESH' and o.name.startswith(h.name)) for h in heads}
        reset(rig)
        identity = uv_corner_identity(source_corners, uv_corner_rows(mapping[face_head], mapping[face_head].data.uv_layers.active))
        report['uv_corner_identity'] = identity
        check(identity['passed'], 'canonical_uv_corner_identity')

        export_rows = []
        for motion, frames in [(None, [0]), ('walk', [.8, 1, 6.25, 13, 19.5, 25.6]), ('run', [.8, 1, 5, 7.25, 8, 9.5, 12.75, 15.25, 16])]:
            reset(arm)
            reset(rig)
            if motion:
                action = bpy.data.actions[motion]
                for target in (arm, rig):
                    target.animation_data.action = action
                    target.animation_data.action_slot = action.slots[0]
            for frame in frames:
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                bpy.context.view_layer.update()
                export_rows.append({'motion': motion or 'rest', 'frame': frame,
                                    'max_error_m': {s.name: roundtrip_error(s, e) for s, e in mapping.items()}})
        maximum = max(v for row in export_rows for v in row['max_error_m'].values())
        report['export_fidelity'] = {'poses': len(export_rows), 'maximum_error_m': maximum, 'threshold_m': .00003}
        check(len(export_rows) == 16 and maximum < .00003, 'sixteen_pose_export_fidelity', maximum)
        report['status'] = 'passed' if not report['failures'] else 'failed'
    except Exception as error:  # Record the failure in the source-bound report.
        report['status'] = 'failed'
        report['failures'].append({'gate': 'verifier_exception', 'details': repr(error)})
    (args.study_dir / 'verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEAD_SCALE_VERIFICATION', json.dumps({k: v for k, v in report.items() if k != 'clearance'}))
    if report['status'] != 'passed':
        raise RuntimeError('Head-scale study gates failed; see verification-report.json')


if __name__ == '__main__':
    main()
