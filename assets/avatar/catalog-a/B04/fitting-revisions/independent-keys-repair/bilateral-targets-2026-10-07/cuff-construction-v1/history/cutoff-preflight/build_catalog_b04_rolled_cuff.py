"""One continuous hem extension, screened before any isolated source is saved."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_cuff import SOURCE, SOURCE_SHA, SHELL
from b04_rolled_cuff_plan import plan_cuffs, hem_anchor_bindings, returned_band_deltas, export_skin_weights
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from build_catalog_t01 import reset, world_mesh, setup_render
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_measurement import schedule


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--output-dir', type=Path, required=True)
    p.add_argument('--save', action='store_true')
    p.add_argument('--attachment', choices=('surface', 'hem-anchor'), default='surface')
    p.add_argument('--deep-return-height', type=float)
    a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    root = SOURCE.parent/'cuff-construction-v1'
    assert a.output_dir.resolve().is_relative_to(root.resolve()) and not a.output_dir.exists()
    assert digest(SOURCE) == SOURCE_SHA
    tools = local_dependencies(Path('tools/blender/catalog'), [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/name for name in ('blender_cli.py', 'blender_queue.py')))
    shoe_paths = {id: Path('assets/avatar/catalog-a')/id/(id+'.blend') for id in ('F01', 'F03')}
    gaits = {m: Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk', 'run')}
    protected = snapshot_files([SOURCE, SOURCE.with_suffix('.glb'), *shoe_paths.values(), *gaits.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve())); arm = bpy.data.objects['Armature_Catalog']; reset(arm)
    before = normalized(signature()); obj = bpy.data.objects['B04_ivory_trousers']; body = bpy.data.objects['body_underlayer_male']
    old_count = len(obj.data.vertices); original_faces = [tuple(f.vertices) for f in obj.data.polygons]
    original_surface = {tuple(f.vertices): (f.material_index, f.use_smooth) for f in obj.data.polygons}
    old_keys = {k.name: [v.co.copy() for v in k.data] for k in obj.data.shape_keys.key_blocks}
    assert all((co-old_keys['Basis'][i]).length < 1e-8 for name, values in old_keys.items() for i, co in enumerate(values) if obj.data.vertices[i].co.z < .205)
    cap_ids = [f.index for f in obj.data.polygons if obj.data.materials[f.material_index].name in SHELL
               and f.normal.z < -.7 and max(obj.data.vertices[i].co.z for i in f.vertices) < .137]
    assert len(cap_ids) == 96, ('Reinspect the actual hem caps', len(cap_ids))
    centers = {side: list(arm.data.bones[side+'Foot'].head_local)[:2] for side in ('Left', 'Right')}
    # Use adjacent cloth face normals, excluding the cap. Smooth vertex normals
    # blend downward cap normals and can obscure the physical layer orientation.
    boundary_normals = [v.normal.copy() for v in obj.data.vertices]
    cap_vertices = {i for f in cap_ids for i in obj.data.polygons[f].vertices}
    for i in cap_vertices:
        neighbors = [f.normal for f in obj.data.polygons if f.index not in cap_ids and i in f.vertices]
        assert neighbors, 'Boundary must join an existing cloth surface'
        boundary_normals[i] = sum(neighbors, Vector()).normalized()
    plan = plan_cuffs([list(v.co) for v in obj.data.vertices], [list(n) for n in boundary_normals],
                      [list(obj.data.polygons[i].vertices) for i in cap_ids], centers)
    compressed = returned_band_deltas(plan, a.deep_return_height) if a.deep_return_height is not None else None
    obj.data.calc_loop_triangles()
    triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if obj.data.materials[obj.data.polygons[t.polygon_index].material_index].name in SHELL]
    old_points = [v.co.copy() for v in obj.data.vertices]; host = BVHTree.FromPolygons(old_points, triangles, all_triangles=True)
    anchors = hem_anchor_bindings(plan, [{obj.vertex_groups[w.group].name: w.weight for w in v.groups} for v in obj.data.vertices]) if a.attachment == 'hem-anchor' else None
    attachments = []
    for row_index, row in enumerate(plan['new_vertices']):
        p = Vector(row['point'])
        if anchors is not None:
            anchor = anchors[row_index]; ids = (anchor['source_hem_vertex'],); factors = [1.0]
            distance = (p-old_points[ids[0]]).length
            weights = {obj.vertex_groups[name].index: weight for name, weight in anchor['weights'].items()}
        else:
            near, _, face, distance = host.find_nearest(p)
            ids = triangles[face]; x, y, z = [old_points[i] for i in ids]
            assert (y-x).cross(z-x).length > 1e-12
            factors = [max(0, min(1, f)) for f in barycentric_transform(near, x, y, z, Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1)))]
            total = sum(factors); factors = [f/total for f in factors]; weights = {}
            for i, factor in zip(ids, factors):
                for w in obj.data.vertices[i].groups: weights[w.group] = weights.get(w.group, 0)+factor*w.weight
        weights = export_skin_weights(weights)
        assert len(weights) <= 4 and abs(sum(weights.values())-1) < 1e-10
        assert all(obj.vertex_groups[g].name.startswith(row['side']) for g in weights)
        attachments.append({'method': a.attachment, 'source_vertices': ids, 'factors': factors, 'distance_m': distance, 'weights': weights,
            'key_deltas': {name: list(sum(((values[i]-old_keys['Basis'][i])*f for i, f in zip(ids, factors)), Vector())) for name, values in old_keys.items()}})
        if compressed:
            for name, deltas in compressed.items():
                assert name in old_keys
                attachments[-1]['key_deltas'][name] = list(Vector(attachments[-1]['key_deltas'][name])+Vector(deltas[row_index]))
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    originals = list(bm.verts); old_bmfaces = list(bm.faces); shapes = {name: bm.verts.layers.shape.get(name) for name in old_keys}
    assert all(shapes.values()), 'Existing key layers must survive construction'
    deform = bm.verts.layers.deform.active; assert deform is not None
    bmesh.ops.delete(bm, geom=[old_bmfaces[i] for i in cap_ids], context='FACES_ONLY')
    loose = [e for e in bm.edges if not e.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='EDGES')
    assert len(bm.verts) == old_count, 'No original vertices may be removed'
    verts = originals[:]
    for row, binding in zip(plan['new_vertices'], attachments):
        v = bm.verts.new(row['point']); verts.append(v)
        for name, layer in shapes.items(): v[layer] = Vector(row['point'])+Vector(binding['key_deltas'][name])
        for group, weight in binding['weights'].items(): v[deform][group] = weight
    trim = next(i for i, m in enumerate(obj.data.materials) if m.name == 'A ivory tapered trouser trim')
    for face in plan['new_faces']:
        f = bm.faces.new([verts[i] for i in face]); f.material_index = trim; f.smooth = True
    assert all(len(e.link_faces) == 2 for e in bm.edges), 'Cuff must extend the closed cloth, without disconnected or open edges'
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
    # Existing data and all non-garment fields are exact. Only hem caps are replaced,
    # New vertices receive source-cloth skin; optional return compression affects
    # only new free rows on the existing anatomical knee keys.
    after = normalized(signature())
    for name in before:
        if name in ('meshes', 'mesh_surface'):
            for mesh_name in before[name]:
                if mesh_name != obj.name: assert before[name][mesh_name] == after[name][mesh_name], (name, mesh_name)
        else: assert before[name] == after[name], name
    for name, points in old_keys.items():
        assert all((obj.data.shape_keys.key_blocks[name].data[i].co-p).length < 1e-8 for i, p in enumerate(points)), ('Original key changed', name)
    assert before['meshes'][obj.name]['weights'] == after['meshes'][obj.name]['weights'][:old_count], 'Original skin changed'
    assert all((obj.data.vertices[i].co-old_points[i]).length < 1e-8 for i in range(old_count)), 'Original rest vertex changed'
    retained = {tuple(f.vertices): f for f in obj.data.polygons if all(i < old_count for i in f.vertices)}
    assert set(retained) == {f for i, f in enumerate(original_faces) if i not in cap_ids}, 'Non-cap topology changed'
    assert all((f.material_index, f.use_smooth) == original_surface[ids] for ids, f in retained.items()), 'Non-cap surface changed'
    a.output_dir.mkdir(parents=True)
    (a.output_dir/'construction-plan.json').write_text(json.dumps({'source': str(SOURCE), 'source_sha256': SOURCE_SHA, **plan, 'attachments': attachments, 'tool_hashes': tools}, indent=2)+'\n')
    # Direct construction review is preserved even if the motion screen rejects it.
    camera = setup_render(); camera.data.ortho_scale = .34
    for view, location in [('front',(0,-3,.16)), ('back',(0,3,.16)), ('side',(3,0,.16))]:
        camera.location = location; camera.rotation_euler = (Vector((0,0,.16))-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath = str((a.output_dir/(view+'-review320.png')).resolve()); bpy.ops.render.render(write_still=True)
    shoes = {}
    for id, path in shoe_paths.items():
        name = {'F01':'F01_strap_sneakers', 'F03':'F03_high_tops'}[id]
        with bpy.data.libraries.load(str(path.resolve()), link=False) as (src, dst): dst.objects = [name]
        shoe = dst.objects[0]; bpy.context.collection.objects.link(shoe)
        source_arm = next(m.object for m in shoe.modifiers if m.type == 'ARMATURE')
        assert all(max(abs(source_arm.data.bones[n].matrix_local[i][j]-arm.data.bones[n].matrix_local[i][j]) for i in range(4) for j in range(4)) < 1e-6 for n in before['rig'])
        for mod in shoe.modifiers:
            if mod.type == 'ARMATURE': mod.object = arm
        world = shoe.matrix_world.copy(); shoe.parent = arm; shoe.matrix_world = world; shoes[id] = shoe
    reset(arm); adapter = RuntimeGaitPose(SOURCE.with_suffix('.glb'), gaits, arm)
    faces = [tuple(f.vertices) for f in obj.data.polygons]
    new_face_ids = {i for i, f in enumerate(faces) if any(v >= old_count for v in f)}
    records = []; poses = schedule()
    for mode in ('native', 'runtime-equivalent'):
        for row in poses:
            motion, frame = row['motion'], row['frame']
            if mode == 'runtime-equivalent': adapter.apply(motion, frame, 24)
            else:
                reset(arm)
                if motion != 'rest':
                    action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
            pts, _ = world_mesh(obj); tree = BVHTree.FromPolygons(pts, faces)
            bp, bf = world_mesh(body); body_pairs = len(tree.overlap(BVHTree.FromPolygons(bp, bf)))
            layer = {}
            for id, shoe in shoes.items():
                sp, sf = world_mesh(shoe); layer[id] = len(tree.overlap(BVHTree.FromPolygons(sp, sf)))
            self_pairs = [(x,y) for x,y in tree.overlap(tree) if x < y and (x in new_face_ids or y in new_face_ids) and not set(faces[x]) & set(faces[y])]
            contacts = []
            for pair in self_pairs:
                details = []
                for face_id in pair:
                    ids = faces[face_id]
                    details.append({'face': face_id, 'vertices': list(ids),
                        'material': obj.data.materials[obj.data.polygons[face_id].material_index].name,
                        'rest_points': [list(obj.data.vertices[i].co) for i in ids],
                        'posed_points': [list(pts[i]) for i in ids],
                        'cuff_rows': [plan['new_vertices'][i-old_count] if i >= old_count else {'original_vertex': i} for i in ids],
                        'weights': [{obj.vertex_groups[w.group].name: w.weight for w in obj.data.vertices[i].groups} for i in ids]})
                contacts.append(details)
            records.append({'mode': mode, 'motion': motion, 'frame': frame, 'visible_body_pairs': body_pairs, 'shoe_layer_pairs': layer, 'nonincident_cuff_self_pairs': len(self_pairs), 'self_contacts': contacts})
            if mode == 'native' and motion == 'run' and frame == 7.25:
                cuff_points = [pts[old_count+i] for i, v in enumerate(plan['new_vertices']) if v['side'] == 'Right']
                target = Vector([(min(p[j] for p in cuff_points)+max(p[j] for p in cuff_points))/2 for j in range(3)])
                hidden = {id: shoe.hide_render for id, shoe in shoes.items()}
                for shoe in shoes.values(): shoe.hide_render = True
                camera.data.ortho_scale = .34
                for view, offset in [('front',(0,-3,0)), ('side',(3,0,0))]:
                    camera.location = target+Vector(offset)
                    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
                    bpy.context.scene.render.filepath = str((a.output_dir/('run-7.25-'+view+'-review320.png')).resolve())
                    bpy.ops.render.render(write_still=True)
                for id, shoe in shoes.items(): shoe.hide_render = hidden[id]
        print('CUFF_SCREEN_MODE', mode, len(poses), flush=True)
    maximum_body = max(r['visible_body_pairs'] for r in records); maximum_shoes = {id:max(r['shoe_layer_pairs'][id] for r in records) for id in shoes}; maximum_self = max(r['nonincident_cuff_self_pairs'] for r in records)
    passed = maximum_body == maximum_self == 0 and max(maximum_shoes.values()) == 0
    assert len(records) == 328
    assert_snapshot(tools); assert_snapshot(protected)
    report = {'status': 'passed' if passed else 'failed', 'source': str(SOURCE), 'source_sha256': SOURCE_SHA,
        'blender': bpy.app.version_string, 'tool_hashes': tools, 'protected_hashes': protected, 'source_saved': False,
        'samples_per_domain': 164, 'domains': ['native', 'runtime-equivalent'], 'max_visible_body_pairs': maximum_body,
        'max_shoe_layer_pairs': maximum_shoes, 'max_nonincident_cuff_self_pairs': maximum_self,
        'new_vertices': len(plan['new_vertices']), 'removed_hem_caps': len(cap_ids), 'original_vertices_keys_weights_preserved': True,
        'attachment_method': a.attachment, 'retained_face_materials_and_smoothing_preserved': True,
        'deep_return_height_m': a.deep_return_height,
        'new_skin_export_cutoff': .0001,
        'scope': 'Cheap pre-save continuous-cuff screen. Visible body uses unchanged B04 coverage mask; complete hidden-body contacts are not an acceptance claim. Both independent shoe obstacles are evaluated; full outfit/detail/export/actual-Three/art proof remains required.', 'checks': records}
    (a.output_dir/'pre-save-screen-report.json').write_text(json.dumps(report, indent=2)+'\n')
    print('B04_CUFF_SCREEN', json.dumps({k:v for k,v in report.items() if k not in ('checks','tool_hashes','protected_hashes')}), flush=True)
    if not passed: return
    if a.save:
        # Explicit save is allowed only after the full cheap screen and root's rest review.
        for name in set(bpy.data.objects.keys())-set(before['meshes'])-{'Armature_Catalog'}:
            item = bpy.data.objects[name]
            if item.type == 'MESH' or item.type == 'ARMATURE': bpy.data.objects.remove(item, do_unlink=True)
        reset(arm); bpy.context.preferences.filepaths.save_version = 0
        output = a.output_dir/'B04.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
        report['source_saved'] = True; report['candidate'] = str(output); report['candidate_sha256'] = digest(output)
        (a.output_dir/'pre-save-screen-report.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__': main()
