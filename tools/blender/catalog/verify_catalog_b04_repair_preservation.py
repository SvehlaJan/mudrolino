"""Compare the reopened repaired B04 against all source invariants."""
import argparse
import json
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_corrective_sides import REVISION, digest, signature, normalized, corrected_signature


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, default=REVISION)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    report = json.loads((args.revision / 'repair-report.json').read_text())
    assert all(digest(Path(path)) == sha for path, sha in report['canonical_hashes'].items())
    assert digest(Path(report['blend'])) == report['blend_sha256'], 'Repair source changed'
    assert all(digest(Path(path)) == sha for path, sha in report.get('tool_hashes', {}).items()), 'Construction tool version changed'
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['source']).resolve()))
    expected = corrected_signature(signature(), report['changed_vertices'])
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['blend']).resolve()))
    after = normalized(signature())
    checks = {name: expected[name] == after[name] for name in expected}
    result = {'status': 'passed' if all(checks.values()) else 'failed', 'checks': checks,
        'tool_hashes': {str(Path('tools/blender/catalog') / name): digest(Path('tools/blender/catalog') / name)
            for name in ('repair_catalog_b04_corrective_sides.py', 'verify_catalog_b04_repair_preservation.py',
                         'b04_corrective_repair_plan.py', 'repair_catalog_f02_corrective_sides.py')},
        'construction_tools_bound': bool(report.get('tool_hashes')),
        'source': report['source'], 'source_sha256': report['source_sha256'],
        'blend': report['blend'], 'blend_sha256': report['blend_sha256'],
        'changed_coordinates': len(report['changed_vertices']), 'canonical_unchanged': True,
        'scope': 'All rest mesh/topology/weight/bind/active modifier/driver/gait/material fields; only audited Right coordinates differ.'}
    (args.revision / 'preservation-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print('B04_PRESERVATION', json.dumps(result))
    assert all(checks.values()), checks


if __name__ == '__main__':
    main()
