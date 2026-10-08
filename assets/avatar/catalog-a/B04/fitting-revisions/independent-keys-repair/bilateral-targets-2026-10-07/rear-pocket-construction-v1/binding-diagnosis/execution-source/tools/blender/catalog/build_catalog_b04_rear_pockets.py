"""Change only the paired rear patches; screen complete motion before saving."""
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
from inspect_catalog_b04_pockets import SOURCE, SOURCE_SHA
from b04_rear_pocket_plan import plan_patch
from b04_rolled_cuff_plan import export_skin_weights
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from repair_catalog_b04_left_patch_attachment import SHELL, DETAILS
from build_catalog_t01 import reset, world_mesh, setup_render
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_measurement import schedule

ROOT = SOURCE.parent.parent.parent / 'rear-pocket-construction-v1'
INSPECTION = ROOT / 'inspection/pocket-inspection.json'
OBJECT = 'B04_ivory_trousers'


def apply_changes(obj, changes):
    for row in changes:
        i = row['vertex']
        obj.data.vertices[i].co = row['point']
        for name, point in row['keys'].items():
            obj.data.shape_keys.key_blocks[name].data[i].co = point
        for group in obj.vertex_groups:
            group.remove([i])
        for group, weight in row['weights']:
            obj.vertex_groups[group].add([i], weight, 'REPLACE')
    obj.data.update()


def assert_preserved(before, after, changes, tolerance=0):
    expected = normalized(before)
    mesh = expected['meshes'][OBJECT]
    actual = after['meshes'][OBJECT]
    error = 0
    for row in changes:
        i = row['vertex']
        error = max(error, max(abs(a-b) for a, b in zip(actual['vertices'][i], row['point'])))
        mesh['vertices'][i] = actual['vertices'][i]
        assert [w[0] for w in actual['weights'][i]] == [w[0] for w in row['weights']]
        error = max(error, max(abs(a[1]-b[1]) for a, b in zip(actual['weights'][i], row['weights'])))
        mesh['weights'][i] = actual['weights'][i]
        for name, point in row['keys'].items():
            error = max(error, max(abs(a-b) for a, b in zip(actual['keys'][name][i], point)))
            mesh['keys'][name][i] = actual['keys'][name][i]
    assert error <= tolerance, ('Pocket coordinate/skin serialization exceeded boundary', error)
    assert expected == after, 'Field outside the 484 patch vertices changed'
    return error


def construct(obj, inspection):
    rest = [v.co.copy() for v in obj.data.vertices]
    keys = {k.name: [v.co.copy() for v in k.data] for k in obj.data.shape_keys.key_blocks}
    assert set(keys) == {'Basis', 'knee_clearance_Left', 'knee_clearance_Right'}
    obj.data.calc_loop_triangles()
    triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if obj.data.materials[obj.data.polygons[t.polygon_index].material_index].name in SHELL]
    host = BVHTree.FromPolygons(rest, triangles, all_triangles=True)
    plans, changes = [], []
    for patch in inspection['patches']:
        for vertex in patch['vertices']:
            assert list(rest[vertex['index']]) == vertex['point'], 'Inspection is stale'
        plan = plan_patch(patch)
        plans.append(plan)
        for node in plan['nodes']:
            x, z = node['xz']
            hit, normal, face, distance = host.ray_cast(Vector((x, .45, z)), Vector((0, -1, 0)), 1)
            assert hit is not None and normal.y > .5, 'Patch must project to the rear cloth surface'
            ids = triangles[face]
            a, b, c = [rest[i] for i in ids]
            assert (b-a).cross(c-a).length > 1e-12
            factors = [max(0, min(1, f)) for f in barycentric_transform(hit, a, b, c, Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1)))]
            total = sum(factors); factors = [f / total for f in factors]
            weights = {}
            for i, factor in zip(ids, factors):
                for w in obj.data.vertices[i].groups:
                    weights[w.group] = weights.get(w.group, 0) + factor * w.weight
            weights = export_skin_weights(weights)
            # Pelvic cloth legitimately blends both upper legs near the centre.
            # Preserve its actual barycentric skin; independence applies to the
            # knee corrective deltas, not a fabricated unilateral skin rule.
            assert all(obj.vertex_groups[g].name in {'Hips', 'LeftUpLeg', 'RightUpLeg'} for g in weights), (
                'Inspect host skin', node, {obj.vertex_groups[g].name: w for g, w in weights.items()}, ids)
            deltas = {name: sum(((values[i]-keys['Basis'][i])*f for i, f in zip(ids, factors)), Vector()) for name, values in keys.items()}
            opposite = 'knee_clearance_' + ('Left' if plan['side'] == 'Right' else 'Right')
            host_opposite = list(deltas[opposite])
            deltas[opposite] = Vector()  # Retain the existing independent patch-key contract.
            for layer, offset in [('outer', .0026), ('inner', .0014)]:
                point = hit + normal * offset
                changes.append({'vertex': node[layer], 'side': plan['side'], 'layer': layer,
                    'grid': [node['row'], node['col']], 'point': list(point),
                    'keys': {name: list(point + delta) for name, delta in deltas.items()},
                    'weights': sorted(weights.items()), 'host_triangle': list(ids), 'barycentric': factors,
                    'host_point': list(hit), 'host_normal': list(normal), 'offset_m': offset,
                    'host_opposite_delta_m': host_opposite, 'opposite_key': opposite})
    assert len({r['vertex'] for r in changes}) == len(changes) == 484
    return plans, changes


