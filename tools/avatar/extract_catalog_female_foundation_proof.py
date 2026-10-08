"""Derive H02 focused reports from validated comprehensive proof, preserving history.

This command never runs Blender and never claims an independent verification pass.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERIFIER = ROOT / 'tools/blender/catalog/verify_catalog_female_foundation_study.py'
BUILDER = ROOT / 'tools/blender/catalog/build_catalog_female_foundation_study.py'
REPORTS = {'hair-clearance-report.json': 'hair_clearance',
           'export-deformation-report.json': 'export_deformation',
           'face-transport-report.json': 'face_transport'}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validated_report(study_dir):
    study_dir = Path(study_dir).resolve()
    comprehensive = study_dir / 'foundation-verification-report.json'
    report = json.loads(comprehensive.read_text())
    require(report['status'] == 'passed' and report['failures'] == [], 'Comprehensive proof failed')
    dependencies = {}

    def bind(path, expected):
        path = Path(path).resolve()
        actual = digest(path)
        require(actual == expected, f'Stale dependency: {path}')
        require(str(path) not in dependencies or dependencies[str(path)] == actual, f'Conflicting dependency: {path}')
        dependencies[str(path)] = actual

    for field, filename, hash_field in [('source_blend', 'female-foundation.blend', 'source_sha256'), ('glb', 'female-foundation.glb', 'glb_sha256')]:
        require(Path(report[field]).resolve() == study_dir / filename, f'Unexpected {field}')
        bind(study_dir / filename, report[hash_field])
    bind(VERIFIER, report['verifier_sha256'])
    saved = json.loads((study_dir / 'study-report.json').read_text())
    bind(saved['source'], saved['source_sha256'])
    bind(BUILDER, saved['builder_sha256'])
    for filename in ['female-foundation.glb', 'H02.glb', 'hair-H02.glb']:
        bind(study_dir / filename, saved['exports'][filename])
    bind(study_dir / 'sample-face.png', saved['face_image_sha256'])
    if saved.get('face_image_source'):
        bind(saved['face_image_source'], saved['face_image_sha256'])
    face = report['face_transport']
    require(face['material'] == 'face_surface' and face['uv_layer'] == 'canonical_face_uv', 'Unexpected canonical face contract')
    bind(study_dir / 'canonical-face-layout.json', face['canonical_layout_sha256'])
    layout = json.loads((study_dir / 'canonical-face-layout.json').read_text())
    for name, hash_field in [('mask', 'mask_sha256'), ('diagnostic_image', 'image_sha256')]:
        path = (study_dir / layout[name]).resolve()
        require(path.parent == study_dir, f'Unexpected face {name} path')
        bind(path, layout[hash_field])
    bind(study_dir / 'sample-face.png', face['embedded_sha256'])
    require(face['embedded_image_matches_source_png'] and face['face_primitive_count'] > 0, 'Missing face image/UV proof')
    uv = face['reimport_uv_corner_identity']
    require(uv['passed'] and uv['imported_to_source']['unmatched_corners'] == 0 and uv['source_to_imported']['unmatched_corners'] == 0, 'UV correspondence failed')
    require(uv['position_tolerance_m'] == .00003 and uv['uv_tolerance'] == .000001, 'Unexpected UV proof tolerances')
    require(all(math.isfinite(uv[direction]['maximum_uv_error']) and
                0 <= uv[direction]['maximum_uv_error'] <= uv['uv_tolerance']
                for direction in ['imported_to_source', 'source_to_imported']), 'Incomplete or failed UV error proof')
    negative = face['negative_uv_permutation_probe']
    require(negative['uv_multiset_unchanged'] and negative['rejected'] and not negative['result']['passed'] and negative['restored_passed'], 'UV negative probe incomplete')

    hair = report['hair_clearance']
    rows = hair['checks']
    expected_motion = {(motion, frame) for motion, end in [('walk', 25.6), ('run', 16.0)]
                       for frame in {0.8, end, *[i / 4 for i in range(4, math.floor(end * 4) + 1)]}}
    motion_rows = [row for row in rows if 'motion' in row]
    gestures = [row for row in rows if 'pose' in row]
    require(hair['sample_count'] == len(rows) == 169 and hair['motion_samples'] == len(motion_rows) == 163 and hair['gesture_samples'] == len(gestures) == 6, 'Incomplete hair samples')
    require({(row['motion'], row['frame']) for row in motion_rows} == expected_motion, 'Incomplete hair gait endpoints/poses')
    require({row['pose'] for row in gestures} == {'rest', 'turn-left', 'turn-right', 'nod', 'look-up', 'tilt'}, 'Incomplete head gestures')
    require(hair['maximum_pairs'] == 0 and all(row['hair_body_pairs'] == 0 for row in rows), 'Hair contact failure')
    require(all(math.isfinite(row['attachment_error_m']) and 0 <= row['attachment_error_m'] < .00002 for row in gestures), 'Hair attachment failure')
    export = report['export_deformation']
    poses = [('rest', [0]), ('walk', [.8, 1, 6.25, 13, 19.5, 25.6]), ('run', [.8, 1, 5, 7.25, 8, 9.5, 12.75, 15.25, 16])]
    require(export['pose_count'] == len(export['checks']) == 16 and {(row['motion'], row['frame']) for row in export['checks']} == {(motion, frame) for motion, frames in poses for frame in frames}, 'Incomplete export poses')
    errors = [error for row in export['checks'] for error in row['max_error_m'].values()]
    require(all(set(row['max_error_m']) == {'body_underlayer_female', 'H02_head', 'H02_hair'} for row in export['checks']), 'Incomplete export meshes')
    require(export['threshold_m'] == report['threshold_m'] == .00003 and all(math.isfinite(error) and 0 <= error < .00003 for error in errors) and max(errors) == export['maximum_error_m'], 'Export fidelity failed')
    for filename in ['study-report.json', 'foundation-verification-report.json']:
        dependencies[str(study_dir / filename)] = digest(study_dir / filename)
    return report, dependencies


def extract_reports(study_dir, history_dir):
    study_dir, history_dir = Path(study_dir).resolve(), Path(history_dir).resolve()
    report, dependencies = validated_report(study_dir)
    require(history_dir != study_dir, 'History must differ from study')
    # Inspect every destination before any writes; existing history is immutable.
    for filename in REPORTS:
        current, old = study_dir / filename, history_dir / filename
        require(not current.is_symlink() and not old.is_symlink(), f'Symlink evidence destination: {filename}')
        require(not (current.exists() and old.exists() and current.samefile(old)), f'Historical evidence aliases current report: {filename}')
        require(not old.exists() or current.exists() and old.read_bytes() == current.read_bytes(), f'History already contains different bytes: {old}')
    header = {field: report[field] for field in ['source_blend', 'source_sha256', 'glb', 'glb_sha256', 'verifier_sha256', 'status']}
    header.update(report_origin='derived from existing comprehensive Blender verification; no independent rerun',
                  comprehensive_report='foundation-verification-report.json',
                  comprehensive_report_sha256=dependencies[str(study_dir / 'foundation-verification-report.json')],
                  extractor_sha256=digest(__file__), dependency_hashes=dependencies)
    history_dir.mkdir(parents=True, exist_ok=True)
    for filename, scope in REPORTS.items():
        current, old = study_dir / filename, history_dir / filename
        if current.exists() and not old.exists():
            shutil.copyfile(current, old)
        current.write_text(json.dumps({**header, scope: report[scope]}, indent=2) + '\n')
    return {'status': 'passed', 'proof_origin': header['report_origin'], 'comprehensive_report_sha256': header['comprehensive_report_sha256'], 'reports': list(REPORTS)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study-dir', type=Path, required=True)
    parser.add_argument('--history-dir', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(extract_reports(args.study_dir, args.history_dir), indent=2))


if __name__ == '__main__':
    main()
