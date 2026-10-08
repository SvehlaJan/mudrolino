"""Repair only the audited Right detail morph targets, preserving construction."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_corrective_sides import REVISION, OBJECT, signature, normalized, digest
from build_catalog_t01 import export, reset, world_mesh
from b04_target_repair_plan import plan_targets
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot

SOURCE = REVISION / 'detail-clearance-study/second-bound/B04.blend'
SOURCE_SHA = 'a9bbea9c54e60db48aade007cbe56e40a6fe2d56b75f0cfe222bc2ca41c16306'
HOST_SHA = 'b472ea595124968bbad2ad0f0b8ab35581b2b829fe5b7302ae916266c1014055'
TOOLS = [Path('tools/blender/catalog') / name for name in (
    'repair_catalog_b04_target_attachment.py', 'verify_catalog_b04_target_preservation.py',
    'b04_target_repair_plan.py', 'repair_catalog_b04_corrective_sides.py',
    'repair_catalog_f02_corrective_sides.py', 'build_catalog_t01.py', 'diagnose_catalog_b04_own_shell.py')]
DIAGNOSTICS = {
    'own-shell-diagnosis.json': 'd0a91f1142f99a70cd347b0721a4ad0a7f874d45f1c35a1fdd0b26b6e23fc3e6',
    'normal-corrective-counterfactual.json': '641e37d849f4ae1bb3dc4e8418ee03da17c057c06e7457ae23bee5b8340b4c79',
    'attachment-deformation-diagnosis.json': '5fe1307b8e0b23f7ae8ef4c888aeb579334b8ccf2739bd060ca5c5238d4275e7',
}


def used_tool_snapshot():
    directory = Path('tools/blender/catalog')
    tools = local_dependencies(directory, [path.name for path in TOOLS])
    tools.update(snapshot_files(Path('tools/avatar') / name for name in
        ('run_catalog_b04_repair.py', 'blender_cli.py', 'blender_queue.py')))
    return tools


def expected_signature(before, changes):
    expected = normalized(before)
    for row in changes:
        expected['meshes'][OBJECT]['keys']['knee_clearance_Right'][row['vertex']] = row['after']
    return expected


def compare_targets(expected, after, changes):
    expected, after = normalized(expected), normalized(after)
    original = expected['meshes'][OBJECT]['keys']['knee_clearance_Right']
    current = after['meshes'][OBJECT]['keys']['knee_clearance_Right']
    changed = {row['vertex'] for row in changes}
    assert len(original) == len(current)
    maximum = 0
    for index, (p, q) in enumerate(zip(original, current)):
        if index in changed:
            maximum = max(maximum, max(abs(x-y) for x, y in zip(p, q)))
        else:
            assert p == q, 'Unaffected Right target changed'
    assert maximum < 1e-7, ('Target serialization exceeds allowance', maximum)
    after['meshes'][OBJECT]['keys']['knee_clearance_Right'] = original
    assert expected == after, 'Basis, topology, weights, bind, drivers, gait or another invariant changed'
    return maximum


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=REVISION / 'target-only-2026-10-07')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert args.output_dir.resolve().is_relative_to(REVISION.resolve())
    assert not args.output_dir.exists(), 'Preserve existing evidence; choose a fresh revision directory'
    tool_snapshot = used_tool_snapshot()
    assert digest(SOURCE) == SOURCE_SHA and digest(REVISION / 'B04.blend') == HOST_SHA
    diagnosis_paths = {str(SOURCE.parent / name): sha for name, sha in DIAGNOSTICS.items()}
    assert all(digest(Path(path)) == sha for path, sha in diagnosis_paths.items())
    second_report = json.loads((SOURCE.parent / 'detail-repair-report.json').read_text())
    assert second_report['blend_sha256'] == SOURCE_SHA
    canonical = second_report['canonical_hashes']
    assert all(digest(Path(path)) == sha for path, sha in canonical.items())
    protected_paths = [p for p in REVISION.rglob('*') if p.is_file() and not p.is_symlink()
                       and p.suffix in ('.blend', '.glb', '.json') and 'staged-catalog' not in p.parts]
    protected = {str(path): digest(path) for path in protected_paths}
    protected.update(canonical)
    diagnosis = json.loads((SOURCE.parent / 'own-shell-diagnosis.json').read_text())
    components = [row for row in diagnosis['components'] if row['component'] in (0, 4)]
    # Attach to the original cloth surface, before the preserved uniform shifts.
    bpy.ops.wm.open_mainfile(filepath=str((REVISION / 'B04.blend').resolve()))
    obj = bpy.data.objects[OBJECT]
    reset(bpy.data.objects['Armature_Catalog'])
    obj.data.calc_loop_triangles()
    rest = [v.co.copy() for v in obj.data.vertices]
    host_key = [point.co-rest[i] for i, point in enumerate(obj.data.shape_keys.key_blocks['knee_clearance_Right'].data)]
    weights = [{obj.vertex_groups[w.group].name: w.weight for w in v.groups} for v in obj.data.vertices]
    shell = {p.index for p in obj.data.polygons if obj.data.materials[p.material_index].name
             in ('A ivory tapered trouser fabric', 'A ivory tapered trouser trim')}
    triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if t.polygon_index in shell]
    tree = BVHTree.FromPolygons(rest, triangles, all_triangles=True)
    attachments = {}
    for component in components:
        for index in component['vertices']:
            point, normal, triangle, distance = tree.find_nearest(rest[index])
            ids = triangles[triangle]
            a, b, c = [rest[i] for i in ids]
            factors = [max(0, min(1, f)) for f in barycentric_transform(point, a, b, c,
                Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))]
            total = sum(factors)
            factors = [f/total for f in factors]
            delta = sum((host_key[i]*f for i, f in zip(ids, factors)), Vector())
            attachments[index] = {'triangle': ids, 'factors': factors, 'host_delta': list(delta),
                                  'rest_distance_m': distance}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj, arm = bpy.data.objects[OBJECT], bpy.data.objects['Armature_Catalog']
    before = signature()
    keys = obj.data.shape_keys.key_blocks
    basis = [list(p.co) for p in keys['Basis'].data]
    right = [list(p.co) for p in keys['knee_clearance_Right'].data]
    reset(arm)
    action = bpy.data.actions['run']
    arm.animation_data.action = action
    arm.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(9, subframe=.5)
    bpy.context.view_layer.update()
    points, _ = world_mesh(obj)
    fit_value = keys['knee_clearance_Right'].value
    assert .94 < fit_value < .96, 'Changed diagnostic pose/driver'
    front_deltas = {}
    for index in components[0]['vertices']:
        assert components[0]['component'] == 0
        a, b, c = [points[i] for i in attachments[index]['triangle']]
        normal = (b-a).cross(c-a).normalized()
        blend = Matrix(((0, 0, 0, 0),)*4)
        for name, weight in weights[index].items():
            blend += (arm.matrix_world @ arm.pose.bones[name].matrix @
                      arm.data.bones[name].matrix_local.inverted() @ arm.matrix_world.inverted())*weight
        front_deltas[index] = list((blend.to_3x3().inverted() @ normal)*(.0004/fit_value))
    host_deltas = {i: attachments[i]['host_delta'] for row in components if row['component'] == 4 for i in row['vertices']}
    plan = plan_targets(basis, right, components, front_deltas, host_deltas)
    reset(arm)
    for row in plan['changes']:
        keys['knee_clearance_Right'].data[row['vertex']].co = row['after']
    serialization_error = compare_targets(expected_signature(before, plan['changes']), signature(), plan['changes'])
    assert_snapshot(tool_snapshot)
    args.output_dir.mkdir(parents=True)
    bpy.context.preferences.filepaths.save_version = 0
    output = args.output_dir / 'B04.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
    report = {'status': 'target-only attachment revision; full fitting gates pending', 'blender': bpy.app.version_string,
        'source': str(SOURCE), 'source_sha256': SOURCE_SHA, 'host_source_sha256': HOST_SHA,
        'blend': str(output), 'blend_sha256': digest(output), 'canonical_hashes': canonical,
        'protected_hashes': protected, 'diagnostic_hashes': diagnosis_paths,
        'tool_hashes': tool_snapshot, 'tool_snapshot_before_source_open': True,
        'changed_key': 'knee_clearance_Right', 'changes': plan['changes'],
        'eligible_vertices': plan['eligible_vertices'], 'components': components,
        'attachments': attachments, 'front_deltas': front_deltas, 'host_deltas': host_deltas,
        'fit_motion': 'run', 'fit_frame': 9.5, 'fit_right_value': fit_value, 'posed_normal_lift_m': .0004,
        'front_max_change_m': max(row['change_m'] for row in plan['changes'] if row['component'] == 0),
        'patch_max_change_m': max(row['change_m'] for row in plan['changes'] if row['component'] == 4),
        'preserved_fields': list(before), 'max_coordinate_serialization_error_m': serialization_error,
        'scope': 'Only existing Right key targets on two anatomical-right details. Basis/rest, cloth/body, Left key, all other targets, topology, weights, bind, drivers, gaits and materials unchanged.'}
    (args.output_dir / 'target-repair-report.json').write_text(json.dumps(report, indent=2)+'\n')
    body = bpy.data.objects['body_underlayer_male']
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj, body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('body_underlayer_male_B04', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export(args.output_dir / 'B04.glb', [arm, obj])
    export(args.output_dir / 'body-B04.glb', [arm, masked, *parts])
    assert_snapshot(tool_snapshot)
    assert all(digest(Path(path)) == sha for path, sha in protected.items())
    report['tool_snapshot_guarded_through_completion'] = True
    (args.output_dir / 'target-repair-report.json').write_text(json.dumps(report, indent=2)+'\n')
    print('B04_TARGET_REPAIR', json.dumps({key: report[key] for key in ('blend_sha256', 'front_max_change_m', 'patch_max_change_m', 'max_coordinate_serialization_error_m')}))


if __name__ == '__main__':
    main()
