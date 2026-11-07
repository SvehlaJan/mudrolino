"""Audit new arm/torso and arm/head contact across all authored generated-bear clips.

Record intrinsic source contacts separately: fused anatomical features can touch.
This does not prove independent garment fit or future wardrobe compatibility.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, write_json
from build_catalog_t01 import world_mesh


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    mesh = bpy.data.objects['Bear_fixed_outfit']
    arm = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    if 'celebrate' not in bpy.data.actions:
        raise ValueError('Expected the saved celebrate action')

    points = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    parents = list(range(len(points)))

    def root(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    tree = KDTree(len(points))
    for index, point in enumerate(points):
        tree.insert(point, index)
    tree.balance()
    for index, point in enumerate(points):
        for _, other, _ in tree.find_range(point, .00001):
            if other > index:
                parents[root(other)] = root(index)
    ids = [root(index) for index in range(len(points))]
    mesh.data.calc_loop_triangles()
    faces = [tuple(triangle.vertices) for triangle in mesh.data.loop_triangles]
    welded = [{ids[index] for index in face} for face in faces]
    roles = []
    for face in faces:
        weights = Counter()
        for index in face:
            for group in mesh.data.vertices[index].groups:
                weights[mesh.vertex_groups[group.group].name] += group.weight
        bone = weights.most_common(1)[0][0]
        if any(part in bone for part in ['Arm', 'Hand', 'Shoulder']):
            roles.append('arm')
        elif any(part in bone for part in ['Head', 'neck', 'head']):
            roles.append('head')
        elif any(part in bone for part in ['Spine', 'Hips', 'Leg', 'Foot', 'Toe']):
            roles.append('torso-leg')
        else:
            roles.append('other')

    def contacts():
        current = world_mesh(mesh)[0]
        bvh = BVHTree.FromPolygons(current, faces, all_triangles=True)
        return {(a, b) for a, b in bvh.overlap(bvh) if a < b and not (welded[a] & welded[b])}

    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    baseline = contacts()

    actions = sorted(bpy.data.actions, key=lambda act: (0 if act.name == 'celebrate' else 1, act.name))
    clip_reports = []
    celebrate_rows = []
    overall_worst_torso = 0
    overall_worst_head = 0
    overall_max_total = 0
    total_sampled_frames = 0

    for action in actions:
        arm.animation_data.action = action
        if hasattr(arm.animation_data, 'action_slot') and action.slots:
            arm.animation_data.action_slot = action.slots[0]
        end_frame = int(round(action.frame_range[1]))
        sample_count = end_frame * 4 + 1
        rows = []
        for index in range(sample_count):
            frame = index / 4
            bpy.context.scene.frame_set(int(frame), subframe=frame - int(frame))
            bpy.context.view_layer.update()
            current = contacts()
            added = current - baseline
            arm_torso = [pair for pair in added if {roles[pair[0]], roles[pair[1]]} == {'arm', 'torso-leg'}]
            arm_head = [pair for pair in added if {roles[pair[0]], roles[pair[1]]} == {'arm', 'head'}]
            rows.append({
                'frame': frame,
                'nonadjacent_contacts': len(current),
                'new_pairs': len(added),
                'new_arm_torso_leg_pairs': len(arm_torso),
                'new_arm_head_pairs': len(arm_head),
                'critical_examples': (arm_torso + arm_head)[:5],
            })
        worst_torso = max(row['new_arm_torso_leg_pairs'] for row in rows)
        worst_head = max(row['new_arm_head_pairs'] for row in rows)
        max_total = max(row['nonadjacent_contacts'] for row in rows)
        overall_worst_torso = max(overall_worst_torso, worst_torso)
        overall_worst_head = max(overall_worst_head, worst_head)
        overall_max_total = max(overall_max_total, max_total)
        total_sampled_frames += len(rows)
        if action.name == 'celebrate':
            celebrate_rows = rows
        clip_reports.append({
            'clip': action.name,
            'frame_count': len(rows),
            'maximum_new_arm_torso_leg_pairs': worst_torso,
            'maximum_new_arm_head_pairs': worst_head,
            'maximum_total_contacts': max_total,
        })

    passed = overall_worst_torso == 0 and overall_worst_head == 0
    report = {
        'status': 'passed' if passed else 'failed',
        'profile': 'generated-fixed-outfit-arm-clearance',
        'scope': (
            'No new nonadjacent arm-versus-torso/leg or arm-versus-head triangle contacts '
            'relative to the source bind pose across all authored clips at 120Hz; all other '
            'contacts recorded, not declared absent. Not independent garment or wardrobe proof.'
        ),
        'blend': str(args.blend),
        'blend_sha256': digest(args.blend),
        'verifier_sha256': digest(Path(__file__)),
        'blender_version': bpy.app.version_string,
        'rest_weld_epsilon_m': .00001,
        'source_bind_contacts': len(baseline),
        'frame_count': len(celebrate_rows),
        'total_sampled_frames': total_sampled_frames,
        'maximum_new_arm_torso_leg_pairs': overall_worst_torso,
        'maximum_new_arm_head_pairs': overall_worst_head,
        'maximum_total_contacts': overall_max_total,
        'clips': clip_reports,
        'frames': celebrate_rows,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.report, report)
    print(json.dumps({
        k: report[k]
        for k in [
            'status',
            'frame_count',
            'total_sampled_frames',
            'source_bind_contacts',
            'maximum_new_arm_torso_leg_pairs',
            'maximum_new_arm_head_pairs',
            'maximum_total_contacts',
        ]
    }))
    if not passed:
        raise RuntimeError('New arm-to-body or arm-to-head contact remains')


if __name__ == '__main__':
    main()
