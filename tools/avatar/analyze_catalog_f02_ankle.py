"""Source-bound analysis of read-only F02 native/raw-glTF/actual Three evidence."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender/catalog'))
from f02_ankle_measurement import measure_side, schedule
from f02_ankle_fields import compare

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--folder', type=Path, required=True)
    args = parser.parse_args(); folder = args.folder; output = folder/'analysis.json'; assert not output.exists(), 'Preserve existing analysis'
    paths = [folder/'native-and-equivalent.json', folder/'actual-three.json']
    native, three = [json.loads(p.read_text()) for p in paths]
    validated = {}
    for report in [native, three]:
        for path, value in {**report['asset_hashes'], **report['tool_hashes']}.items():
            local = unquote(urlparse(path).path) if path.startswith('file:') else path
            assert digest(local) == value, 'Changed evidence dependency: '+local
            validated[local] = value
    assert native['frames_per_second'] == three['frames_per_second'] == 24
    expected = schedule(); rows = []
    maximum = {'raw_three_matrix': 0, 'raw_three_twist_rad': 0, 'raw_three_swing_rad': 0, 'raw_three_knee_value': 0, 'equivalent_native_raw_twist_rad': 0, 'saved_native_raw_twist_rad': 0, 'saved_native_raw_swing_rad': 0, 'saved_native_raw_knee_value': 0}
    for index, row in enumerate(expected):
        n = native['modes']['native'][index]; e = native['modes']['raw-gltf-equivalent'][index]; t = three['checks'][index]
        assert all((r['motion'], r['frame']) == (row['motion'], row['frame']) for r in [n, e, t])
        for bone, matrix in t['world'].items():
            maximum['raw_three_matrix'] = max(maximum['raw_three_matrix'], max(abs(matrix[i][j]-e['raw_gltf_world'][bone][i][j]) for i in range(4) for j in range(4)))
        sides = {}
        for side in ['Left', 'Right']:
            raw = measure_side(e['raw_gltf_world'], native['raw_gltf_bind_world'], side)
            actual = measure_side(t['world'], three['bind_world'], side)
            for component in ['twist_rad', 'swing_rad', 'knee_value']:
                maximum['raw_three_'+component] = max(maximum['raw_three_'+component], abs(raw[component]-actual[component]))
                maximum['saved_native_raw_'+component] = max(maximum['saved_native_raw_'+component], abs(n['sides'][side][component]-raw[component]))
            maximum['raw_three_knee_value'] = max(maximum['raw_three_knee_value'], abs(raw['knee_value']-t['knee_values'][side][0]))
            maximum['equivalent_native_raw_twist_rad'] = max(maximum['equivalent_native_raw_twist_rad'], abs(e['sides'][side]['twist_rad']-raw['twist_rad']))
            fields = ['twist_rad', 'swing_rad', 'knee_value', 'native_driver_value', 'tab_shell_pairs']
            sides[side] = {'saved_native': {k: n['sides'][side][k] for k in fields}, 'equivalent_native': {k: e['sides'][side][k] for k in fields}, 'raw_gltf': raw, 'actual_three': actual, 'actual_existing_binder_value': t['knee_values'][side][0]}
        rows.append({**row, 'sides': sides})
    assert maximum['raw_three_matrix'] < 2e-6 and maximum['raw_three_twist_rad'] < 1e-5 and maximum['raw_three_swing_rad'] < 1e-5 and maximum['raw_three_knee_value'] < 1e-5, 'Portable measurement parity failed'
    ranges = {mode: {side: {'min_twist_rad': min(r['sides'][side]['twist_rad'] for r in checks), 'max_twist_rad': max(r['sides'][side]['twist_rad'] for r in checks), 'max_swing_rad': max(r['sides'][side]['swing_rad'] for r in checks)} for side in ['Left', 'Right']} for mode, checks in native['modes'].items()}
    ambiguity = {}
    for mode, checks in native['modes'].items():
        summaries = []
        for tolerance in [1e-5, 1e-4, .001, .005]:
            pairs = []
            for side in ['Left', 'Right']:
                for i, a in enumerate(checks):
                    for b in checks[i+1:]:
                        x, y = a['sides'][side], b['sides'][side]
                        if abs(x['twist_rad']-y['twist_rad']) <= tolerance and abs(x['knee_value']-y['knee_value']) <= .005:
                            pairs.append({'side': side, 'a': {'motion': a['motion'], 'frame': a['frame'], 'pairs': x['tab_shell_pairs'], 'twist_rad': x['twist_rad'], 'knee_value': x['knee_value']}, 'b': {'motion': b['motion'], 'frame': b['frame'], 'pairs': y['tab_shell_pairs'], 'twist_rad': y['twist_rad'], 'knee_value': y['knee_value']}, **compare(x, y)})
            summaries.append({'angle_window_rad': tolerance, 'knee_value_window': .005, 'count': len(pairs), 'largest_gap_variation': sorted(pairs, key=lambda r: r['max_gap_vector_difference_m'], reverse=True)[:5]})
        ambiguity[mode] = summaries
    endpoints = {}
    for motion, clip in three['clips'].items():
        frame = 25.6 if motion == 'walk' else 16
        endpoints[motion] = {**clip, 'sample_start_frame': .8, 'sample_end_frame': frame, 'sample_end_time_seconds': frame/24, 'end_time_minus_duration_seconds': frame/24-clip['duration_seconds'], 'sample_end_wraps': frame/24 >= clip['duration_seconds'], 'exact_duration_convention': 'Default LoopRepeat wraps exact duration to time zero; sampled source endpoint is retained, not rounded to clip duration.'}
    protected_report = Path('assets/avatar/catalog-a/F02/fitting-revisions/heel-tab-shell-clearance-v1/diagnosis-summary.json')
    previous = json.loads(protected_report.read_text())
    # The earlier archive has current binding entries; accept only hashes verified now.
    old_hashes = previous.get('preserved_assets', previous.get('asset_hashes', {}))
    report = {'status': 'measurement parity passed; one-scalar fitting remains unproved', 'no_model_saved': True, 'no_runtime_changed': True, 'promotion': False,
              'derivation': 'All angles/pair comparisons here are derived from the fresh native and actual Three inventories; this analysis is not a new fitting/export clearance gate.',
              'input_hashes': {str(p): digest(p) for p in paths}, 'validated_dependency_hashes': validated,
              'analysis_tool_hashes': {str(p): digest(p) for p in [Path(__file__), Path('tools/blender/catalog/f02_ankle_fields.py'), Path('tools/blender/catalog/f02_ankle_measurement.py')]},
              'runtime_parity_tolerances': {'rotation_matrix': 2e-6, 'angle_rad': 1e-5, 'knee_value': 1e-5}, 'maximum_differences': maximum, 'ranges': ranges, 'clip_endpoints': endpoints,
              'ambiguity_screen': ambiguity, 'ambiguity_qualification': 'Near-angle pairs are diagnostic witnesses, not exact analytic iso-angle collisions. At 1e-5 rad the sampled pairs are repeated gait endpoints only. Off-axis swing is measured independently; a one-scalar corrective has no demonstrated error bound across those states.',
              'checks': rows}
    output.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'status': report['status'], 'samples': len(rows), 'maximum_differences': maximum, 'max_off_axis_swing_rad': max(v['max_swing_rad'] for r in ranges.values() for v in r.values())}))


if __name__ == '__main__': main()
