"""Assemble independent masters and union their reversible body coverage."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,select,export,setup_render,bvh
from catalog_correctives import attach_knee_correctives
from build_catalog_female_foundation_study import export_uv

OBJECT_NAMES={'T05':'T05_crew_sweatshirt','T06':'T06_henley','T04':'T04_zip_hoodie','T03':'T03_raglan_tee','T02':'T02_pullover_hoodie','T01':'T01_crew_tee','B01':'B01_straight_trousers','B02':'B02_joggers','B03':'B03_casual_shorts','B04':'B04_ivory_trousers','F01':'F01_strap_sneakers','F02':'F02_slip_ons','F03':'F03_high_tops','F04':'F04_ankle_boots','A01':'A01_baseball_cap'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--catalog-dir',type=Path,required=True);p.add_argument('--pieces',required=True);p.add_argument('--uv-export',action='store_true',help='Keep texture coordinates (painted-face heads)');p.add_argument('--source',action='append',default=[],help='ID=path.blend: use a piece revision instead of catalog-dir/ID/ID.blend');p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True)
 args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output_dir.mkdir(parents=True,exist_ok=True);args.review_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(args.foundation.resolve()));bpy.context.preferences.filepaths.save_version=0;arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm);body_parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body];garments=[];coverage={}
 for id in args.pieces.split(','):
  overrides=dict(item.split('=',1) for item in args.source);path=Path(overrides[id]) if id in overrides else args.catalog_dir/id/(id+'.blend');before=set(bpy.data.objects)
  with bpy.data.libraries.load(str(path.resolve()),link=False) as (source,data):
   required=[OBJECT_NAMES[id],'body_underlayer_male']
   assert all(name in source.objects for name in required),f'{path}: missing catalog objects {set(required)-set(source.objects)}'
   data.objects=required
  proto=data.objects[0];source_body=data.objects[1]
  assert len(source_body.data.vertices)==len(body.data.vertices),'Coverage source topology changed'
  delta=max((a.co-b.co).length for a,b in zip(source_body.data.vertices,body.data.vertices));assert delta<.00001,delta
  mesh=proto.data.copy();mesh.transform(proto.matrix_world);garment=bpy.data.objects.new(OBJECT_NAMES[id]+'_outfit',mesh);bpy.context.collection.objects.link(garment)
  assert [g.name for g in garment.vertex_groups]==[g.name for g in proto.vertex_groups]
  m=garment.modifiers.new('Shared outfit skin','ARMATURE');m.object=arm;garment.parent=arm;garment.matrix_world=Matrix.Identity(4)
  attach_knee_correctives(garment,arm)
  source_group=source_body.vertex_groups['covered_'+id]
  indices=[v.index for v in source_body.data.vertices if any(w.group==source_group.index and w.weight>.5 for w in v.groups)]
  group=body.vertex_groups.new(name='covered_'+id);group.add(indices,1,'REPLACE')
  if 'contact_'+id in source_body.vertex_groups:
   contact_group=source_body.vertex_groups['contact_'+id];body.vertex_groups.new(name='contact_'+id).add([v.index for v in source_body.data.vertices if any(w.group==contact_group.index and w.weight>.5 for w in v.groups)],1,'REPLACE')
  m=body.modifiers.new('Hide body beneath '+id,'MASK');m.vertex_group=group.name;m.invert_vertex_group=True;m.threshold=.5
  coverage[id]={'vertices':len(indices),'source_rest_delta_m':delta,'source':str(path),'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest()};garments.append(garment)
  for o in list(bpy.data.objects):
   if o not in before and o!=garment:bpy.data.objects.remove(o,do_unlink=True)
 evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(evaluated);masked=bpy.data.objects.new('outfit_masked_body',mesh);bpy.context.collection.objects.link(masked)
 assert [g.name for g in masked.vertex_groups]==[g.name for g in body.vertex_groups]
 m=masked.modifiers.new('Shared body skin','ARMATURE');m.object=arm;masked.parent=arm
 write=export_uv if args.uv_export else export
 write(args.output_dir/'garments.glb',[arm,*garments]);write(args.output_dir/'body.glb',[arm,masked,*body_parts]);write(args.output_dir/'outfit.glb',[arm,masked,*body_parts,*garments]);bpy.data.objects.remove(masked,do_unlink=True)
 camera=setup_render();camera.data.ortho_scale=2.03;reset(arm);bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir/'outfit.blend').resolve()))
 report={'pieces':args.pieces.split(','),'foundation':str(args.foundation),'foundation_sha256':hashlib.sha256(args.foundation.read_bytes()).hexdigest(),'status':'combination candidate; motion/runtime acceptance pending','coverage':coverage,'poses':[]}
 for label,motion,frame,pos in [('rest-front',None,0,(0,-3,.92)),('rest-back',None,0,(0,3,.92)),('rest-side',None,0,(3,0,.92)),('three-quarter',None,0,(2,-3,.92)),('walk-13','walk',13,(0,-3,.92)),('run-8','run',8,(0,-3,.92))]:
  reset(arm)
  if motion:
   action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
  bpy.context.view_layer.update();body_trees=[bvh(o)[0] for o in [body,*body_parts]];trees=[bvh(o)[0] for o in garments];body_counts=[sum(len(bt.overlap(t)) for bt in body_trees) for t in trees];layer_pairs={f'{garments[a].name}/{garments[b].name}':len(trees[a].overlap(trees[b])) for a in range(len(trees)) for b in range(a+1,len(trees))}
  report['poses'].append({'pose':label,'body_pairs':body_counts,'garment_layer_pairs':layer_pairs})
  camera.location=pos;camera.rotation_euler=(Vector((0,0,.92))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str((args.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
 (args.output_dir/'assembly-report.json').write_text(json.dumps(report,indent=2));print('OUTFIT_ASSEMBLY',json.dumps(report))

if __name__=='__main__':main()
