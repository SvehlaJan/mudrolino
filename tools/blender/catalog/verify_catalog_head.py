"""Verify head-bone rigidity through all motion frames and GLB reimport."""
import argparse,sys,json,hashlib
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,world_mesh

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--glb',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output_dir.mkdir(parents=True,exist_ok=True);args.review_dir.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()));arm=bpy.data.objects['Armature_Catalog'];head=bpy.data.objects['H01_head'];reset(arm)
reference=[head.matrix_world@v.co for v in head.data.vertices]
assert len(head.vertex_groups)==1 and head.vertex_groups[0].name=='Head'
assert all(len(v.groups)==1 and abs(v.groups[0].weight-1)<1e-7 for v in head.data.vertices)
rest=arm.matrix_world@arm.data.bones['Head'].matrix_local;inverse=rest.inverted();results=[]
for motion in ('walk','run'):
 action=bpy.data.actions[motion];reset(arm);arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
 for frame in range(1,int(action.frame_range[1])+1):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
  transform=arm.matrix_world@arm.pose.bones['Head'].matrix@inverse
  actual,_=world_mesh(head)
  error=max((v-transform@r).length for v,r in zip(actual,reference))
  displacement=max((transform@r-r).length for r in reference[::20])
  assert error<.00002,(motion,frame,error)
  results.append({'motion':motion,'frame':frame,'head_bone_max_error_m':error,'rest_displacement_m':displacement})
 # Render an actual moved pose at close range with the same source geometry.
 frame=max([r for r in results if r['motion']==motion],key=lambda r:r['rest_displacement_m'])['frame']
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 actual,_=world_mesh(head);target=sum(actual,Vector())/len(actual)
 camera=bpy.context.scene.camera;camera.data.ortho_scale=.58;camera.location=target+Vector((2,-3,.1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
 bpy.context.scene.render.filepath=str((args.review_dir/(motion+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
reset(arm)
for label,axis,angle in [('turn-left',(0,1,0),.5),('turn-right',(0,1,0),-.5),('nod',(1,0,0),.3)]:
 bone=arm.pose.bones['Head'];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion(axis,angle);bpy.context.view_layer.update()
 transform=arm.matrix_world@bone.matrix@inverse;actual,_=world_mesh(head)
 error=max((v-transform@r).length for v,r in zip(actual,reference));assert error<.00002
 results.append({'pose':label,'head_bone_max_error_m':error});reset(arm)
# Reimport the independent GLB and compare actual skin geometry in world space.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
imported=[o for o in bpy.data.objects if o not in before];copy=next(o for o in imported if o.type=='MESH')
bpy.context.view_layer.update();points,_=world_mesh(copy)
tree=KDTree(len(reference))
for i,v in enumerate(reference):tree.insert(v,i)
tree.balance();error=max(tree.find(v)[2] for v in points);assert error<.00003,error
assert copy.vertex_groups.get('Head') is not None
assert all(len(v.groups)==1 and copy.vertex_groups[v.groups[0].group].name=='Head' and abs(v.groups[0].weight-1)<1e-7 for v in copy.data.vertices)
# Texture-ready heads carry the face in UVs/texture; painted-vertex heads in COLOR_0.
textured='canonical_face_uv' in head.data.uv_layers
if textured:assert len(copy.data.uv_layers)>0,'Export lost face texture coordinates'
else:assert len(copy.data.color_attributes)>0,'Export lost face/stubble colors'
report={'source_blend':str(args.blend),'source_sha256':hashlib.sha256(args.blend.read_bytes()).hexdigest(),'glb':str(args.glb),'glb_sha256':hashlib.sha256(args.glb.read_bytes()).hexdigest(),'motion_frames':41,'extreme_poses':3,'checks':results,'reimport_max_nearest_vertex_error_m':error,'reimport_vertices':len(points),'reimport_color_attributes':[c.name for c in copy.data.color_attributes],'reimport_uv_layers':[u.name for u in copy.data.uv_layers],'face_transport':'uv' if textured else 'color','all_features_weighted_to':'Head','status':'rigidity and reimport passed; style and full body fit still require review'}
(args.output_dir/'rigidity-and-reimport-report.json').write_text(json.dumps(report,indent=2));print('HEAD_PROOF',json.dumps({k:v for k,v in report.items() if k!='checks'}))
