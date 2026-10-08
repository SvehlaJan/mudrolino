"""Read-only native and glTF-equivalent F02 ankle/contact inventory; never save."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_measurement import schedule, measure_side

SOURCE = Path('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.blend')
MODEL = SOURCE.with_suffix('.glb')
GAITS = {m: Path('assets/avatar/catalog-a/foundation/catalog-body-'+m+'.glb') for m in ['walk', 'run']}
EXPECTED = {
    SOURCE: '92ffa5913e4eaec9015b8e414f38b757e032375fc3d1194f4932dffd17a25f0f',
    MODEL: '47d2e2ba80e756b6d7bb5259c44759c0d381ce3e5985f251813e3a9caf7536aa',
    GAITS['walk']: '237ef588534548ef9c990ea2c178306c7dbbfc48f8f8dbda287add7fbcf612fe',
    GAITS['run']: '70a3ede13f421524286a85142c8ff34748275ec1be2a75b1a0b0de270dfed32f',
}
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def world(arm): return {b.name: [list(row) for row in arm.matrix_world@b.matrix] for b in arm.pose.bones}


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--report', type=Path, required=True)
    args = p.parse_args(sys.argv[sys.argv.index('--')+1:]); assert not args.report.exists(), 'Preserve previous measurement'
    assert all(digest(path) == value for path, value in EXPECTED.items()), 'Changed source/gaits require re-audit'
    protected = {str(path): digest(path) for path in [SOURCE, MODEL, *GAITS.values()]}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    arm = bpy.data.objects['Armature_Catalog']; obj = bpy.data.objects['F02_slip_ons']; reset(arm)
    fps = bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
    bind = world(arm); adapter = RuntimeGaitPose(MODEL, GAITS, arm)
    basis = [v.co.copy() for v in obj.data.shape_keys.key_blocks['Basis'].data]
    shell_names = {'A navy slip-on upper', 'A navy slip-on collar', 'A ivory slip-on sole'}
    shell = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in shell_names]
    tabs = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == 'A orange slip-on heel tabs']
    ids = sorted({i for face in tabs for i in face}); assert len(ids) == 60
    side_ids = {s: [i for i in ids if basis[i].x*sign > 0] for s, sign in [('Left', 1), ('Right', -1)]}
    assert all(len(v) == 30 for v in side_ids.values())
    results = {}
    for mode in ['native', 'raw-gltf-equivalent']:
        checks = []
        for row in schedule():
            motion, frame = row['motion'], row['frame']; reset(arm)
            if mode == 'native' and motion != 'rest':
                action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame))
            if mode != 'native': raw_world = adapter.apply(motion, frame, fps)
            bpy.context.view_layer.update(); posed_world = world(arm); points, _ = world_mesh(obj)
            tree = BVHTree.FromPolygons(points, shell); pairs = tree.overlap(BVHTree.FromPolygons(points, tabs))
            sides = {}
            for side in ['Left', 'Right']:
                inv = (arm.matrix_world@arm.pose.bones[side+'Foot'].matrix).inverted()
                samples = []
                for i in side_ids[side]:
                    nearest, normal, _, distance = tree.find_nearest(points[i])
                    samples.append({'index': i, 'tab_foot_local': list(inv@points[i]), 'nearest_shell_foot_local': list(inv@nearest), 'nearest_distance_m': distance})
                sides[side] = {**measure_side(posed_world, bind, side), 'native_driver_value': obj.data.shape_keys.key_blocks['knee_clearance_'+side].value,
                               'tab_shell_pairs': sum(1 for _, face in pairs if (basis[tabs[face][0]].x > 0) == (side == 'Left')), 'samples': samples}
            check = {**row, 'world': posed_world, 'sides': sides}
            if mode != 'native': check['raw_gltf_world'] = raw_world
            checks.append(check)
            if len(checks)%40 == 0: print('F02_ANKLE_PROGRESS', mode, len(checks), flush=True)
        results[mode] = checks
    reset(arm)
    assert all(digest(Path(path)) == value for path, value in protected.items()), 'Protected bytes changed'
    imports = [Path(__file__), Path(__file__).with_name('f02_ankle_measurement.py'), Path(__file__).with_name('catalog_gltf_gait_pose.py'), Path(__file__).with_name('build_catalog_t01.py')]
    report = {'status': 'measured; no candidate or acceptance', 'source_saved': False, 'asset_hashes': protected, 'tool_hashes': {str(path): digest(path) for path in imports},
              'frames_per_second': fps, 'bind_world': bind, 'raw_gltf_bind_world': adapter.rest, 'sampling': 'neutral bind plus all 163 native action quarter-frames and exact endpoints, repeated at actual glTF SLERP-equivalent poses',
              'contract': {'attachment_roles': None, 'detail_distance_limit_m': .012, 'required_shell_pairs': 0, 'knee_semantics_changed': False}, 'modes': results}
    args.report.parent.mkdir(parents=True, exist_ok=True); args.report.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print('F02_ANKLE_MEASURED', len(results['native']), len(results['raw-gltf-equivalent']), fps, flush=True)


if __name__ == '__main__': main()
