"""Explicitly derived payload/reconstruction proof plus fresh endpoint evidence."""
import argparse
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender/catalog'))
from f02_ankle_payload import payload_side

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--folder', type=Path, required=True); args = p.parse_args()
    out = args.folder/'payload-report.json'; assert not out.exists()
    old = args.folder.parent/'ankle-measurement'
    paths = [old/'native-and-equivalent.json', old/'actual-three.json', args.folder/'native-endpoints.json', args.folder/'actual-three-endpoints.json']
    source, actual, ends, end_actual = [json.loads(p.read_text()) for p in paths]; validated = {}
    for report in [source, actual, ends, end_actual]:
        for path, sha in {**report['asset_hashes'], **report['tool_hashes']}.items():
            local = unquote(urlparse(path).path) if path.startswith('file:') else path
            assert digest(Path(local)) == sha, local; validated[local] = sha
    assert end_actual['input_sha256'] == digest(paths[2])
    checks = []; max_reconstruction = 0; max_parity = {k: 0 for k in ['twist_rad', 'swing_forward_rad', 'swing_up_rad', 'knee_value']}; matrix_error = 0
    sets = [('dense-derived', source['modes']['native'], source['modes']['raw-gltf-equivalent'], actual['checks'], source['bind_world'], source['raw_gltf_bind_world'], actual['bind_world']),
            ('endpoints-fresh', ends['checks'], ends['checks'], end_actual['checks'], ends['native_bind_world'], ends['raw_gltf_bind_world'], end_actual['bind_world'])]
    for scope, native, equivalent, three, bind, raw_bind, three_bind in sets:
        for n, e, t in zip(native, equivalent, three):
            assert n['motion'] == t['motion']
            if scope == 'endpoints-fresh': assert n['time_seconds'] == t['time_seconds'] and abs(n['wrapped_time_seconds']-t['actual_action_time_seconds']) < 1e-14
            else: assert n['frame'] == t['frame']
            sides = {}
            for side in ['Left', 'Right']:
                values = {'native': payload_side(n['world'], bind, side), 'equivalent_native': payload_side(e['world'], bind, side), 'raw_gltf': payload_side(e['raw_gltf_world'], raw_bind, side), 'actual_three': payload_side(t['world'], three_bind, side)}
                max_reconstruction = max(max_reconstruction, *(v['reconstruction_rotation_error_rad'] for v in values.values()))
                for key in max_parity: max_parity[key] = max(max_parity[key], abs(values['raw_gltf'][key]-values['actual_three'][key]))
                sides[side] = values
            matrix_error = max(matrix_error, max(abs(e['raw_gltf_world'][bone][i][j]-m[i][j]) for bone, m in t['world'].items() for i in range(4) for j in range(4)))
            checks.append({'scope': scope, 'motion': n['motion'], 'frame': n.get('frame'), 'time_seconds': n.get('time_seconds'), 'label': n.get('label'), 'sides': sides})
    assert max_reconstruction < 1e-5 and max(max_parity.values()) < 1e-5 and matrix_error < 2e-6
    tools = [Path(__file__), Path('tools/blender/catalog/f02_ankle_payload.py')]
    report = {'status': 'passed', 'qualification': 'Dense payloads explicitly derived from hash-validated native/raw/actual-Three pose inventories; 8 exact LoopRepeat boundary poses freshly measured in native equivalent and actual Three. No model/runtime changes or fitting acceptance.',
              'input_hashes': {str(p): digest(p) for p in paths}, 'validated_dependency_hashes': validated, 'tool_hashes': {str(p): digest(p) for p in tools}, 'max_reconstruction_rotation_error_rad': max_reconstruction,
              'max_raw_three_payload_differences': max_parity, 'max_raw_three_world_matrix_difference': matrix_error, 'tolerances': {'angle_rad': 1e-5, 'knee_value': 1e-5, 'matrix_element': 2e-6}, 'checks': checks}
    out.write_text(json.dumps(report, indent=2)+'\n'); print(json.dumps({k: v for k, v in report.items() if k.startswith('max_') or k == 'status'}))


if __name__ == '__main__': main()
