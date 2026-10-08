"""Save and reopen an exact audited B03 side-only repair; fitting stays pending."""
import argparse
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b04_corrective_repair_plan import plan_repair
from repair_catalog_b04_corrective_sides import digest, normalized, signature
from build_catalog_t01 import export, reset

SOURCE = Path('assets/avatar/catalog-a/B03/B03.blend')
SOURCE_SHA = '52d3747d4497dbcdf993f218462c26b0cf0facc3892515e0a5ade7eef16d47f4'
REVISION = Path('assets/avatar/catalog-a/B03/fitting-revisions/independent-keys-repair')
OBJECT = 'B03_casual_shorts'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=REVISION)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    destination = args.output_dir
    assert destination.resolve().is_relative_to(REVISION.resolve()), 'Use the isolated B03 revision'
    assert not destination.exists(), 'Preserve prior revision evidence'
    assert digest(SOURCE) == SOURCE_SHA, 'Re-audit a changed canonical B03'
    protected = [SOURCE, SOURCE.with_suffix('.glb'), SOURCE.with_name('body-B03.glb')]
    hashes = {str(path): digest(path) for path in protected}
    tool_names = ['repair_catalog_b03_corrective_sides.py', 'b04_corrective_repair_plan.py',
                  'repair_catalog_b04_corrective_sides.py', 'repair_catalog_f02_corrective_sides.py',
                  'build_catalog_t01.py', 'prepare_catalog_body.py']
    tools = {str(Path('tools/blender/catalog') / name): digest(Path('tools/blender/catalog') / name)
             for name in tool_names}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    before = normalized(signature())
    keys = bpy.data.objects[OBJECT].data.shape_keys.key_blocks
    plan = plan_repair(*[[list(point.co) for point in keys[name].data]
                         for name in ('Basis', 'knee_clearance_Left', 'knee_clearance_Right')],
                       expected_count=518, expected_intended_count=504,
                       expected_max_delta=0.2884874294044722)
    expected = normalized(before)
    for change in plan['changes']:
        keys['knee_clearance_Right'].data[change['index']].co = change['after']
        expected['meshes'][OBJECT]['keys']['knee_clearance_Right'][change['index']] = change['after']
    assert normalized(signature()) == expected, 'Unexpected source field changed'
    destination.mkdir(parents=True)
    saved = destination / 'B03.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(saved.resolve()))
    bpy.ops.wm.open_mainfile(filepath=str(saved.resolve()))
    after = normalized(signature())
    checks = {name: expected[name] == after[name] for name in expected}
    assert all(checks.values()), checks
    report = {'status': 'side-only repaired; body/layer/detail/export fitting and art pending',
              'blender': bpy.app.version_string, 'source': str(SOURCE), 'source_sha256': SOURCE_SHA,
              'blend': str(saved), 'blend_sha256': digest(saved), 'canonical_hashes': hashes,
              'tool_hashes': tools, 'changed_key': 'knee_clearance_Right',
              'changed_vertices': plan['changes'], 'intended_right_vertices_preserved': plan['intended'],
              'max_removed_opposite_delta_m': plan['max_removed_opposite_delta_m'],
              'preservation_checks': checks, 'reopened_saved_source': True, 'tolerance_m': 1e-7}
    (destination / 'repair-report.json').write_text(json.dumps(report, indent=2) + '\n')
    arm, body, garment = (bpy.data.objects[name] for name in ('Armature_Catalog', 'body_underlayer_male', OBJECT))
    reset(arm)
    parts = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj not in (garment, body)]
    mesh = bpy.data.meshes.new_from_object(body.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    masked = bpy.data.objects.new('body_underlayer_male_B03', mesh)
    bpy.context.collection.objects.link(masked)
    assert [group.name for group in masked.vertex_groups] == [group.name for group in body.vertex_groups]
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export(destination / 'B03.glb', [arm, garment])
    export(destination / 'body-B03.glb', [arm, masked, *parts])
    assert all(digest(Path(path)) == sha for path, sha in hashes.items()), 'Canonical B03 assets changed'
    assert all(digest(Path(path)) == sha for path, sha in tools.items()), 'Construction tools changed during run'
    print('B03_SIDE_REPAIR', json.dumps({'blend_sha256': report['blend_sha256'],
          'changed_coordinates': len(plan['changes']), 'preservation_checks': checks}))


if __name__ == '__main__':
    main()
