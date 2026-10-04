"""Run isolated F02 gates sequentially, retaining failed gates without promotion."""
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

root = Path.cwd()
revision = Path(__file__).resolve().parent.relative_to(root)
artifacts = Path('artifacts/verification/avatar-catalog/F02/independent-keys-repair')
artifacts.mkdir(parents=True, exist_ok=True)
outfit = revision / 'outfit'
source = revision / 'F02.blend'
records = []

def blender(script, *args):
    return [sys.executable, 'tools/avatar/blender_cli.py', 'tools/blender/catalog/' + script, *map(str, args)]

def gate(name, command):
    print('START', name, flush=True)
    started = time.time()
    with (artifacts / (name + '.log')).open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    records.append({'gate': name, 'command': command, 'exit_code': result.returncode, 'status': 'passed' if result.returncode == 0 else 'failed', 'elapsed_s': round(time.time()-started, 3), 'log': str(artifacts / (name + '.log'))})
    (revision / 'gate-report.json').write_text(json.dumps({'status': 'passed' if all(row['status'] == 'passed' for row in records) else 'failed', 'checks': records}, indent=2) + '\n')
    print(records[-1]['status'].upper(), name, flush=True)
    return result.returncode == 0

if not gate('independent-corrective-sides', blender('verify_catalog_corrective_sides.py', '--blend', source, '--report', revision/'corrective-side-report.json', '--require-clear')):
    raise SystemExit(1)
common = ['--body', 'body_underlayer_male,H01_head', '--substeps', '4', '--require-clear', '--target-z', '.12', '--ortho-scale', '.62']
gate('independent-motion', blender('review_catalog_motion.py', '--blend', source, '--garment', 'F02_slip_ons', *common, '--output-dir', revision, '--review-dir', artifacts/'independent'))
details = ['--blend', source, '--garment', 'F02_slip_ons', '--surface-material', 'A navy slip-on upper', '--surface-material', 'A navy slip-on collar', '--surface-material', 'A ivory slip-on sole', '--detail-material', 'A dark slip-on elastic gores', '--detail-material', 'A orange slip-on heel tabs', '--threshold', '.012']
gate('detail-distance', blender('verify_catalog_details.py', *details, '--report', revision/'detail-fit-report.json'))
gate('detail-own-shell', blender('verify_catalog_details.py', *details, '--require-detail-clear', '--report', revision/'detail-own-shell-report.json'))
if not gate('assembly', blender('assemble_catalog_outfit.py', '--foundation', 'assets/avatar/catalog-a/foundation/catalog-body.blend', '--catalog-dir', revision/'staged-catalog', '--pieces', 'T02,B02,F02,A01', '--output-dir', outfit, '--review-dir', artifacts/'outfit')):
    raise SystemExit(1)
side = []
for piece in ['T02', 'B02', 'F02', 'A01']:
    side += ['--blend', str(revision/'staged-catalog'/piece/(piece+'.blend'))]
gate('outfit-corrective-sides', blender('verify_catalog_corrective_sides.py', *side, '--blend', outfit/'outfit.blend', '--report', outfit/'corrective-side-report.json', '--require-clear'))
combined = ['--body', 'body_underlayer_male,H01_head', '--substeps', '4', '--require-clear', '--target-z', '.92', '--ortho-scale', '2.10']
gate('outfit-motion', blender('review_catalog_motion.py', '--blend', outfit/'outfit.blend', '--garment', 'T02_pullover_hoodie_outfit,B02_joggers_outfit,F02_slip_ons_outfit,A01_baseball_cap_outfit', *combined, '--output-dir', outfit, '--review-dir', artifacts/'outfit'))
gate('export-deformation', blender('verify_catalog_outfit_export.py', '--blend', outfit/'outfit.blend', '--glb', outfit/'outfit.glb', '--report', outfit/'export-deformation-report.json'))
gate('runtime-correctives', ['node', '--import', 'tsx', 'tools/avatar/verify_catalog_correctives.ts', '--outfit=T02-B02-F02-A01', '--outfit-dir='+str(outfit)])
gate('cap-attachment', blender('verify_catalog_attachment.py', '--blend', outfit/'outfit.blend', '--object', 'A01_baseball_cap_outfit', '--bone', 'Head', '--obstacles', 'H01_head,T02_pullover_hoodie_outfit,B02_joggers_outfit,F02_slip_ons_outfit', '--report', outfit/'cap-attachment-report.json'))
gate('export-materials', ['node', 'tools/blender/catalog/verify_exported_materials.mjs', str(outfit/'outfit.glb'), str(outfit/'material-export-report.json')])
for name in ['F02.glb', 'body-F02.glb', 'outfit/body.glb', 'outfit/garments.glb', 'outfit/outfit.glb']:
    gate('glb-'+name.replace('/', '-'), ['node', 'tools/avatar/validate_gltf.js', str(revision/name)])
canonical = json.loads((revision/'repair-report.json').read_text())['canonical_hashes']
assert all(hashlib.sha256(Path(path).read_bytes()).hexdigest() == sha for path,sha in canonical.items()), 'Canonical F02 files changed'
print('ISOLATED_GATE_REPORT', json.dumps(records), flush=True)
raise SystemExit(0 if all(row['status']=='passed' for row in records) else 1)
