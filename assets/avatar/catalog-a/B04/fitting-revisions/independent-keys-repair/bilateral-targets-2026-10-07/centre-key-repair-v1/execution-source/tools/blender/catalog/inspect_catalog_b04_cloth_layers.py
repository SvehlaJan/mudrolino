"""Separate the actual disconnected fabric layers and classify recorded contacts."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE,SOURCE_SHA
from b04_detail_components import components
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
from repair_catalog_b04_corrective_sides import digest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.report.exists() and digest(SOURCE)==SOURCE_SHA
    audit_path=args.report.parent/'full-shell-self-audit.json'
    audit=json.loads(audit_path.read_text());assert audit['source_sha256']==SOURCE_SHA
    assert_snapshot(audit['tool_hashes']);assert_snapshot(audit['input_hashes'])
    inputs=snapshot_files([SOURCE,audit_path])
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj=bpy.data.objects['B04_ivory_trousers']
    fabric=[p for p in obj.data.polygons if obj.data.materials[p.material_index].name=='A ivory tapered trouser fabric']
    edges={tuple(sorted((a,b))) for p in fabric for a,b in zip(p.vertices,list(p.vertices[1:])+[p.vertices[0]])}
    groups=components(len(obj.data.vertices),list(edges));face_component={};layers=[]
    for ids in groups:
        id_set=set(ids);polys=[p for p in fabric if set(p.vertices)<=id_set]
        if not polys:continue
        component=len(layers)
        for p in polys:face_component[p.index]=component
        score=sum(p.area*p.normal.dot(p.center) for p in polys)
        layers.append({'component':component,'vertices':ids,'faces':[p.index for p in polys],
            'winding_volume_score':score,'role':'outward-facing fabric surface' if score>0 else 'inward-facing fabric surface',
            'rest_bounds_m':[[min(obj.data.vertices[i].co[a] for i in ids),max(obj.data.vertices[i].co[a] for i in ids)] for a in range(3)]})
    rows=[]
    for pose in audit['checks']:
        if pose['frame']!=0 and not (pose['motion']=='run' and pose['frame']==7.25):continue
        counts={}
        for a,b in pose['face_pairs']:
            key=','.join(map(str,sorted((face_component.get(a,-1),face_component.get(b,-1)))))
            counts[key]=counts.get(key,0)+1
        rows.append({'domain':pose['domain'],'motion':pose['motion'],'frame':pose['frame'],'component_pair_counts':counts})
    assert_snapshot(inputs);assert_snapshot(tools)
    report={'status':'read-only source layer classification','source':str(SOURCE),'source_sha256':SOURCE_SHA,
        'source_unchanged':True,'layers':layers,'checks':rows,'input_hashes':inputs,'tool_hashes':tools,
        'scope':'Fabric-only face/edge connectivity, excluding trim boundaries. Outward/inward labels use winding volume score; exact component IDs and contact pairs remain authoritative. No geometry, fitting, body or source save.'}
    args.report.write_text(json.dumps(report,indent=2)+'\n')
    print('B04_CLOTH_LAYERS',json.dumps({'layers':[{'component':l['component'],'faces':len(l['faces']),'vertices':len(l['vertices']),'role':l['role']} for l in layers],'checks':rows}))


if __name__=='__main__':main()
