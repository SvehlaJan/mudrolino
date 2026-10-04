"""Check rigid bone attachment and clearance during independent head gestures."""
import bpy,sys,argparse,json,hashlib
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,world_mesh,bvh
p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--object',required=True);p.add_argument('--bone',default='Head');p.add_argument('--obstacles',required=True);p.add_argument('--report',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()));arm=bpy.data.objects['Armature_Catalog'];obj=bpy.data.objects[a.object];obstacles=[bpy.data.objects[name] for name in a.obstacles.split(',')];reset(arm);reference,_=world_mesh(obj);inverse=(arm.matrix_world@arm.data.bones[a.bone].matrix_local).inverted();records=[]
assert all(len(v.groups)==1 and obj.vertex_groups[v.groups[0].group].name==a.bone and abs(v.groups[0].weight-1)<1e-7 for v in obj.data.vertices)
for name,axis,angle in [('rest',(0,0,1),0),('turn-left',(0,0,1),.6),('turn-right',(0,0,1),-.6),('nod',(1,0,0),.4),('look-up',(1,0,0),-.3),('tilt',(0,1,0),.25)]:
 reset(arm);bone=arm.pose.bones[a.bone];matrix=bone.matrix.copy();pose=(Quaternion(axis,angle).to_matrix()@matrix.to_3x3()).to_4x4();pose.translation=matrix.translation;bone.matrix=pose;bpy.context.view_layer.update();transform=arm.matrix_world@bone.matrix@inverse;points,_=world_mesh(obj);error=max((v-transform@r).length for v,r in zip(points,reference));tree,_=bvh(obj);pairs={o.name:len(tree.overlap(bvh(o)[0])) for o in obstacles};records.append({'pose':name,'max_attachment_error_m':error,'obstacle_pairs':pairs});assert error<.00002 and not any(pairs.values()),records[-1]
report={'blend':str(a.blend),'blend_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),'object':a.object,'bone':a.bone,'status':'passed','checks':records};a.report.write_text(json.dumps(report,indent=2));print('ATTACHMENT_PROOF',json.dumps(report))
