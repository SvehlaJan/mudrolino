"""Repair only the existing Left back-patch target after a non-saving full screen."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_corrective_sides import REVISION, OBJECT, signature, normalized, digest
from build_catalog_t01 import export, reset, world_mesh
from b04_left_patch_repair_plan import plan_left_patch

SOURCE = REVISION / 'target-only-2026-10-07/B04.blend'
SOURCE_SHA = 'a307ae27954787bd6b8ebc9d9242c6c44bef1a933275b6b2d6932e621e4bd395'
HOST_SHA = 'b472ea595124968bbad2ad0f0b8ab35581b2b829fe5b7302ae916266c1014055'
TOOLS = [Path('tools/blender/catalog') / name for name in (
    'repair_catalog_b04_left_patch_attachment.py', 'verify_catalog_b04_left_patch_preservation.py',
    'b04_left_patch_repair_plan.py', 'b04_target_repair_plan.py', 'repair_catalog_b04_corrective_sides.py',
    'repair_catalog_f02_corrective_sides.py', 'build_catalog_t01.py', 'diagnose_catalog_b04_own_shell.py')]
TOOLS += [Path('tools/avatar/run_catalog_b04_repair.py')]
SHELL = ['A ivory tapered trouser fabric', 'A ivory tapered trouser trim']
DETAILS = ['A ivory tapered trouser pockets and seams', 'A navy tapered trouser button']


def expected_signature(before, changes):
    expected = normalized(before)
    for row in changes:
        expected['meshes'][OBJECT]['keys']['knee_clearance_Left'][row['vertex']] = row['after']
    return expected


def compare_targets(expected, after, changes):
    expected, after = normalized(expected), normalized(after)
    original = expected['meshes'][OBJECT]['keys']['knee_clearance_Left']
    current = after['meshes'][OBJECT]['keys']['knee_clearance_Left']
    changed = {row['vertex'] for row in changes}
    assert len(original) == len(current)
    maximum = 0
    for index, (p, q) in enumerate(zip(original, current)):
        if index in changed:
            maximum = max(maximum, max(abs(x-y) for x, y in zip(p, q)))
        else:
            assert p == q, 'Unaffected Left target changed'
    assert maximum < 1e-7, ('Target serialization exceeds allowance', maximum)
    after['meshes'][OBJECT]['keys']['knee_clearance_Left'] = original
    assert expected == after, 'Basis, Right targets, topology, weights, bind, drivers, gait or another invariant changed'
    return maximum


def screen_details(obj, arm):
    """Match the strict verifier's 164 native poses, distances and polygon overlap."""
    assert all(mod.type == 'ARMATURE' for mod in obj.modifiers)
    assert set(SHELL+DETAILS) <= {m.name for m in obj.data.materials}
    cloth = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
    ids = {name: sorted({i for p in obj.data.polygons if obj.data.materials[p.material_index].name == name for i in p.vertices}) for name in DETAILS}
    faces = {name: [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == name] for name in DETAILS}
    records = []
    for motion in ('rest', 'walk', 'run'):
        reset(arm)
        if motion == 'rest':
            frames = [0]
        else:
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            start, end = map(float, action.frame_range)
            frames = sorted({round(start, 5), round(end, 5)} | {i/4 for i in range(math.ceil(start*4), math.floor(end*4)+1)})
        for frame in frames:
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame))
            bpy.context.view_layer.update()
            points, _ = world_mesh(obj)
            tree = BVHTree.FromPolygons(points, cloth)
            records.append({'motion': motion, 'frame': frame,
                'max_cloth_distance_m': {name: max(tree.find_nearest(points[i])[3] for i in vertices) for name, vertices in ids.items()},
                'detail_shell_pairs': {name: len(tree.overlap(BVHTree.FromPolygons(points, polygons))) for name, polygons in faces.items()}})
    maximum = max(v for row in records for v in row['max_cloth_distance_m'].values())
    pairs = max(v for row in records for v in row['detail_shell_pairs'].values())
    assert len(records) == 164, 'Full native screen pose inventory changed'
    return {'status': 'passed' if maximum < .012 and pairs == 0 else 'failed', 'samples': len(records),
        'threshold_m': .012, 'max_cloth_distance_m': maximum, 'max_detail_shell_pairs': pairs,
        'require_detail_clear': True, 'attachment_roles': None, 'checks': records,
        'scope': 'Native non-saving screen before any source/export save. Original full-cycle own-shell and distance limits; does not establish body/export/runtime acceptance.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=REVISION / 'bilateral-targets-2026-10-07')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert args.output_dir.resolve().is_relative_to(REVISION.resolve())
    assert not args.output_dir.exists(), 'Preserve existing evidence; choose a fresh revision directory'
    assert digest(SOURCE) == SOURCE_SHA and digest(REVISION / 'B04.blend') == HOST_SHA
    predecessor = json.loads((SOURCE.parent / 'target-repair-report.json').read_text())
    assert predecessor['blend_sha256'] == SOURCE_SHA
    counterfactual = json.loads((SOURCE.parent / 'left-patch-counterfactual-screen.json').read_text())
    assert counterfactual['sources'][str(SOURCE)] == SOURCE_SHA and counterfactual['samples'] == 164
    assert counterfactual['max_detail_shell_pairs'] == 0 and counterfactual['max_cloth_distance_m'] < .012
    diagnosis = json.loads((SOURCE.parent / 'own-shell-diagnosis.json').read_text())
    assert diagnosis['blend_sha256'] == SOURCE_SHA
    component = next(row for row in diagnosis['components'] if row['component'] == 5)
    protected = {str(p): digest(p) for p in REVISION.rglob('*') if p.is_file() and not p.is_symlink()
                 and p.suffix in ('.blend', '.glb', '.json') and 'staged-catalog' not in p.parts}
    protected.update(predecessor['canonical_hashes'])
    bpy.ops.wm.open_mainfile(filepath=str((REVISION / 'B04.blend').resolve()))
    obj = bpy.data.objects[OBJECT]
    reset(bpy.data.objects['Armature_Catalog'])
    obj.data.calc_loop_triangles()
    rest = [v.co.copy() for v in obj.data.vertices]
    host_key = [p.co-rest[i] for i, p in enumerate(obj.data.shape_keys.key_blocks['knee_clearance_Left'].data)]
    shell = {p.index for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL}
    triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if t.polygon_index in shell]
    tree = BVHTree.FromPolygons(rest, triangles, all_triangles=True)
    attachments, host_deltas = {}, {}
    for index in component['vertices']:
        point, _, triangle, distance = tree.find_nearest(rest[index])
        ids = triangles[triangle]
        a, b, c = [rest[i] for i in ids]
        factors = [max(0, min(1, f)) for f in barycentric_transform(point, a, b, c,
            Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))]
        total = sum(factors)
        factors = [f/total for f in factors]
        host_deltas[index] = list(sum((host_key[i]*f for i, f in zip(ids, factors)), Vector()))
        attachments[index] = {'triangle': ids, 'factors': factors, 'rest_distance_m': distance}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj, arm = bpy.data.objects[OBJECT], bpy.data.objects['Armature_Catalog']
    before = signature()
    keys = obj.data.shape_keys.key_blocks
    plan = plan_left_patch([list(p.co) for p in keys['Basis'].data],
        [list(p.co) for p in keys['knee_clearance_Left'].data], component, host_deltas)
    for row in plan['changes']:
        keys['knee_clearance_Left'].data[row['vertex']].co = row['after']
    serialization_error = compare_targets(expected_signature(before, plan['changes']), signature(), plan['changes'])
    # The cheap screen runs before a .blend or GLB exists; preserve red screen evidence.
    screen = screen_details(obj, arm)
    screen.update({'source': str(SOURCE), 'source_sha256': SOURCE_SHA,
        'tool_hashes': {str(path): digest(path) for path in TOOLS}, 'eligible_vertices': len(plan['eligible_vertices']),
        'changed_vertices': len(plan['changes']), 'max_target_change_m': max(row['change_m'] for row in plan['changes'])})
    args.output_dir.mkdir(parents=True)
    screen_path = args.output_dir / 'pre-save-screen-report.json'
    screen_path.write_text(json.dumps(screen, indent=2)+'\n')
    assert screen['status'] == 'passed', ('Pre-save native screen failed; no source/export saved', screen['max_detail_shell_pairs'], screen['max_cloth_distance_m'])
    reset(arm)
    compare_targets(expected_signature(before, plan['changes']), signature(), plan['changes'])
    bpy.context.preferences.filepaths.save_version = 0
    output = args.output_dir / 'B04.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
    report = {'status': 'bounded Left patch target revision; full saved-source gates pending', 'blender': bpy.app.version_string,
        'source': str(SOURCE), 'source_sha256': SOURCE_SHA, 'host_source_sha256': HOST_SHA,
        'blend': str(output), 'blend_sha256': digest(output), 'canonical_hashes': predecessor['canonical_hashes'],
        'protected_hashes': protected, 'tool_hashes': {str(path): digest(path) for path in TOOLS},
        'diagnostic_hashes': {str(SOURCE.parent / name): digest(SOURCE.parent / name) for name in ('own-shell-diagnosis.json', 'left-patch-counterfactual-screen.json')},
        'pre_save_screen': str(screen_path), 'pre_save_screen_sha256': digest(screen_path),
        'changed_key': 'knee_clearance_Left', 'changes': plan['changes'], 'eligible_vertices': plan['eligible_vertices'],
        'component': component, 'host_deltas': host_deltas, 'attachments': attachments,
        'max_target_change_m': max(row['change_m'] for row in plan['changes']), 'preserved_fields': list(before),
        'max_coordinate_serialization_error_m': serialization_error,
        'scope': 'Only existing Left key targets on anatomical-left back patch component5. Basis/rest/body/cloth, all Right and unaffected Left targets, topology, weights, bind, drivers, gaits and materials unchanged; no roles or limits changed.'}
    (args.output_dir / 'left-patch-repair-report.json').write_text(json.dumps(report, indent=2)+'\n')
    body = bpy.data.objects['body_underlayer_male']
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj, body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('body_underlayer_male_B04', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups] == [g.name for g in body.vertex_groups]
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export(args.output_dir / 'B04.glb', [arm, obj])
    export(args.output_dir / 'body-B04.glb', [arm, masked, *parts])
    assert all(digest(Path(path)) == sha for path, sha in protected.items())
    print('B04_LEFT_PATCH_REPAIR', json.dumps({key: report[key] for key in ('blend_sha256', 'max_target_change_m', 'max_coordinate_serialization_error_m')}))


if __name__ == '__main__':
    main()
