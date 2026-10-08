"""Reopen B04 target-only source and prove exact unchanged fields."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_target_attachment import expected_signature, compare_targets, TOOLS
from repair_catalog_b04_corrective_sides import signature, digest
from b04_target_repair_plan import plan_targets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    report = json.loads((args.revision / 'target-repair-report.json').read_text())
    for field in ('protected_hashes', 'diagnostic_hashes', 'tool_hashes'):
        assert all(digest(Path(path)) == sha for path, sha in report[field].items()), field
    assert digest(Path(report['blend'])) == report['blend_sha256']
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['source']).resolve()))
    before = signature()
    mesh = before['meshes']['B04_ivory_trousers']
    plan = plan_targets(mesh['keys']['Basis'], mesh['keys']['knee_clearance_Right'],
        report['components'], report['front_deltas'], report['host_deltas'])
    assert plan['changes'] == report['changes'] and plan['eligible_vertices'] == report['eligible_vertices']
    expected = expected_signature(before, plan['changes'])
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['blend']).resolve()))
    maximum = compare_targets(expected, signature(), plan['changes'])
    result = {'status': 'passed', 'source_sha256': report['source_sha256'], 'blend_sha256': report['blend_sha256'],
        'canonical_and_failed_sources_unchanged': True, 'preserved_fields': report['preserved_fields'],
        'changed_key': report['changed_key'], 'changed_vertices': len(plan['changes']),
        'eligible_vertices': len(plan['eligible_vertices']), 'max_coordinate_serialization_error_m': maximum,
        'tool_hashes': {str(path): digest(path) for path in TOOLS}, 'scope': report['scope']}
    (args.revision / 'preservation-report.json').write_text(json.dumps(result, indent=2)+'\n')
    print('B04_TARGET_PRESERVATION', json.dumps(result))


if __name__ == '__main__':
    main()
