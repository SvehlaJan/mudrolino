"""Reopen the bounded Left-patch revision and prove unchanged source fields."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_left_patch_attachment import expected_signature, compare_targets, TOOLS
from repair_catalog_b04_corrective_sides import signature, digest
from b04_left_patch_repair_plan import plan_left_patch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    report = json.loads((args.revision / 'left-patch-repair-report.json').read_text())
    for field in ('protected_hashes', 'diagnostic_hashes', 'tool_hashes'):
        assert all(digest(Path(path)) == sha for path, sha in report[field].items()), field
    assert digest(Path(report['blend'])) == report['blend_sha256']
    assert digest(Path(report['pre_save_screen'])) == report['pre_save_screen_sha256']
    screen = json.loads(Path(report['pre_save_screen']).read_text())
    assert screen['status'] == 'passed' and screen['samples'] == 164 and screen['max_detail_shell_pairs'] == 0 and screen['max_cloth_distance_m'] < .012
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['source']).resolve()))
    before = signature()
    mesh = before['meshes']['B04_ivory_trousers']
    plan = plan_left_patch(mesh['keys']['Basis'], mesh['keys']['knee_clearance_Left'], report['component'], report['host_deltas'])
    assert plan['changes'] == report['changes'] and plan['eligible_vertices'] == report['eligible_vertices']
    expected = expected_signature(before, plan['changes'])
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['blend']).resolve()))
    maximum = compare_targets(expected, signature(), plan['changes'])
    result = {'status': 'passed', 'source_sha256': report['source_sha256'], 'blend_sha256': report['blend_sha256'],
        'canonical_and_failed_sources_unchanged': True, 'preserved_fields': report['preserved_fields'],
        'changed_key': report['changed_key'], 'changed_vertices': len(plan['changes']), 'eligible_vertices': len(plan['eligible_vertices']),
        'max_coordinate_serialization_error_m': maximum, 'pre_save_screen_sha256': report['pre_save_screen_sha256'],
        'tool_hashes': {str(path): digest(path) for path in TOOLS}, 'scope': report['scope']}
    (args.revision / 'preservation-report.json').write_text(json.dumps(result, indent=2)+'\n')
    print('B04_LEFT_PATCH_PRESERVATION', json.dumps(result))


if __name__ == '__main__':
    main()
