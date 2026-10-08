"""Read actual paired layer topology and local normal thickness before authoring."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0,str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE,SOURCE_SHA
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
from repair_catalog_b04_corrective_sides import digest
from build_catalog_t01 import reset
from cloth_layer_correspondence import pair_layers


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists() and digest(SOURCE)==SOURCE_SHA
    root=SOURCE.parent.parent.parent/'centre-key-repair-v1'
    layer_path=root/'full-shell-diagnosis/cloth-layer-classification-report.json'
    probe_path=root/'inseam-separation-probe-v1/inseam-separation-screen-report.json'
    layers=json.loads(layer_path.read_text())['layers'];probe=json.loads(probe_path.read_text())
    assert_snapshot(probe['input_hashes']);assert_snapshot(probe['tool_hashes'])
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    inputs=snapshot_files([SOURCE,layer_path,probe_path])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()));reset(bpy.data.objects['Armature_Catalog'])
    obj=bpy.data.objects['B04_ivory_trousers'];points=[v.co.copy() for v in obj.data.vertices]
    faces=[list(p.vertices) for p in obj.data.polygons]
    outer,inner=layers
    assert outer['component']==0 and inner['component']==1
    inner_ids=set(inner['vertices'])
    # The solidify-era index displacement is a seed hypothesis only. Prove it
    # against every edge and reversed polygon, including all inserted cut nodes.
    seeds={i:i+2575 for i in outer['vertices'] if i<2575}
    assert set(seeds.values())<=inner_ids
    assert all((points[i]-points[j]).length<.005 for i,j in seeds.items()), 'Original layer seed distance differs'
    paired=pair_layers([faces[i] for i in outer['faces']],[faces[i] for i in inner['faces']],seeds)
    outer_ids=outer['vertices'];lookup={i:j for j,i in enumerate(outer_ids)}
    mesh=bpy.data.meshes.new('Read-only outer topology');mesh.from_pydata([points[i] for i in outer_ids],[],[[lookup[v] for v in faces[i]] for i in outer['faces']]);mesh.update()
    normal_before={i:mesh.vertices[lookup[i]].normal.copy() for i in outer_ids}
    changed_outer={row['index']:row for row in probe['plan']['changes'] if row['layer']==0}
    for i,row in changed_outer.items():mesh.vertices[lookup[i]].co=row['after']
    mesh.update()
    # Include the face fan: changing a point changes its neighbors' normals.
    affected_faces=[i for i in outer['faces'] if set(faces[i])&set(changed_outer)]
    affected_vertices={v for i in affected_faces for v in faces[i]}
    pairs=[]
    for i,j in paired['vertex_pairs']:
        normal=normal_before[i];offset=points[i]-points[j]
        pairs.append({'outer':i,'inner':j,'rest_outer':list(points[i]),'rest_inner':list(points[j]),
            'outer_normal_before':list(normal),'outer_normal_after':list(mesh.vertices[lookup[i]].normal),
            'outer_after':list(mesh.vertices[lookup[i]].co),'normal_thickness_m':offset.dot(normal),
            'distance_m':offset.length,'tangential_offset_m':(offset-normal*offset.dot(normal)).length,
            'affected_normal_fan':i in affected_vertices,
            'outer_key_deltas_m':{k.name:list(k.data[i].co-points[i]) for k in obj.data.shape_keys.key_blocks if k.name!='Basis'},
            'inner_key_deltas_m':{k.name:list(k.data[j].co-points[j]) for k in obj.data.shape_keys.key_blocks if k.name!='Basis'}})
    args.output_dir.mkdir(parents=True)
    assert_snapshot(inputs);assert_snapshot(tools)
    report={'status':'read-only layer correspondence','source':str(SOURCE),'source_sha256':SOURCE_SHA,'source_unchanged':True,
        'tool_hashes':tools,'input_hashes':inputs,'pairing':paired,'pairs':pairs,'changed_outer_vertices':sorted(changed_outer),
        'affected_outer_faces':affected_faces,'affected_normal_vertices':sorted(affected_vertices),
        'scope':'Full fabric-layer topology bijection including 160 cut vertices per side. Positions/normals/thickness on baseline and previous non-saving outer-panel proposal; no source mesh/key/skin edit or save.'}
    (args.output_dir/'lining-correspondence-report.json').write_text(json.dumps(report,indent=2)+'\n')
    local=[r for r in pairs if r['affected_normal_fan']]
    print('B04_LINING_CORRESPONDENCE',json.dumps({'pairs':len(pairs),'paired_faces':paired['paired_faces'],'seeds':len(seeds),
        'changed_outer':len(changed_outer),'normal_fan':len(local),'local_thickness_bounds_m':[min(r['normal_thickness_m'] for r in local),max(r['normal_thickness_m'] for r in local)],
        'local_tangent_max_m':max(r['tangential_offset_m'] for r in local)}),flush=True)


if __name__=='__main__':main()
