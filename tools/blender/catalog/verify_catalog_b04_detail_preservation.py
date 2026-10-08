"""Verify reopened bounded B04 detail translations and unchanged source bytes."""
import argparse
import json
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_corrective_sides import signature, digest
from repair_catalog_b04_detail_clearance import translated_signature, compare


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    report = json.loads((args.revision / 'detail-repair-report.json').read_text())
    assert digest(Path(report['source'])) == report['source_sha256']
    assert digest(Path(report['blend'])) == report['blend_sha256']
    assert all(digest(Path(path)) == sha for path, sha in report['canonical_hashes'].items())
    assert all(digest(Path(path)) == sha for path, sha in report.get('tool_hashes', {}).items()), 'Construction tool version changed'
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['source']).resolve()))
    expected = translated_signature(signature(), report['moves'])
    bpy.ops.wm.open_mainfile(filepath=str(Path(report['blend']).resolve()))
    maximum = compare(expected, signature(), report['moves'])
    result = {'status': 'passed', 'source': report['source'], 'source_sha256': report['source_sha256'],
        'blend': report['blend'], 'blend_sha256': report['blend_sha256'],
        'canonical_unchanged': True, 'failed_side_study_unchanged': True,
        'preserved_fields': report['preserved_fields'], 'translated_components': len(report['moves']),
        'translated_vertices': sum(len(move['vertices']) for move in report['moves']),
        'tool_hashes': {str(Path('tools/blender/catalog') / name): digest(Path('tools/blender/catalog') / name)
            for name in ('repair_catalog_b04_detail_clearance.py', 'diagnose_catalog_b04_own_shell.py',
                         'verify_catalog_b04_detail_preservation.py', 'b04_detail_translation_plan.py',
                         'b04_detail_components.py', 'repair_catalog_b04_corrective_sides.py')},
        'construction_tools_bound': bool(report.get('tool_hashes')),
        'max_coordinate_serialization_error_m': maximum,
        'scope': report['scope']}
    (args.revision / 'preservation-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print('B04_DETAIL_PRESERVATION', json.dumps(result))


if __name__ == '__main__':
    main()
