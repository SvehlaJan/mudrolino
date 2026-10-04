"""Bake shared arm clearance corrections without changing the gait or rest rig."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,export
from prepare_catalog_body import action_curves

def corrected_action(arm,name,angle,knee_angle=0):
 source=bpy.data.actions[name];source.name=name+'_source';source.use_fake_user=True
 times=sorted({round(float(p.co.x),5) for c in action_curves(source) for p in c.keyframe_points}|set(range(math.ceil(source.frame_range[0]),math.floor(source.frame_range[1])+1)))
 if knee_angle:times=sorted(set(times)|{i/4 for i in range(math.ceil(source.frame_range[0]*4),math.floor(source.frame_range[1]*4)+1)})
 samples={n:[] for n in ['LeftArm','RightArm']+(['LeftLeg','RightLeg'] if knee_angle else [])}
 arm.animation_data.action=source;arm.animation_data.action_slot=source.slots[0]
 for frame in times:
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  axis=(arm.pose.bones['Spine'].matrix@arm.data.bones['Spine'].matrix_local.inverted()).to_3x3()@Vector((0,1,0));axis.normalize()
  for bone_name,sign in [('LeftArm',-1),('RightArm',1)]:
   bone=arm.pose.bones[bone_name];matrix=bone.matrix.copy()
   rotation=Quaternion(axis,sign*angle).to_matrix()@matrix.to_3x3();corrected=rotation.to_4x4();corrected.translation=matrix.translation
   bone.matrix=corrected;bpy.context.view_layer.update();q=bone.rotation_quaternion.copy();q.normalize()
   if samples[bone_name] and samples[bone_name][-1][1].dot(q)<0:q.negate()
   samples[bone_name].append((frame,q))
  if knee_angle:
   basis=(arm.pose.bones['Hips'].matrix@arm.data.bones['Hips'].matrix_local.inverted()).to_3x3();axis=basis@Vector((1,0,0));axis.normalize();up=basis@Vector((0,0,1));back=basis@Vector((0,1,0))
   for prefix in ['Left','Right']:
    bone=arm.pose.bones[prefix+'Leg'];tibia=arm.pose.bones[prefix+'Foot'].head-bone.head;factor=max(0,min(1,(tibia.dot(up)+.05)/.13)) if tibia.dot(back)>0 else 0
    matrix=bone.matrix.copy();rotation=Quaternion(axis,-knee_angle*factor).to_matrix()@matrix.to_3x3();corrected=rotation.to_4x4();corrected.translation=matrix.translation;bone.matrix=corrected;bpy.context.view_layer.update();q=bone.rotation_quaternion.copy();q.normalize()
    if samples[bone.name] and samples[bone.name][-1][1].dot(q)<0:q.negate()
    samples[bone.name].append((frame,q))
 output=source.copy();output.name=name;output.use_fake_user=True
 arm.animation_data.action=output;arm.animation_data.action_slot=output.slots[0]
 for bone_name,values in samples.items():
  path=f'pose.bones["{bone_name}"].rotation_quaternion'
  for index in range(4):
   curve=output.fcurve_ensure_for_datablock(arm,path,index=index);curve.keyframe_points.clear();curve.keyframe_points.add(len(values))
   for p,(frame,q) in zip(curve.keyframe_points,values):p.co=(frame,q[index]);p.interpolation='LINEAR'
   curve.update()
 return output,{'angle_radians':angle,'angle_degrees':math.degrees(angle),'max_deep_knee_relief_radians':knee_angle,'changed_bones':list(samples),'samples':len(times),'frame_range':list(source.frame_range),'preserved':'all non-corrected quaternion curves; rest rig; root translation policy'}

def export_clip(path,arm,meshes):
 bpy.ops.object.select_all(action='DESELECT');records=[];arm.select_set(True)
 for o in meshes:
  o.select_set(True);records.append((o,o.parent,o.matrix_world.copy()));o.parent=None;o.matrix_world=records[-1][2]
 bpy.context.view_layer.objects.active=arm
 try:
  bpy.ops.outliner.orphans_purge(do_recursive=True)
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_texcoords=False,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_force_sampling=False,export_nla_strips=False,export_bake_animation=False,export_apply=False)
 finally:
  for o,parent,matrix in records:o.parent=parent;o.matrix_world=matrix

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True)
 args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(args.foundation.resolve()));arm=bpy.data.objects['Armature_Catalog'];meshes=[o for o in bpy.data.objects if o.type=='MESH'];reset(arm)
 # Match the exporter skinning contract in the editable foundation too.
 # Otherwise a successful Blender clearance test can differ at runtime.
 weight_report={}
 for mesh in meshes:
  changed=0;discarded=0
  for vertex in mesh.data.vertices:
   original=[(w.group,w.weight) for w in vertex.groups if w.weight>0]
   weights=sorted(original,key=lambda w:-w[1])[:4];total=sum(w for _,w in weights)
   assert total>0,(mesh.name,vertex.index)
   if len(original)>4:changed+=1;discarded=max(discarded,sum(w for _,w in original)-total)
   for index,_ in original:mesh.vertex_groups[index].remove([vertex.index])
   for index,w in weights:mesh.vertex_groups[index].add([vertex.index],w/total,'REPLACE')
  weight_report[mesh.name]={'vertices':len(mesh.data.vertices),'vertices_pruned_to_four':changed,'max_discarded_weight':discarded,'policy':'four largest normalized influences before fitting and export'}
 report={'source':str(args.foundation),'status':'motion candidate; all-frame garment/body verification pending','motions':{},'skinning':weight_report}
 for name,angle in [('walk',.10),('run',.40)]:
  output,details=corrected_action(arm,name,angle,.10 if name=='run' else 0);report['motions'][name]=details
  arm.animation_data.action=output;arm.animation_data.action_slot=output.slots[0];bpy.context.scene.frame_set(math.floor(output.frame_range[0]),subframe=output.frame_range[0]-math.floor(output.frame_range[0]));export_clip(args.output_dir/f'catalog-body-{name}.glb',arm,meshes)
 reset(arm);export(args.output_dir/'catalog-body.glb',[arm,*meshes]);bpy.context.scene.frame_set(0)
 bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir/'catalog-body.blend').resolve()));(args.output_dir/'motion-correction-report.json').write_text(json.dumps(report,indent=2));print('CORRECTED_MOTION',json.dumps(report))

if __name__=='__main__':main()
