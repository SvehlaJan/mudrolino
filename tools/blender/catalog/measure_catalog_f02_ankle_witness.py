"""Measure one solved Left/walk iso-angle pair at native and glTF poses; no save."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure_catalog_f02_ankle import SOURCE, MODEL, GAITS, EXPECTED, digest, world
from build_catalog_t01 import reset, world_mesh
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_measurement import measure_side
from f02_ankle_witness_bracket import solve
from f02_ankle_fields import compare


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--report', type=Path, required=True)
    args = p.parse_args(sys.argv[sys.argv.index('--')+1:]); assert not args.report.exists(), 'Preserve existing witness'
    assert all(digest(path) == value for path, value in EXPECTED.items())
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve())); arm = bpy.data.objects['Armature_Catalog']; obj = bpy.data.objects['F02_slip_ons']; reset(arm)
    bind = world(arm); fps = bpy.context.scene.render.fps/bpy.context.scene.render.fps_base; adapter = RuntimeGaitPose(MODEL, GAITS, arm)
    def angle(frame): return measure_side(adapter.evaluated_world('walk', frame, fps), adapter.rest, 'Left')['twist_rad']
    target_frame = 16.25; target = angle(target_frame); solution = solve(angle, target, 18.4, 18.6)
    checks = [{'motion': 'walk', 'frame': target_frame}, {'motion': 'walk', 'frame': solution['frame']}]
    basis = [v.co.copy() for v in obj.data.shape_keys.key_blocks['Basis'].data]
    names = {'A navy slip-on upper', 'A navy slip-on collar', 'A ivory slip-on sole'}
    shell = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in names]
    tabs = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == 'A orange slip-on heel tabs']
    ids = sorted({i for face in tabs for i in face}); assert len(ids) == 60
    modes = {}
    for mode in ['native', 'raw-gltf-equivalent']:
        records = []
        for row in checks:
            reset(arm); frame = row['frame']
            if mode == 'native':
                action = bpy.data.actions['walk']; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame))
            if mode != 'native': raw = adapter.apply('walk', frame, fps)
            bpy.context.view_layer.update(); matrices = world(arm); points, _ = world_mesh(obj)
            tree = BVHTree.FromPolygons(points, shell); pairs = tree.overlap(BVHTree.FromPolygons(points, tabs)); sides = {}
            for side, sign in [('Left', 1), ('Right', -1)]:
                inv = (arm.matrix_world@arm.pose.bones[side+'Foot'].matrix).inverted(); samples = []
                for i in ids:
                    if basis[i].x*sign <= 0: continue
                    nearest, _, _, distance = tree.find_nearest(points[i])
                    samples.append({'index': i, 'tab_foot_local': list(inv@points[i]), 'nearest_shell_foot_local': list(inv@nearest), 'nearest_distance_m': distance})
                sides[side] = {**measure_side(matrices, bind, side), 'native_driver_value': obj.data.shape_keys.key_blocks['knee_clearance_'+side].value,
                               'tab_shell_pairs': sum(1 for _, f in pairs if basis[tabs[f][0]].x*sign > 0), 'samples': samples}
            record = {**row, 'world': matrices, 'sides': sides}
            if mode != 'native': record['raw_gltf_world'] = raw
            records.append(record)
        modes[mode] = records
    reset(arm); assert all(digest(path) == value for path, value in EXPECTED.items())
    tools = [Path(__file__), *[Path(__file__).with_name(name+'.py') for name in ['measure_catalog_f02_ankle', 'f02_ankle_measurement', 'f02_ankle_witness_bracket', 'f02_ankle_fields', 'catalog_gltf_gait_pose', 'build_catalog_t01']]]
    report = {'status': 'bounded read-only iso-angle witness measured; no candidate', 'source_saved': False, 'asset_hashes': {str(k): v for k, v in EXPECTED.items()}, 'tool_hashes': {str(p): digest(p) for p in tools},
              'frames_per_second': fps, 'solution': solution, 'checks': checks, 'bind_world': bind, 'raw_gltf_bind_world': adapter.rest, 'modes': modes,
              'comparisons': {mode: compare(records[0]['sides']['Left'], records[1]['sides']['Left']) for mode, records in modes.items()},
              'qualification': 'Angle solved against actual raw-glTF SLERP gait; saved native action evaluated at same exact frames is measured separately. Foot-local source geometry at equivalent poses is instrumentation, not source/export/Three vertex acceptance proof.'}
    args.report.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n'); print('F02_ISO_ANGLE', json.dumps({'solution': solution, 'comparisons': report['comparisons']}), flush=True)


if __name__ == '__main__': main()
