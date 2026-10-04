"""Compare evaluated master geometry against its skinned GLB round trip."""
import bpy,sys,json,math,hashlib,argparse
from pathlib import Path
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,world_mesh
p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--glb',type=Path,required=True);p.add_argument('--report',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()));arm=bpy.data.objects['Armature_Catalog'];reset(arm)
sources=[o for o in bpy.data.objects if o.type=='MESH'];actions={n:bpy.data.actions[n] for n in ['walk','run']};before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(a.glb.resolve()));imported=[o for o in bpy.data.objects if o not in before];rig=next(o for o in imported if o.type=='ARMATURE');rig.animation_data_create()
mapping={}
for source in sources:
 prefix='outfit_masked_body' if source.name=='body_underlayer_male' else source.name
 candidates=[o for o in imported if o.type=='MESH' and o.name.startswith(prefix)]
 assert len(candidates)==1,(source.name,[o.name for o in imported]);mapping[source]=candidates[0]
 if candidates[0].data.shape_keys:
  for key in candidates[0].data.shape_keys.key_blocks:
   if key.name.startswith('knee_clearance_'):key.driver_remove('value')
results=[]
# Preserve the measured deepest-kick regression in both source/export and the
# downstream Three.js corrective probe, rather than sampling only nearby poses.
for motion,frames in [(None,[0]),('walk',[.8,1,6.25,13,19.5,25.6]),('run',[.8,1,5,7.25,8,9.5,12.75,15.25,16])]:
 reset(arm);reset(rig)
 if motion:
  for target in [arm,rig]:target.animation_data.action=actions[motion];target.animation_data.action_slot=actions[motion].slots[0]
 for frame in frames:
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update();errors={}
  # GLB carries targets, not Blender drivers. Compare identical evaluated
  # morph values here; the Three.js knee driver has a separate gate.
  for source,exported in mapping.items():
   if source.data.shape_keys:
    assert exported.data.shape_keys
    for key in source.data.shape_keys.key_blocks:
     if key.name.startswith('knee_clearance_'):exported.data.shape_keys.key_blocks[key.name].value=key.value
  bpy.context.view_layer.update()
  for source,exported in mapping.items():
   reference,reference_faces=world_mesh(source);points,point_faces=world_mesh(exported)
   reference=[reference[i] for i in sorted({i for f in reference_faces for i in f})]
   points=[points[i] for i in sorted({i for f in point_faces for i in f})]
   assert reference and points,source.name
   tree=KDTree(len(reference))
   for i,v in enumerate(reference):tree.insert(v,i)
   tree.balance();forward=max(tree.find(v)[2] for v in points)
   reverse_tree=KDTree(len(points))
   for i,v in enumerate(points):reverse_tree.insert(v,i)
   reverse_tree.balance();reverse=max(reverse_tree.find(v)[2] for v in reference)
   errors[source.name]=max(forward,reverse)
  corrective_values={o.name:{k.name:k.value for k in o.data.shape_keys.key_blocks if k.name.startswith('knee_clearance_')} for o in sources if o.data.shape_keys}
  results.append({'motion':motion or 'rest','frame':frame,'max_nearest_vertex_error_m':errors,'corrective_values':corrective_values})
maximum=max(e for r in results for e in r['max_nearest_vertex_error_m'].values());report={'blend':str(a.blend),'glb':str(a.glb),'blend_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),'frames_per_second':bpy.context.scene.render.fps/bpy.context.scene.render.fps_base,'comparison':'bidirectional rendered vertex distance','loose_vertex_policy':'Compare all vertices referenced by renderable polygons; coverage/authoring vertices without faces are omitted by GLB and excluded here.','glb_sha256':hashlib.sha256(a.glb.read_bytes()).hexdigest(),'checks':results,'max_error_m':maximum,'threshold_m':.00003,'status':'passed' if maximum<.00003 else 'failed'}
a.report.write_text(json.dumps(report,indent=2));print('EXPORT_DEFORMATION',json.dumps(report));assert maximum<.00003,maximum