def screen(obj, arm, body, shoes, gaits):
    faces = [tuple(f.vertices) for f in obj.data.polygons]
    cloth = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
    detail_faces = {name: [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == name] for name in DETAILS}
    detail_ids = {name: {i for face in fs for i in face} for name, fs in detail_faces.items()}
    patches = {r['vertex'] for r in screen.changes}
    patch_faces = {i for i, f in enumerate(faces) if set(f) <= patches}
    adapter = RuntimeGaitPose(SOURCE.with_suffix('.glb'), gaits, arm)
    records = []
    for mode in ('native', 'runtime-equivalent'):
        for row in schedule():
            motion, frame = row['motion'], row['frame']
            if mode == 'runtime-equivalent':
                adapter.apply(motion, frame, 24)
            else:
                reset(arm)
                if motion != 'rest':
                    action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
            points, _ = world_mesh(obj)
            tree = BVHTree.FromPolygons(points, faces)
            shell = BVHTree.FromPolygons(points, cloth)
            own_pairs = {name: shell.overlap(BVHTree.FromPolygons(points, fs)) for name, fs in detail_faces.items()}
            bp, bf = world_mesh(body)
            body_pairs = tree.overlap(BVHTree.FromPolygons(bp, bf))
            shoe_pairs = {}
            for name, shoe in shoes.items():
                sp, sf = world_mesh(shoe); shoe_pairs[name] = len(tree.overlap(BVHTree.FromPolygons(sp, sf)))
            patch_pairs = [(a,b) for a,b in tree.overlap(tree) if a < b and (a in patch_faces or b in patch_faces) and not set(faces[a]) & set(faces[b])]
            records.append({'domain': mode, **row, 'visible_body_pairs': len(body_pairs), 'shoe_layer_pairs': shoe_pairs,
                'detail_shell_pairs': {name: len(ps) for name, ps in own_pairs.items()},
                'max_cloth_distance_m': {name: max(shell.find_nearest(points[i])[3] for i in ids) for name, ids in detail_ids.items()},
                'nonincident_patch_self_pairs': len(patch_pairs),
                'patch_contact_faces': [{'a': a, 'b': b, 'a_vertices': list(faces[a]), 'b_vertices': list(faces[b]),
                    'a_posed': [list(points[i]) for i in faces[a]], 'b_posed': [list(points[i]) for i in faces[b]]} for a,b in patch_pairs]})
        print('B04_REAR_PATCH_SCREEN_DOMAIN', mode, len(records), flush=True)
    assert [(r['domain'], r['motion'], r['frame']) for r in records] == [(d, p['motion'], p['frame']) for d in ('native', 'runtime-equivalent') for p in schedule()]
    maxima = {'body': max(r['visible_body_pairs'] for r in records), 'shoe': max(v for r in records for v in r['shoe_layer_pairs'].values()),
        'own_shell': max(v for r in records for v in r['detail_shell_pairs'].values()),
        'patch_self': max(r['nonincident_patch_self_pairs'] for r in records),
        'detail_distance_m': max(v for r in records for v in r['max_cloth_distance_m'].values())}
    passed = all(maxima[k] == 0 for k in ('body', 'shoe', 'own_shell', 'patch_self')) and maxima['detail_distance_m'] < .012
    return {'status': 'passed' if passed else 'failed', 'maxima': maxima, 'checks': records,
        'samples_per_domain': 164, 'domains': ['native', 'runtime-equivalent'], 'threshold_m': .012,
        'attachment_roles': None, 'require_detail_clear': True,
        'scope': 'Complete pre-save detail/patch-self/visible-body/F01/F03 screen. Fixed original body mask; no outfit, saved-source export, actual Three.js or art approval claim.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--save', action='store_true')
    parser.add_argument('--approved-probe-dir', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists() and args.output_dir.resolve().is_relative_to(ROOT.resolve())
    assert not args.save or args.approved_probe_dir is not None, 'Review a passed non-saving probe first'
    assert digest(SOURCE) == SOURCE_SHA
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar') / name for name in ('blender_cli.py', 'blender_queue.py')))
    shoe_paths = {id: Path('assets/avatar/catalog-a') / id / (id+'.blend') for id in ('F01', 'F03')}
    gaits = {m: Path('assets/avatar/catalog-a/foundation') / ('catalog-body-'+m+'.glb') for m in ('walk', 'run')}
    protected = snapshot_files([SOURCE, SOURCE.with_suffix('.glb'), SOURCE.with_name('body-B04.glb'), INSPECTION, *shoe_paths.values(), *gaits.values()])
    inspection = json.loads(INSPECTION.read_text())
    assert inspection['source_sha256'] == SOURCE_SHA and inspection['source_unchanged']
    assert_snapshot(inspection['tool_hashes'])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    arm, obj, body = [bpy.data.objects[n] for n in ('Armature_Catalog', OBJECT, 'body_underlayer_male')]
    reset(arm); before = normalized(signature())
    plans, changes = construct(obj, inspection)
    apply_changes(obj, changes)
    # Record exact assigned float32 values for serialization-proof comparisons.
    for r in changes:
        v = obj.data.vertices[r['vertex']]; r['point'] = list(v.co)
        r['keys'] = {k.name: list(k.data[r['vertex']].co) for k in obj.data.shape_keys.key_blocks}
        r['weights'] = [[w.group, w.weight] for w in v.groups]
    assert_preserved(before, normalized(signature()), changes)
    plan = {'source': str(SOURCE), 'source_sha256': SOURCE_SHA, 'plans': plans, 'changes': changes,
        'preserved_fields': list(before), 'tool_hashes': tools, 'input_hashes': protected}
    if args.save:
        approved = json.loads((args.approved_probe_dir/'construction-plan.json').read_text())
        probe = json.loads((args.approved_probe_dir/'pre-save-screen-report.json').read_text())
        assert approved == plan and probe['status'] == 'passed' and not probe['source_saved']
        assert probe['construction_plan_sha256'] == digest(args.approved_probe_dir/'construction-plan.json')
        protected.update(snapshot_files([args.approved_probe_dir/'construction-plan.json', args.approved_probe_dir/'pre-save-screen-report.json']))
    args.output_dir.mkdir(parents=True)
    plan_path = args.output_dir/'construction-plan.json'
    plan_path.write_text(json.dumps(plan, indent=2)+'\n')
    camera = setup_render(); camera.data.ortho_scale = .38
    for view, location in [('back', (0,3,.88)), ('rear-oblique', (1.5,3,.88))]:
        camera.location = location; camera.rotation_euler = (Vector((0,0,.88))-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath = str((args.output_dir/(view+'-review320.png')).resolve()); bpy.ops.render.render(write_still=True)
    shoes = {}
    for id, path in shoe_paths.items():
        name = {'F01': 'F01_strap_sneakers', 'F03': 'F03_high_tops'}[id]
        with bpy.data.libraries.load(str(path.resolve()), link=False) as (src, dst): dst.objects = [name]
        shoe = dst.objects[0]; bpy.context.collection.objects.link(shoe)
        host_arm = next(m.object for m in shoe.modifiers if m.type == 'ARMATURE')
        assert all(max(abs(host_arm.data.bones[n].matrix_local[i][j]-arm.data.bones[n].matrix_local[i][j]) for i in range(4) for j in range(4)) < 1e-6 for n in before['rig'])
        for mod in shoe.modifiers:
            if mod.type == 'ARMATURE': mod.object = arm
        world = shoe.matrix_world.copy(); shoe.parent = arm; shoe.matrix_world = world; shoes[id] = shoe
    screen.changes = changes
    result = screen(obj, arm, body, shoes, gaits)
    assert_snapshot(tools); assert_snapshot(protected)
    result.update({'source': str(SOURCE), 'source_sha256': SOURCE_SHA, 'tool_hashes': tools, 'input_hashes': protected,
        'construction_plan_sha256': digest(plan_path), 'source_saved': False, 'blender': bpy.app.version_string})
    path = args.output_dir/'pre-save-screen-report.json'; path.write_text(json.dumps(result, indent=2)+'\n')
    print('B04_REAR_PATCH_SCREEN', json.dumps({k:v for k,v in result.items() if k not in ('checks','tool_hashes','input_hashes')}), flush=True)
    if args.save and result['status'] == 'passed':
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
        reset(bpy.data.objects['Armature_Catalog'])
        obj = bpy.data.objects[OBJECT]; apply_changes(obj, changes)
        assert_preserved(before, normalized(signature()), changes)
        assert_snapshot(tools); assert_snapshot(protected)
        bpy.context.preferences.filepaths.save_version = 0
        output = args.output_dir/'B04.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
        assert_snapshot(tools); assert_snapshot(protected)
        result.update({'source_saved': True, 'candidate': str(output), 'candidate_sha256': digest(output)})
        path.write_text(json.dumps(result, indent=2)+'\n')


if __name__ == '__main__':
    main()
