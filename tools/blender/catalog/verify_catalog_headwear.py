"""Verify an envelope-fitted headwear revision: fit gate, motion clearance and exports.

Fit gate (catalog_headwear_plan.fit_gate): radial gaps from the inner crown to
the head/under-hat hair must stay small (no floating) and never negative, and
the cap must not intersect head, hair, body or garments. Clearance is swept over
quarter-frame walk/run and six head gestures. Also checks rigid Head binding,
the exported under_hat morph target and 16-pose cap export fidelity.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, bvh
from build_catalog_head_style_study import rig_signature, motion_signature
from verify_catalog_female_foundation_study import read_glb, roundtrip_error
from verify_catalog_head_scale_study import GESTURES, gait_frames, pose_gesture
from catalog_headwear_plan import band_height, fit_gate


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def radial_gaps(cap_tree, head_tree, centre, band, crown_faces):
    """Gaps along rays from the skull centre: inner crown radius minus outer head/hair radius."""
    crown, ring = [], []
    for k in range(144):
        theta = 2 * math.pi * k / 144 - math.pi
        for step in range(36):
            elevation = math.radians(-20 + 108 * step / 35)
            d = Vector((math.cos(elevation) * math.cos(theta), math.cos(elevation) * math.sin(theta), math.sin(elevation)))
            cap_hit, _, cap_face, _ = cap_tree.ray_cast(centre, d, 1.0)
            head_hit = head_tree.ray_cast(centre + d, -d, 1.0)[0]
            if cap_hit is None or head_hit is None or cap_face not in crown_faces:
                continue  # The strap over the rear opening stands proud by design.
            above_band = cap_hit.z - band_height(theta, band['front'], band['side'], band['back'])
            if above_band < 0:
                continue  # Brim and anything below the band are not crown.
            gap = ((cap_hit - centre).length - (head_hit - centre).length) * 1000
            (ring if above_band < .010 else crown).append(gap)
    return crown, ring


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
        check(all(digest(p) == h for p, h in study['source_hashes'].items()), 'head_study_unchanged')
        check(digest(study['builder']) == study['builder_sha256'], 'builder_matches_study')
        check(digest(Path(__file__).with_name('catalog_headwear_geometry.py')) == study['geometry_sha256'], 'geometry_matches_study')
        check(digest(Path(__file__).with_name('catalog_headwear_plan.py')) == study['plan_sha256'], 'plan_matches_study')
        check(digest(blend) == study['blend'][str(blend)], 'saved_blend_matches_study')
        check(all(digest(args.study_dir / n) == h for n, h in study['exports'].items()), 'exports_match_study')

        bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
        arm = bpy.data.objects['Armature_Catalog']
        reset(arm)
        check(rig_signature(arm) == study['baseline']['rig'] and motion_signature() == study['baseline']['motion'], 'rig_and_gaits_unchanged')
        cap = bpy.data.objects[study['object']]
        check([g.name for g in cap.vertex_groups] == ['Head'] and all(
            len(v.groups) == 1 and abs(v.groups[0].weight - 1) < 1e-7 for v in cap.data.vertices), 'rigid_head_binding')
        hair = bpy.data.objects[study['under_hat']['object']]
        key_name = study['under_hat']['key']
        check(hair.data.shape_keys is not None and hair.data.shape_keys.key_blocks.get(key_name) is not None
              and abs(hair.data.shape_keys.key_blocks[key_name].value - 1) < 1e-9, 'under_key_active')
        heads = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('H01_head') or o.name.startswith('H02_'))]
        body = next(o for o in bpy.data.objects if o.name.startswith('body_underlayer_'))
        garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]

        # Fit gate at rest against the actual head/hair with the under-hat key applied.
        from mathutils.bvhtree import BVHTree
        points, faces = [], []
        for head in heads:
            p, f = bvh(head)[1], [tuple(poly.vertices) for poly in head.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons]
            faces += [tuple(len(points) + i for i in face) for face in f]
            points += p
        head_tree = BVHTree.FromPolygons(points, faces)
        cap_tree = bvh(cap)[0]
        crown_slots = {i for i, m in enumerate(cap.data.materials) if m and any(m.name.startswith(c) for c in study['crown_materials'])}
        crown_faces = {p.index for p in cap.data.polygons if p.material_index in crown_slots}
        crown, ring = radial_gaps(cap_tree, head_tree, Vector(study['landmarks']['skull_centre']), study['band_heights_m'], crown_faces)
        intersections = {o.name: len(cap_tree.overlap(bvh(o)[0])) for o in [*heads, body, *garments]}
        gate = fit_gate(crown, ring, intersections)
        report['fit_gate'] = gate
        check(gate['passed'], 'headwear_fit_gate', gate['failures'])

        rows = []
        def sample(label):
            bpy.context.view_layer.update()
            tree = bvh(cap)[0]
            rows.append({'pose': label, **{o.name: len(tree.overlap(bvh(o)[0])) for o in [*heads, body, *garments]}})
        for motion in ('walk', 'run'):
            action = bpy.data.actions[motion]
            reset(arm)
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            for frame in gait_frames(action):
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                sample(f'{motion}:{frame}')
        for name, axis, angle in GESTURES:
            pose_gesture(arm, axis, angle)
            sample(name)
        reset(arm)
        worst = {k: max(r[k] for r in rows) for k in rows[0] if k != 'pose'}
        report['motion_clearance'] = {'samples': len(rows), 'gesture_samples': len(GESTURES), 'maximum_pairs': worst,
                                      'contacts': [r for r in rows if any(r[k] for k in worst)][:20]}
        check(not any(worst.values()), 'cap_motion_clearance', worst)

        model, _ = read_glb(args.study_dir / 'head-under-hat.glb')
        morphs = [(m.get('extras', {}).get('targetNames', []), m.get('weights', [])) for m in model['meshes']]
        has_key = any(key_name in names and weights[names.index(key_name)] == 1 for names, weights in morphs if weights)
        report['under_key_export'] = {'key': key_name, 'meshes': morphs}
        check(has_key, 'under_key_morph_exported_at_weight_1')

        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str((args.study_dir / f"{study['item']}.glb").resolve()))
        imported = [o for o in bpy.data.objects if o not in before]
        rig = next(o for o in imported if o.type == 'ARMATURE')
        rig.animation_data_create()
        copy = next(o for o in imported if o.type == 'MESH' and o.name.startswith(study['object']))
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
                export_rows.append({'motion': motion or 'rest', 'frame': frame, 'max_error_m': roundtrip_error(cap, copy)})
        maximum = max(r['max_error_m'] for r in export_rows)
        report['export_fidelity'] = {'poses': len(export_rows), 'maximum_error_m': maximum, 'threshold_m': .00003}
        check(len(export_rows) == 16 and maximum < .00003, 'sixteen_pose_export_fidelity', maximum)
        report['status'] = 'passed' if not report['failures'] else 'failed'
    except Exception as error:  # Record the failure in the source-bound report.
        report['status'] = 'failed'
        report['failures'].append({'gate': 'verifier_exception', 'details': repr(error)})
    (args.study_dir / 'fit-verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEADWEAR_VERIFICATION', json.dumps({k: report.get(k) for k in ('status', 'failures', 'fit_gate', 'export_fidelity')}))
    if report['status'] != 'passed':
        raise RuntimeError('Headwear gates failed; see fit-verification-report.json')


if __name__ == '__main__':
    main()
