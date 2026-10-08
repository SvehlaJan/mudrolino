"""Derived post-hardening proof; never relabel the original construction execution."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_left_patch_attachment import expected_signature, compare_targets, used_tool_snapshot
from repair_catalog_b04_corrective_sides import signature, digest
from b04_left_patch_repair_plan import plan_left_patch
from b04_tool_inventory import local_dependencies, assert_snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    history = args.revision / 'proof-history/pre-hardening-2026-10-07'
    manifest_path = history / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    archived = {row['original']: row for row in manifest['files']}
    assert all(digest(Path(row['archive'])) == row['sha256'] for row in archived.values()), 'Historical snapshot changed'
    report_path = args.revision / 'left-patch-repair-report.json'
    report = json.loads(report_path.read_text())
    for path in (report_path, args.revision / 'gate-report.json', args.revision / 'preservation-report.json', Path(report['pre_save_screen'])):
        assert digest(path) == archived[str(path)]['sha256'], 'Original report bytes changed'
    assert all(archived[path]['sha256'] == sha for path, sha in report['tool_hashes'].items()), 'Original recorded tool hash differs from preserved bytes'
    for field in ('protected_hashes', 'diagnostic_hashes'):
        assert all(digest(Path(path)) == sha for path, sha in report[field].items()), field
    assert digest(Path(report['blend'])) == report['blend_sha256']
    old_directory = history / 'files/tools/blender/catalog'
    historical = local_dependencies(old_directory, [Path(path).name for path in report['tool_hashes'] if Path(path).parent == Path('tools/blender/catalog')])
    reverse = {row['archive']: row['original'] for row in archived.values()}
    missing = sorted(reverse[path] for path in historical if reverse[path] not in report['tool_hashes'])
    current_tools = used_tool_snapshot()
    current_tools.update(local_dependencies(Path('tools/blender/catalog'), [Path(__file__).name]))
    assert_snapshot(current_tools)
    gate = json.loads((args.revision / 'gate-report.json').read_text())
    assert gate['complete'] and gate['status'] == 'passed'
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
    assert_snapshot(current_tools)
    result = {'status': 'passed', 'proof_kind': 'derived post-hardening preservation and inventory verification',
        'source_sha256': report['source_sha256'], 'blend_sha256': report['blend_sha256'],
        'canonical_and_failed_sources_unchanged': True, 'preserved_fields': report['preserved_fields'],
        'changed_key': report['changed_key'], 'changed_vertices': len(plan['changes']), 'eligible_vertices': len(plan['eligible_vertices']),
        'max_coordinate_serialization_error_m': maximum, 'current_tool_hashes': current_tools,
        'current_tools_snapshotted_before_open_and_guarded_after': True,
        'historical_manifest_sha256': digest(manifest_path),
        'original_report_hashes': {str(path): digest(path) for path in (report_path, args.revision / 'gate-report.json', args.revision / 'preservation-report.json', Path(report['pre_save_screen']))},
        'historical_transitive_helpers_not_initially_bound': missing,
        'initial_construction_provenance_complete': False,
        'original_native_gates': {'status': gate['status'], 'complete': gate['complete'], 'count': len(gate['checks']), 'freshly_rerun': False},
        'qualification': 'Initial construction omitted transitive helper fingerprints and before/after tool guards. Exact original builder/report bytes are preserved. This fresh derived check binds current complete tools and unchanged sources; it does not retroactively make the initial construction provenance complete or rerun body/export/runtime gates.',
        'scope': report['scope']}
    (args.revision / 'derived-preservation-report.json').write_text(json.dumps(result, indent=2)+'\n')
    print('B04_DERIVED_PRESERVATION', json.dumps(result))


if __name__ == '__main__':
    main()
