"""Verify a glasses study (build_catalog_glasses.py): fit, symmetry, motion and export.

Gates: source/builder/plan/export hashes; rigid Head binding; zero intersections
with skin (temples may pass into hair, as real temples do; hair contact is reported);
rims and bridge at least MIN_FRAME_GAP from skin; mirror symmetry; zero intersections
with body and garments over quarter-frame walk/run plus five head gestures; and the
exported rest shape matching the source.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, bvh, world_mesh
from build_catalog_head_style_study import rig_signature, motion_signature
from verify_catalog_head_scale_study import GESTURES, gait_frames, pose_gesture
from build_catalog_glasses import skin_tree

MIN_FRAME_GAP = .004  # Scaled metres between rims/bridge and the nearest skin.
MIRROR_TOLERANCE = 1e-5


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


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

    check(all(digest(p) == h for p, h in study['source_hashes'].items()), 'head_study_unchanged')
    check(digest(study['builder']) == study['builder_sha256'], 'builder_matches_study')
    check(digest(Path(study['builder']).with_name('catalog_glasses_plan.py')) == study['plan_sha256'], 'plan_matches_study')
    check(digest(blend) == study['blend'][str(blend)], 'saved_blend_matches_study')
    check(all(digest(args.study_dir / n) == h for n, h in study['exports'].items()), 'exports_match_study')

    bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    check(rig_signature(arm) == study['baseline']['rig'] and motion_signature() == study['baseline']['motion'], 'rig_and_gaits_unchanged')
    glasses = bpy.data.objects[study['object']]
    check([g.name for g in glasses.vertex_groups] == ['Head'] and all(
        len(v.groups) == 1 and abs(v.groups[0].weight - 1) < 1e-7 for v in glasses.data.vertices), 'rigid_head_binding')
    heads = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('H01_head') or o.name.startswith('H02_'))]
    hair = [o for o in heads if 'hair' in o.name.lower()]
    body = next(o for o in bpy.data.objects if o.name.startswith('body_underlayer_'))
    garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]

    # Fit at rest.
    skin = skin_tree(heads)
    points, faces = world_mesh(glasses)
    tree = BVHTree.FromPolygons(points, faces)
    skin_pairs = len(tree.overlap(skin))
    hair_pairs = {o.name: len(tree.overlap(bvh(o)[0])) for o in hair}
    # Rims and bridge: everything at or in front of the rims' back face (temples start there).
    frame_vertices = [i for i, p in enumerate(points) if p.y < study['frame_y'] + study['layout']['rim']['depth'] + 1e-6]
    frame_gap = min((skin.find_nearest(points[i])[3] for i in frame_vertices), default=None)
    report['fit'] = {'skin_pairs': skin_pairs, 'hair_pairs': hair_pairs, 'frame_vertices': len(frame_vertices),
                     'min_frame_gap_m': frame_gap, 'min_frame_gap_required_m': MIN_FRAME_GAP}
    check(skin_pairs == 0, 'no_skin_intersections', skin_pairs)
    check(frame_gap is not None and frame_gap >= MIN_FRAME_GAP, 'frame_clear_of_face', frame_gap)

    kd = KDTree(len(points))
    for i, p in enumerate(points):
        kd.insert(p, i)
    kd.balance()
    mirror = max(kd.find(Vector((-p.x, p.y, p.z)))[2] for p in points)
    report['mirror_max_m'] = mirror
    check(mirror <= MIRROR_TOLERANCE, 'mirror_symmetric', mirror)

    rows = []

    def sample(label):
        bpy.context.view_layer.update()
        t = bvh(glasses)[0]
        rows.append({'pose': label, **{o.name: len(t.overlap(bvh(o)[0])) for o in [body, *garments]},
                     'skin': len(t.overlap(skin_tree(heads)))})
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
    check(not any(worst.values()), 'glasses_motion_clearance', worst)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str((args.study_dir / f"{study['item']}.glb").resolve()))
    imported = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
    bpy.context.view_layer.update()
    exported = [imported.matrix_world @ v.co for v in imported.data.vertices]
    source = KDTree(len(points))
    for i, p in enumerate(points):
        source.insert(p, i)
    source.balance()
    export_error = max(source.find(p)[2] for p in exported)
    report['export'] = {'vertices': len(exported), 'max_rest_error_m': export_error}
    check(export_error < 1e-5, 'export_rest_shape', export_error)

    report['status'] = 'passed' if not report['failures'] else 'failed'
    (args.study_dir / 'fit-verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('GLASSES_VERIFY', json.dumps({k: report[k] for k in ('status', 'fit', 'mirror_max_m', 'failures')}))
    if report['failures']:
        raise RuntimeError('Glasses gates failed; see report')


if __name__ == '__main__':
    main()
