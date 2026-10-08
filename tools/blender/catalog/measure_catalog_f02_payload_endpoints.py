"""Native source at exact raw-glTF LoopRepeat boundaries; read-only F02 proof."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure_catalog_f02_ankle import SOURCE, MODEL, GAITS, EXPECTED, digest, world
from build_catalog_t01 import reset
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_payload import payload_side, loop_time


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--report', type=Path, required=True)
    args = p.parse_args(sys.argv[sys.argv.index('--')+1:]); assert not args.report.exists()
    assert all(digest(path) == value for path, value in EXPECTED.items())
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve())); arm = bpy.data.objects['Armature_Catalog']; reset(arm)
    bind = world(arm); adapter = RuntimeGaitPose(MODEL, GAITS, arm); checks = []; clips = {}
    for motion, gait in adapter.gaits.items():
        duration = max(gait.accessor(s['input'])[-1][0] for s in gait.document['animations'][0]['samplers']); clips[motion] = duration
        for label, time in [('zero', 0), ('before_exact_end', duration-1e-7), ('exact_end', duration), ('after_exact_end', duration+1e-7)]:
            reset(arm); raw = adapter.apply(motion, time, 1); bpy.context.view_layer.update(); native = world(arm)
            checks.append({'motion': motion, 'label': label, 'time_seconds': time, 'wrapped_time_seconds': loop_time(time, duration), 'world': native, 'raw_gltf_world': raw,
                           'native_payload': {s: payload_side(native, bind, s) for s in ['Left', 'Right']}, 'raw_payload': {s: payload_side(raw, adapter.rest, s) for s in ['Left', 'Right']}})
    reset(arm); assert all(digest(path) == value for path, value in EXPECTED.items())
    tools = [Path(__file__), *[Path(__file__).with_name(name+'.py') for name in ['f02_ankle_payload', 'f02_ankle_measurement', 'measure_catalog_f02_ankle', 'catalog_gltf_gait_pose', 'build_catalog_t01']]]
    report = {'status': 'fresh read-only exact LoopRepeat endpoint inventory', 'source_saved': False, 'asset_hashes': {str(k): v for k, v in EXPECTED.items()}, 'tool_hashes': {str(p): digest(p) for p in tools}, 'native_bind_world': bind, 'raw_gltf_bind_world': adapter.rest, 'clips_seconds': clips, 'checks': checks}
    args.report.parent.mkdir(parents=True, exist_ok=True); args.report.write_text(json.dumps(report, indent=2)+'\n'); print('F02_PAYLOAD_ENDPOINTS', len(checks), flush=True)


if __name__ == '__main__': main()
