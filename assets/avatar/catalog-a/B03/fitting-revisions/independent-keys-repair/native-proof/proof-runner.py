import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

assert os.environ.get('TEO_LEARN_BLENDER_QUEUE_ACTIVE')
root = Path('assets/avatar/catalog-a/B03/fitting-revisions/independent-keys-repair')
art = Path('artifacts/verification/avatar-catalog/B03/independent-keys-repair')
proof = root / 'diagnostic-proof-report.json'
assert not proof.exists(), 'Preserve previous proof'
repair = json.loads((root / 'repair-report.json').read_text())
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert digest(root / 'B03.blend') == repair['blend_sha256']
records = []
commands = [
    ('canonical-sides', 'verify_catalog_corrective_sides.py', ['--blend', repair['source'], '--report', root / 'canonical-side-report.json', '--require-clear'], 1),
    ('repaired-sides', 'verify_catalog_corrective_sides.py', ['--blend', root / 'B03.blend', '--report', root / 'corrective-side-report.json', '--require-clear'], 0),
]
for name, source in [('canonical-motion', repair['source']), ('repaired-motion', root / 'B03.blend')]:
    commands.append((name, 'review_catalog_motion.py', ['--blend', source, '--garment', 'B03_casual_shorts', '--body', 'body_underlayer_male,H01_head', '--substeps', '4', '--target-z', '.8', '--ortho-scale', '1.2', '--output-dir', root / name, '--review-dir', art / name], 0))
for name, script, args, expected in commands:
    command = [sys.executable, 'tools/avatar/blender_cli.py', 'tools/blender/catalog/' + script, *map(str, args)]
    log = art / (name + '.txt')
    with log.open('w') as out:
        result = subprocess.run(command, stdout=out, stderr=subprocess.STDOUT)
    records.append({'name': name, 'command': command, 'exit_code': result.returncode, 'expected_exit_code': expected, 'log': str(log), 'log_sha256': digest(log)})
    assert result.returncode == expected, records[-1]
    print('MEASURED', name, flush=True)
canonical = json.loads((root / 'canonical-side-report.json').read_text())
assert canonical['status'] == 'failed'
right = next(row for row in canonical['checks'][0]['keys'] if row['key'] == 'knee_clearance_Right')
assert right['opposite_vertices_moved'] == 518
assert all(digest(path) == sha for path, sha in repair['canonical_hashes'].items())
measurements = {name: json.loads((root / name / 'motion-sweep-4x-metadata.json').read_text()) for name in ('canonical-motion', 'repaired-motion')}
assert all(row['samples'] == 163 for row in measurements.values())
proof.write_text(json.dumps({'status': 'measured; fitting acceptance remains open', 'repair_blend_sha256': repair['blend_sha256'], 'records': records, 'measurements': measurements, 'canonical_unchanged': True, 'runner': str(Path(__file__)), 'runner_sha256': digest(__file__)}, indent=2) + '\n')
print(json.dumps(measurements), flush=True)
