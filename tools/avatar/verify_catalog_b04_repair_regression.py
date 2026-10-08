"""Run the real side gate on contaminated and isolated repaired B04 sources."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

REVISION = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, default=REVISION)
    parser.add_argument('--output-dir', type=Path, default=Path('artifacts/verification/avatar-catalog/B04/independent-keys-repair/regression'))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    canonical = Path('assets/avatar/catalog-a/B04/B04.blend')
    protected = [canonical, canonical.with_suffix('.glb'), canonical.with_name('body-B04.glb')]
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    hashes = {str(path): digest(path) for path in protected}
    checks = []

    def run(name, script, arguments, expected):
        command = [sys.executable, 'tools/avatar/blender_cli.py', 'tools/blender/catalog/' + script, *map(str, arguments)]
        with (args.output_dir / (name + '.log')).open('w') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        checks.append({'gate': name, 'command': command, 'exit_code': result.returncode,
            'expected_exit_code': expected, 'log': str(args.output_dir / (name + '.log'))})
        assert result.returncode == expected, checks[-1]
        print(name, 'expected exit', expected, flush=True)

    before = args.revision / 'before-corrective-side-report.json'
    after = args.revision / 'corrective-side-report.json'
    args.revision.mkdir(parents=True, exist_ok=True)
    run('canonical-contamination', 'verify_catalog_corrective_sides.py',
        ['--blend', canonical, '--report', before, '--require-clear'], 1)
    bad = json.loads(before.read_text())
    contaminated = [row for row in bad['checks'][0]['keys'] if row['key'] == 'knee_clearance_Right']
    assert bad['status'] == 'failed' and len(contaminated) == 1
    assert contaminated[0]['opposite_vertices_moved'] == 263
    assert abs(contaminated[0]['max_opposite_delta_m'] - .026239174317096707) <= 1e-7
    run('bounded-repair', 'repair_catalog_b04_corrective_sides.py', ['--output-dir', args.revision], 0)
    run('saved-preservation', 'verify_catalog_b04_repair_preservation.py', ['--revision', args.revision], 0)
    run('corrected-isolation', 'verify_catalog_corrective_sides.py',
        ['--blend', args.revision / 'B04.blend', '--report', after, '--require-clear'], 0)
    good = json.loads(after.read_text())
    assert good['status'] == 'passed'
    assert len(good['checks'][0]['keys']) == 2
    assert all(row['opposite_vertices_moved'] == 0 and row['intended_vertices_moved'] == 263
               for row in good['checks'][0]['keys'])
    assert all(digest(Path(path)) == sha for path, sha in hashes.items()), 'Canonical B04 changed'
    report = {'status': 'passed', 'canonical_hashes': hashes, 'canonical_unchanged': True,
        'canonical_contaminated_vertices': 263, 'repaired_opposite_vertices': 0,
        'before_report': str(before), 'after_report': str(after), 'checks': checks,
        'scope': 'Real native gate rejects canonical contamination and accepts bounded isolated repair; fitting remains separate.'}
    (args.revision / 'regression-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('B04_SIDE_REGRESSION', json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
