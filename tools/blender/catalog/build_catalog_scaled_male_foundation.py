"""Male fitting foundation with the verified +30% painted head; sources stay unchanged.

Opens the canonical catalog body (rig, body, gaits), replaces the original H01
head with the head from a verified head-scale study, and saves `foundation.blend`
in that study folder. Outfit assembly (assemble_catalog_outfit.py --foundation)
then fits canonical male masters against the larger head.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature

BODY = Path('assets/avatar/catalog-a/foundation/catalog-body.blend')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--head-study', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    study = json.loads((args.head_study / 'study-report.json').read_text())
    if json.loads((args.head_study / 'verification-report.json').read_text())['status'] != 'passed':
        raise RuntimeError('Use a verified head-scale study')
    head_blend = args.head_study / 'H01.blend'
    sources = {str(p): digest(p) for p in (BODY, head_blend, args.head_study / 'verification-report.json')}

    bpy.ops.wm.open_mainfile(filepath=str(BODY.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    body = bpy.data.objects['body_underlayer_male']
    rig_before, motion_before, body_before = rig_signature(arm), motion_signature(), geometry_signature(body)
    bpy.data.objects.remove(bpy.data.objects['H01_head'], do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    with bpy.data.libraries.load(str(head_blend.resolve()), link=False) as (source, data):
        data.objects = ['H01_head']
    head = data.objects[0]
    bpy.context.collection.objects.link(head)
    for modifier in head.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = arm
    head.parent = arm
    bpy.context.view_layer.update()
    assert geometry_signature(head) == study['scaled_head_geometry']['H01_head'], 'Head differs from the verified study'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before and geometry_signature(body) == body_before
    assert [o.name for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('H01')] == ['H01_head']
    output = args.head_study / 'foundation.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
    report = {'stage': 'Male fitting foundation with the verified +30% painted head',
              'sources': sources, 'builder_sha256': digest(__file__),
              'invariants': {'rig': rig_before, 'motion': motion_before, 'body_geometry': body_before,
                             'head_geometry': study['scaled_head_geometry']['H01_head']},
              'foundation': {str(output): digest(output)}}
    (args.head_study / 'foundation-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('SCALED_MALE_FOUNDATION', json.dumps(report['foundation']))


if __name__ == '__main__':
    main()
