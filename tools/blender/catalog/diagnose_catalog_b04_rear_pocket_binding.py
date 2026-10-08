"""Explain a rejected footprint's attachment error without saving a model."""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE, SOURCE_SHA
from b04_pocket_vertex_edits import apply_pocket_edits
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from build_catalog_b04_rear_pockets import assert_preserved, ROOT, OBJECT
from repair_catalog_b04_left_patch_attachment import SHELL
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from build_catalog_t01 import reset, world_mesh, setup_render


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert args.output_dir.resolve().is_relative_to(ROOT.resolve())
    assert not (args.output_dir/'binding-diagnosis.json').exists()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    plan_path = ROOT/'rounded-footprint-probe/construction-plan.json'
    screen_path = ROOT/'rounded-footprint-probe/pre-save-screen-report.json'
    plan = json.loads(plan_path.read_text()); rejected = json.loads(screen_path.read_text())
    assert rejected['status'] == 'failed' and not rejected['source_saved']
    assert rejected['construction_plan_sha256'] == digest(plan_path)
    assert plan['source_sha256'] == digest(SOURCE) == SOURCE_SHA
    assert_snapshot(plan['tool_hashes']); assert_snapshot(plan['input_hashes'])
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar') / n for n in ('blender_cli.py', 'blender_queue.py')))
    inputs = snapshot_files([SOURCE, plan_path, screen_path])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj, arm = bpy.data.objects[OBJECT], bpy.data.objects['Armature_Catalog']
    reset(arm); before = normalized(signature())
    started = time.monotonic()
    apply_pocket_edits(obj, plan['changes'])
    application_seconds = time.monotonic() - started
    assert_preserved(before, normalized(signature()), plan['changes'])
    faces = [tuple(p.vertices) for p in obj.data.polygons]
    shell_faces = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
    side_ids = {side: {r['vertex'] for r in plan['changes'] if r['side'] == side} for side in ('Left', 'Right')}
    patch_faces = {side: [f for f in faces if set(f) <= ids] for side, ids in side_ids.items()}
    rows = []
    for variant in ('independent-proposal', 'host-opposite-diagnostic'):
        if variant == 'host-opposite-diagnostic':
            for row in plan['changes']:
                name = row['opposite_key']
                obj.data.shape_keys.key_blocks[name].data[row['vertex']].co = Vector(row['point']) + Vector(row['host_opposite_delta_m'])
            obj.data.update()
        for motion, frame in [('rest',0), ('walk',.75), ('walk',19.5), ('run',8.5), ('run',19.5)]:
            reset(arm)
            if motion != 'rest':
                action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
            points, _ = world_mesh(obj); shell = BVHTree.FromPolygons(points, shell_faces)
            samples = []
            for row in plan['changes']:
                i = row['vertex']; a,b,c = [points[v] for v in row['host_triangle']]
                normal = (b-a).cross(c-a).normalized()
                target = sum((points[v]*f for v,f in zip(row['host_triangle'],row['barycentric'])), Vector()) + normal*row['offset_m']
                near, n, polygon, distance = shell.find_nearest(points[i])
                samples.append({'vertex': i, 'side': row['side'], 'grid': row['grid'], 'layer': row['layer'],
                    'host_transport_error_m': (points[i]-target).length, 'cloth_distance_m': distance,
                    'signed_nearest_distance_m': (points[i]-near).dot(n), 'rest_point': row['point'],
                    'posed_point': list(points[i]), 'desired_host_point': list(target), 'host_opposite_delta_m': row['host_opposite_delta_m']})
            rows.append({'variant': variant, 'motion': motion, 'frame': frame,
                'key_values': {k.name: k.value for k in obj.data.shape_keys.key_blocks},
                'own_shell_pairs': {side: len(shell.overlap(BVHTree.FromPolygons(points, fs))) for side, fs in patch_faces.items()},
                'maximum_transport_error_m': max(s['host_transport_error_m'] for s in samples),
                'maximum_cloth_distance_m': max(s['cloth_distance_m'] for s in samples),
                'worst_transport': sorted(samples, key=lambda s:s['host_transport_error_m'], reverse=True)[:8],
                'most_penetrating': sorted(samples, key=lambda s:s['signed_nearest_distance_m'])[:8]})
            print('B04_PATCH_BINDING_DIAGNOSIS', json.dumps({k:v for k,v in rows[-1].items() if k not in ('worst_transport','most_penetrating')}), flush=True)
    assert_snapshot(tools); assert_snapshot(inputs); assert_snapshot(plan['input_hashes'])
    report = {'status': 'diagnostic only; rejected footprint not saved', 'source': str(SOURCE), 'source_sha256': SOURCE_SHA,
        'source_unchanged': True, 'source_saved': False, 'tool_hashes': tools, 'input_hashes': inputs,
        'batched_edit_application_seconds': application_seconds, 'checks': rows,
        'scope': 'Five diagnostic native poses per variant. Host-opposite variant intentionally violates independent pocket-key isolation to measure the source of drift; cannot be accepted or promoted. No full sweep, export/runtime or art acceptance.'}
    (args.output_dir/'binding-diagnosis.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    main()
