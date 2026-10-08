"""Reopen an isolated cuff candidate and verify the explicit garment boundary."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_cuff import SOURCE, SOURCE_SHA
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from build_catalog_t01 import reset
from b04_cuff_face_inventory import inventory


def corner_uvs(obj):
    return {layer.name: {tuple(face.vertices): [list(layer.data[i].uv) for i in face.loop_indices]
        for face in obj.data.polygons} for layer in obj.data.uv_layers}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert args.revision.resolve().is_relative_to((SOURCE.parent/'cuff-construction-v1').resolve())
    report_path = args.revision/'pre-save-screen-report.json'
    plan_path = args.revision/'construction-plan.json'
    report = json.loads(report_path.read_text()); plan = json.loads(plan_path.read_text())
    assert report['status'] == 'passed' and report['source_saved']
    candidate = args.revision/'B04.blend'
    assert str(candidate) == report['candidate'] and digest(candidate) == report['candidate_sha256']
    assert plan['source_sha256'] == report['source_sha256'] == digest(SOURCE) == SOURCE_SHA
    assert_snapshot(report['tool_hashes']); assert_snapshot(report['protected_hashes'])
    tools = local_dependencies(Path('tools/blender/catalog'), [Path(__file__).name, 'build_catalog_b04_rolled_cuff.py'])
    tools.update(snapshot_files(Path('tools/avatar')/name for name in ('blender_cli.py','blender_queue.py')))
    protected = snapshot_files([SOURCE, candidate, report_path, plan_path])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve())); reset(bpy.data.objects['Armature_Catalog'])
    before = normalized(signature()); name = 'B04_ivory_trousers'; original = before['meshes'][name]
    source_uvs = corner_uvs(bpy.data.objects[name])
    bpy.ops.wm.open_mainfile(filepath=str(candidate.resolve())); reset(bpy.data.objects['Armature_Catalog'])
    after = normalized(signature()); mesh = after['meshes'][name]; count = plan['original_vertex_count']
    assert count == len(original['vertices'])
    for field in before:
        if field in ('meshes','mesh_surface'):
            assert before[field].keys() == after[field].keys()
            for obj in before[field]:
                if obj != name: assert before[field][obj] == after[field][obj], (field,obj)
        else: assert before[field] == after[field], field
    for field in ('groups','materials','matrix','modifiers'): assert original[field] == mesh[field], field
    assert original['vertices'] == mesh['vertices'][:count], 'Original coordinates changed'
    assert original['weights'] == mesh['weights'][:count], 'Original skin changed'
    assert original['keys'].keys() == mesh['keys'].keys()
    for key in original['keys']: assert original['keys'][key] == mesh['keys'][key][:count], ('Original key changed',key)
    cap_faces = {tuple(ids) for ids in plan['removed_cap_faces']}
    retained = {tuple(ids): (material, before['mesh_surface'][name]['smooth_faces'][i])
        for i,(ids,material) in enumerate(original['faces']) if tuple(ids) not in cap_faces}
    actual_retained = {tuple(ids): (material, after['mesh_surface'][name]['smooth_faces'][i])
        for i,(ids,material) in enumerate(mesh['faces']) if all(v < count for v in ids)}
    assert retained == actual_retained, 'Retained topology/material/smoothing changed'
    new_faces = [(ids,material,after['mesh_surface'][name]['smooth_faces'][i])
        for i,(ids,material) in enumerate(mesh['faces']) if any(v >= count for v in ids)]
    assert inventory([ids for ids,_,_ in new_faces]) == inventory(plan['new_faces']), 'Fold topology/winding changed'
    trim = mesh['materials'].index('A ivory tapered trouser trim')
    assert all(material == trim and smooth for _,material,smooth in new_faces)
    saved_uvs = corner_uvs(bpy.data.objects[name])
    assert source_uvs.keys() == saved_uvs.keys(), 'UV layer inventory changed'
    for layer in source_uvs:
        assert {ids:uv for ids,uv in source_uvs[layer].items() if ids not in cap_faces} == {
            ids:uv for ids,uv in saved_uvs[layer].items() if all(v < count for v in ids)}, 'Retained UV corners changed'
        assert all(component == 0 for ids,uv in saved_uvs[layer].items() if any(v >= count for v in ids)
            for point in uv for component in point), 'New untextured cuff UVs differ from the builder defaults'
    assert len(mesh['vertices']) == count+len(plan['new_vertices']) == len(mesh['weights'])
    assert len(plan['attachments']) == len(plan['new_vertices'])
    maximum = 0.0
    for i,(row,binding) in enumerate(zip(plan['new_vertices'],plan['attachments'])):
        index = count+i
        maximum = max(maximum,(Vector(mesh['vertices'][index])-Vector(row['point'])).length)
        actual = dict(mesh['weights'][index]); expected = {int(g):w for g,w in binding['weights'].items()}
        assert actual.keys() == expected.keys() and len(actual) <= 4
        assert abs(sum(actual.values())-1) < 1e-6
        assert all(mesh['groups'][g].startswith(row['side']) and abs(actual[g]-expected[g]) < 1e-7 for g in actual)
        for key in mesh['keys']:
            assert len(mesh['keys'][key]) == len(mesh['vertices'])
            target = Vector(row['point'])+Vector(binding['key_deltas'][key])
            maximum = max(maximum,(Vector(mesh['keys'][key][index])-target).length)
            if key.startswith('knee_clearance_') and not key.endswith(row['side']):
                assert Vector(binding['key_deltas'][key]).length < 1e-10, 'Opposite-side new target leaked'
    assert maximum < 1e-7, ('Serialization error',maximum)
    obj = bpy.data.objects[name]
    incident = {tuple(sorted(e.vertices)): 0 for e in obj.data.edges}
    for face in obj.data.polygons:
        ids = list(face.vertices)
        for a,b in zip(ids,ids[1:]+ids[:1]): incident[tuple(sorted((a,b)))] += 1
    assert all(value == 2 for value in incident.values()), 'Saved shell is not closed'
    assert_snapshot(tools); assert_snapshot(protected); assert_snapshot(report['protected_hashes'])
    result = {'status':'passed','source_sha256':SOURCE_SHA,'candidate_sha256':report['candidate_sha256'],
        'original_invariant_groups':list(before),'original_vertices_keys_weights_preserved':True,
        'new_vertices':len(plan['new_vertices']),'replaced_hem_caps':len(cap_faces),
        'closed_shell':True,'max_new_coordinate_serialization_error_m':maximum,
        'retained_face_materials_and_smoothing_preserved':True,'tool_hashes':tools,'input_hashes':protected,
        'retained_uv_corners_preserved':True,'native_cloth_uv_layers':list(source_uvs),
        'scope':'Fresh reopened-source preservation. Only hem caps, new cuff topology/skin and same-side new-vertex targets may differ. Fitting, export, runtime and art acceptance remain separate.'}
    (args.revision/'preservation-report.json').write_text(json.dumps(result,indent=2)+'\n')
    print('B04_CUFF_PRESERVATION',json.dumps({k:v for k,v in result.items() if k not in ('tool_hashes','input_hashes')}),flush=True)


if __name__ == '__main__': main()
