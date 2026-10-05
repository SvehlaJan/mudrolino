"""Reject a footwear mask that removes anatomy above its covered opening."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True)
p.add_argument('--id',required=True);p.add_argument('--opening-z',type=float,required=True)
p.add_argument('--margin',type=float,default=.004);p.add_argument('--report',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert a.margin>=0
bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()))
body=bpy.data.objects['body_underlayer_male'];group=body.vertex_groups['covered_'+a.id]
mask=next(m for m in body.modifiers if m.type=='MASK' and m.vertex_group==group.name)
assert mask.invert_vertex_group and mask.show_viewport and mask.show_render
ids={v.index for v in body.data.vertices if any(w.group==group.index and w.weight>.5 for w in v.groups)}
assert ids
removed=[face for face in body.data.polygons if any(i in ids for i in face.vertices)]
assert removed
limit=a.opening_z-a.margin
heights=[max(body.data.vertices[i].co.z for i in face.vertices) for face in removed]
violations=sum(z>=limit for z in heights)
report={'blend':str(a.blend),'blend_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),
        'piece':a.id,'body_mesh':body.name,'coverage_group':group.name,
        'original_body_vertices':len(body.data.vertices),'covered_vertices':len(ids),
        'removed_faces':len(removed),'opening_z':a.opening_z,'margin_m':a.margin,
        'coverage_boundary_z':limit,'maximum_removed_face_z':max(heights),
        'removed_faces_above_boundary':violations,'status':'passed' if not violations else 'failed',
        'scope':'Rest-space opening anatomy preservation; dense animated body/layer fit remains a separate gate.'}
a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n')
print('COVERAGE_PROOF',json.dumps(report));assert not violations,report
