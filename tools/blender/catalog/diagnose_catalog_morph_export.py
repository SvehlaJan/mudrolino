"""Isolate morph target geometry, skin weights and bind transforms on export."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--glb',type=Path,required=True);p.add_argument('--mesh',required=True);p.add_argument('--report',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()));arm=bpy.data.objects['Armature_Catalog'];source=bpy.data.objects[a.mesh];action=bpy.data.actions['run'];reset(arm)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(a.glb.resolve()));loaded=[o for o in bpy.data.objects if o not in before];rig=next(o for o in loaded if o.type=='ARMATURE');rig.animation_data_create();exported=next(o for o in loaded if o.type=='MESH' and o.name.startswith(a.mesh));reset(rig)
names=[k.name for k in source.data.shape_keys.key_blocks if k.name.startswith('knee_clearance_')]
for obj in [source,exported]:
 for name in names:obj.data.shape_keys.key_blocks[name].driver_remove('value');obj.data.shape_keys.key_blocks[name].value=0
 bpy.context.view_layer.update()

def compare():
 reference,rf=world_mesh(source);points,pf=world_mesh(exported)
 ri=sorted({i for face in rf for i in face});pi=sorted({i for face in pf for i in face})
 tree=KDTree(len(ri))
 for i in ri:tree.insert(reference[i],i)
 tree.balance();forward=max([(tree.find(points[i])[2],i,tree.find(points[i])[1]) for i in pi])
 reverse=KDTree(len(pi))
 for i in pi:reverse.insert(points[i],i)
 reverse.balance();backward=max([(reverse.find(reference[i])[2],reverse.find(reference[i])[1],i) for i in ri])
 error,e,s=max(forward,backward)
 def weights(obj,index):return {obj.vertex_groups[w.group].name:float(w.weight) for w in obj.data.vertices[index].groups}
 return {'max_error_m':error,'source_vertex':s,'exported_vertex':e,'source_world':list(reference[s]),'exported_world':list(points[e]),'source_weights':weights(source,s),'exported_weights':weights(exported,e),'source_basis':list(source.data.shape_keys.key_blocks['Basis'].data[s].co),'exported_basis_world':list(exported.matrix_world@exported.data.shape_keys.key_blocks['Basis'].data[e].co),'source_targets':{n:list(source.data.shape_keys.key_blocks[n].data[s].co) for n in names},'exported_targets_world':{n:list(exported.matrix_world@exported.data.shape_keys.key_blocks[n].data[e].co) for n in names}}

report={'blend':str(a.blend),'glb':str(a.glb),'cases':[]}
for pose in ['unskinned','rest','run-8']:
 reset(arm);reset(rig)
 for obj in [source,exported]:
  for modifier in obj.modifiers:
   if modifier.type=='ARMATURE':modifier.show_viewport=pose!='unskinned'
 if pose=='run-8':
  for target in [arm,rig]:target.animation_data.action=action;target.animation_data.action_slot=action.slots[0]
  bpy.context.scene.frame_set(8)
 for label,values in [('basis',[0,0]),('left',[1,0]),('right',[0,1]),('both',[1,1])]:
  for obj in [source,exported]:
   for name,value in zip(names,values):obj.data.shape_keys.key_blocks[name].value=value
  bpy.context.view_layer.update();entry={'pose':pose,'shape':label,**compare()};report['cases'].append(entry)
  print('CASE',pose,label,'error',entry['max_error_m'],'vertex',entry['source_vertex'],'weights',entry['source_weights'],entry['exported_weights'])
 if pose=='run-8':
  matrices={}
  for name in ['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','Hips']:
   m=arm.matrix_world@arm.pose.bones[name].matrix@arm.data.bones[name].matrix_local.inverted()@arm.matrix_world.inverted()
   n=rig.matrix_world@rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted()@rig.matrix_world.inverted()
   matrices[name]=max(abs(m[i][j]-n[i][j]) for i in range(4) for j in range(4))
  report['matrix_errors']=matrices;print('BONE_MATRIX_ERRORS',matrices)
a.report.write_text(json.dumps(report,indent=2)+'\n')
