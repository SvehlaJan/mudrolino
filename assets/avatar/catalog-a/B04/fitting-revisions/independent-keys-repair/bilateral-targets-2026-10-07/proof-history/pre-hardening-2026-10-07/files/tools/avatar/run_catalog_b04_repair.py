"""Run isolated B04 native and export gates; never promote a failed repair."""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REVISION = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair')
ARTIFACTS = Path('artifacts/verification/avatar-catalog/B04/independent-keys-repair')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, default=REVISION)
    parser.add_argument('--existing-source', action='store_true', help='Verify an isolated detail revision without rebuilding the side-only source')
    parser.add_argument('--target-source', action='store_true', help='Build and verify a fresh bounded target-only attachment revision')
    parser.add_argument('--left-patch-source', action='store_true', help='Build a fresh Left-patch revision with a pre-save full-cycle screen')
    parser.add_argument('--regression-only', action='store_true')
    parser.add_argument('--skip-regression', action='store_true', help='Requires current passing source-bound regression, records reuse')
    parser.add_argument('--preview-url', help='Run source-bound production browser gate when a verified preview is ready')
    args = parser.parse_args()
    revision = args.revision
    assert revision.resolve().is_relative_to(REVISION.resolve()), 'Keep B04 studies inside the isolated revision'
    artifacts = ARTIFACTS / revision.relative_to(REVISION)
    assert sum((args.existing_source, args.skip_regression, args.target_source, args.left_patch_source)) <= 1, 'Choose one source mode'
    assert os.environ.get('TEO_LEARN_BLENDER_QUEUE_ACTIVE'), 'Wrap this entire runner once through blender_queue.py'
    if args.target_source or args.left_patch_source:
        assert not revision.exists(), 'Preserve existing target-only evidence'
    else:
        revision.mkdir(parents=True, exist_ok=True)
    artifacts.mkdir(parents=True, exist_ok=True)
    canonical = Path('assets/avatar/catalog-a/B04/B04.blend')
    protected = [canonical, canonical.with_suffix('.glb'), canonical.with_name('body-B04.glb')]
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    hashes = {str(path): digest(path) for path in protected}
    records = []

    def blender(script, *arguments):
        return [sys.executable, 'tools/avatar/blender_cli.py', 'tools/blender/catalog/' + script, *map(str, arguments)]

    def gate(name, command, expected_exit=0):
        print('START', name, flush=True)
        started = time.time()
        log_path = artifacts / (name + '.log')
        with log_path.open('w') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        records.append({'gate': name, 'command': command, 'exit_code': result.returncode,
            'expected_exit_code': expected_exit,
            'status': 'passed' if result.returncode == expected_exit else 'failed',
            'elapsed_s': round(time.time() - started, 3), 'log': str(log_path)})
        write_report()
        print(records[-1]['status'].upper(), name, flush=True)
        return result.returncode == expected_exit

    def write_report(complete=False):
        if not revision.exists():
            return
        assert all(digest(Path(path)) == sha for path, sha in hashes.items()), 'Canonical B04 changed'
        successful = records and all(row['status'] in ('passed', 'reused') for row in records)
        (revision / 'gate-report.json').write_text(json.dumps({
            'status': ('passed' if complete else 'running') if successful else 'failed',
            'complete': complete,
            'checks': records, 'canonical_hashes': hashes, 'canonical_unchanged': True,
            'scope': 'Isolated technical gates only; no canonical promotion or final art acceptance.',
        }, indent=2) + '\n')

    if args.target_source or args.left_patch_source:
        builder = 'repair_catalog_b04_left_patch_attachment.py' if args.left_patch_source else 'repair_catalog_b04_target_attachment.py'
        verifier = 'verify_catalog_b04_left_patch_preservation.py' if args.left_patch_source else 'verify_catalog_b04_target_preservation.py'
        if not gate('target-construction', blender(builder, '--output-dir', revision)):
            return 1
        if not gate('source-preservation', blender(verifier, '--revision', revision)):
            return 1
        if not gate('canonical-side-rejection', blender('verify_catalog_corrective_sides.py', '--blend', canonical,
            '--report', revision / 'canonical-side-report.json', '--require-clear'), expected_exit=1):
            return 1
        canonical_side = json.loads((revision / 'canonical-side-report.json').read_text())
        # The fresh original rejection must be the audited contamination, not a process failure.
        assert canonical_side.get('status') == 'failed', 'Canonical rejection report missing'
        right = next(row for row in canonical_side['checks'][0]['keys']
                     if row['object'] == 'B04_ivory_trousers' and row['key'] == 'knee_clearance_Right')
        assert right['opposite_vertices_moved'] == 263, 'Canonical rejection differs from audited contamination'
        if not gate('independent-corrective-sides', blender('verify_catalog_corrective_sides.py', '--blend', revision / 'B04.blend',
            '--report', revision / 'corrective-side-report.json', '--require-clear')):
            return 1
    elif args.existing_source:
        repair = json.loads((revision / 'detail-repair-report.json').read_text())
        assert repair['blend_sha256'] == digest(revision / 'B04.blend')
        if not gate('source-preservation', blender('verify_catalog_b04_detail_preservation.py', '--revision', revision)):
            return 1
        if not gate('independent-corrective-sides', blender('verify_catalog_corrective_sides.py', '--blend', revision / 'B04.blend', '--report', revision / 'corrective-side-report.json', '--require-clear')):
            return 1
    elif args.skip_regression:
        regression = json.loads((revision / 'regression-report.json').read_text())
        repair = json.loads((revision / 'repair-report.json').read_text())
        assert regression['status'] == 'passed' and repair['blend_sha256'] == digest(revision / 'B04.blend')
        assert hashes == regression['canonical_hashes']
        records.append({'gate': 'side-regression', 'status': 'reused', 'report': str(revision / 'regression-report.json')})
    elif not gate('side-regression', [sys.executable, 'tools/avatar/verify_catalog_b04_repair_regression.py',
        '--revision', str(revision), '--output-dir', str(artifacts / 'regression')]):
        return 1
    if args.regression_only:
        write_report(complete=True)
        return 0
    source = revision / 'B04.blend'
    common = ['--body', 'body_underlayer_male,H01_head', '--substeps', '4', '--require-clear']
    gate('independent-motion', blender('review_catalog_motion.py', '--blend', source,
        '--garment', 'B04_ivory_trousers', *common, '--target-z', '.53', '--ortho-scale', '1.2',
        '--output-dir', revision, '--review-dir', artifacts / 'independent'))
    detail_args = ['--blend', source, '--garment', 'B04_ivory_trousers',
        '--surface-material', 'A ivory tapered trouser fabric', '--surface-material', 'A ivory tapered trouser trim',
        '--detail-material', 'A ivory tapered trouser pockets and seams',
        '--detail-material', 'A navy tapered trouser button', '--threshold', '.012']
    gate('detail-distance', blender('verify_catalog_details.py', *detail_args, '--report', revision / 'detail-fit-report.json'))
    if not gate('detail-own-shell', blender('verify_catalog_details.py', *detail_args, '--require-detail-clear',
        '--report', revision / 'detail-own-shell-report.json')):
        original_details = list(detail_args)
        original_details[1] = canonical
        gate('canonical-detail-own-shell-diagnosis', blender('verify_catalog_details.py', *original_details,
            '--require-detail-clear', '--report', revision / 'before-detail-own-shell-report.json'))
    staged = revision / 'staged-catalog'
    staged.mkdir(exist_ok=True)
    for piece in ('B04', 'T01', 'F01', 'T04', 'F03', 'A01'):
        target = revision if piece == 'B04' else Path('assets/avatar/catalog-a') / piece
        link = staged / piece
        if not link.exists():
            link.symlink_to(os.path.relpath(target.resolve(), staged.resolve()), target_is_directory=True)
        assert link.resolve() == target.resolve(), 'Unexpected staged source'
    for outfit_id, pieces, garment_names in (
        ('T01-B04-F01-A01', 'T01,B04,F01,A01', 'T01_crew_tee_outfit,B04_ivory_trousers_outfit,F01_strap_sneakers_outfit,A01_baseball_cap_outfit'),
        ('T04-B04-F03-A01', 'T04,B04,F03,A01', 'T04_zip_hoodie_outfit,B04_ivory_trousers_outfit,F03_high_tops_outfit,A01_baseball_cap_outfit'),
    ):
        outfit = revision / 'outfits' / outfit_id
        review = artifacts / outfit_id
        if not gate(outfit_id + '-assembly', blender('assemble_catalog_outfit.py', '--foundation',
            'assets/avatar/catalog-a/foundation/catalog-body.blend', '--catalog-dir', staged,
            '--pieces', pieces, '--output-dir', outfit, '--review-dir', review)):
            continue
        side = []
        for piece in pieces.split(','):
            side += ['--blend', staged / piece / (piece + '.blend')]
        gate(outfit_id + '-sides', blender('verify_catalog_corrective_sides.py', *side,
            '--blend', outfit / 'outfit.blend', '--report', outfit / 'corrective-side-report.json', '--require-clear'))
        gate(outfit_id + '-motion', blender('review_catalog_motion.py', '--blend', outfit / 'outfit.blend',
            '--garment', garment_names, *common, '--target-z', '.92', '--ortho-scale', '2.10',
            '--output-dir', outfit, '--review-dir', review))
        gate(outfit_id + '-export', blender('verify_catalog_outfit_export.py', '--blend', outfit / 'outfit.blend',
            '--glb', outfit / 'outfit.glb', '--report', outfit / 'export-deformation-report.json'))
        gate(outfit_id + '-runtime', ['node', '--import', 'tsx', 'tools/avatar/verify_catalog_correctives.ts',
            '--outfit=' + outfit_id, '--outfit-dir=' + str(outfit)])
        gate(outfit_id + '-cap', blender('verify_catalog_attachment.py', '--blend', outfit / 'outfit.blend',
            '--object', 'A01_baseball_cap_outfit', '--bone', 'Head', '--obstacles',
            'body_underlayer_male,H01_head,' + ','.join(garment_names.split(',')[:-1]),
            '--report', outfit / 'cap-attachment-report.json'))
        gate(outfit_id + '-materials', ['node', 'tools/blender/catalog/verify_exported_materials.mjs',
            str(outfit / 'outfit.glb'), str(outfit / 'material-export-report.json')])
        for name in ('body.glb', 'garments.glb', 'outfit.glb'):
            gate(outfit_id + '-validate-' + name, ['node', 'tools/avatar/validate_gltf.js', str(outfit / name)])
        if args.preview_url:
            gate(outfit_id + '-browser', ['node', 'tools/avatar/verify_catalog_preview.mjs', '--outfit=' + outfit_id,
                '--outfit-dir=' + str(outfit), '--output-dir=' + str(review / 'browser'),
                '--preview-url=' + args.preview_url, '--production'])
    for name in ('B04.glb', 'body-B04.glb'):
        gate('validate-' + name, ['node', 'tools/avatar/validate_gltf.js', str(revision / name)])
    write_report(complete=True)
    return 0 if all(row['status'] in ('passed', 'reused') for row in records) else 1


if __name__ == '__main__':
    sys.exit(main())
