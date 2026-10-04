"""Author rounded strap sneakers with controlled foot/toe deformation."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,select,export,setup_render,bvh
from build_catalog_head import material,tube,sphere

def loft(name,rows,mat,cap=False):
 n=len(rows[0]);vs=[tuple(v) for row in rows for v in row];fs=[]
 for r in range(len(rows)-1):
  for i in range(n):j=(i+1)%n;fs.append((r*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i))
 if cap:fs.extend([tuple(reversed(range(n))),tuple((len(rows)-1)*n+i for i in range(n))])
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 for f in me.polygons:f.use_smooth=True
 return o

def ring(z,rx,ry,cy,n=40):
 return [Vector((rx*math.sin(a)*(1-.12*max(0,math.cos(a))),cy+ry*math.cos(a),z)) for a in [2*math.pi*i/n for i in range(n)]]

def create_shoes(arm,body):
 blue=material('A cornflower sneaker panels',(.12,.285,.66));ivory=material('A ivory sneaker upper',(.86,.82,.71));sole_mat=material('A ivory rubber sole',(.77,.735,.655));inside=material('A blue collar lining',(.09,.23,.58))
 shoe_objects=[]
 for sign,prefix in [(1,'Left'),(-1,'Right')]:
  sole=loft('F01 rounded ivory sole', [ring(z,rx,ry,cy) for z,rx,ry,cy in [(-.005,.070,.139,-.063),(.002,.078,.147,-.063),(.030,.078,.147,-.063),(.038,.074,.143,-.063)]],sole_mat,True)
  upper=loft('F01 blue ivory upper',[ring(z,rx,ry,cy) for z,rx,ry,cy in [(.034,.074,.143,-.063),(.051,.074,.141,-.062),(.076,.072,.136,-.059),(.095,.067,.112,-.037),(.104,.061,.085,-.008),(.113,.063,.073,.011),(.117,.063,.073,.011)]],ivory)
  upper.data.materials.append(blue)
  for f in upper.data.polygons:
   sector=f.index%40;f.material_index=1 if 12<=sector<=27 or sector<=4 or sector>=35 else 0
  select(upper);m=upper.modifiers.new('Soft upper edges','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name);m=upper.modifiers.new('Upper thickness','SOLIDIFY');m.thickness=.0025;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name)
  collar_rows=[ring(.118,.064,.074,.011),ring(.112,.064,.074,.011),ring(.112,.060,.070,.011),ring(.118,.060,.070,.011)]
  collar=loft('F01 soft collar rim',collar_rows+[collar_rows[0]],inside)
  tongue=sphere('F01 rounded blue tongue',(0,-.068,.101),(.038,.026,.012),blue,segments=24,rings=12)
  # A single broad closure arches over the instep, with rounded edges.
  vs=[];fs=[]
  for row in range(5):
   y=-.084+row*.010
   for col in range(13):
    x=-.066+col*.011;z=.085+.028*math.sqrt(max(0,1-(x/.070)**2));vs.append((x,y,z))
  for row in range(4):
   for col in range(12):i=row*13+col;fs.append((i,i+1,i+14,i+13))
  me=bpy.data.meshes.new('F01 broad strap');me.from_pydata(vs,[],fs);me.update();strap=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(strap);me.materials.append(ivory)
  select(strap);m=strap.modifiers.new('Strap thickness','SOLIDIFY');m.thickness=.004;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name);m=strap.modifiers.new('Soft strap edges','BEVEL');m.width=.002;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
  pieces=[sole,upper,collar,tongue,strap];foot=arm.data.bones[prefix+'Foot'].head_local;toe=arm.data.bones[prefix+'ToeBase'].head_local;angle=math.atan2(toe.x-foot.x,foot.y-toe.y)
  rot=Matrix.Rotation(angle,4,'Z');translation=Matrix.Translation(Vector((foot.x,foot.y,0)))
  ankle_vertices=[v for v in body.data.vertices if .095<v.co.z<.180 and v.co.x*sign>0];tree=KDTree(len(ankle_vertices))
  for v in ankle_vertices:tree.insert(v.co,v.index)
  tree.balance()
  for o in pieces:
   bpy.context.view_layer.update()
   for bone in arm.data.bones:o.vertex_groups.new(name=bone.name)
   for v in o.data.vertices:
    local=o.matrix_world@v.co;t=max(0,min(1,(-local.y-.070)/.090))
    # Heel, collar and strap stay on Foot; the toe box/sole flex gradually.
    weights={prefix+'Foot':1-t,prefix+'ToeBase':t}
    amount=max(0,min(1,(local.z-.092)/.018))*max(0,min(1,(local.y+.090)/.020))
    if amount:
     _,index,_=tree.find(translation@rot@local);proxy={body.vertex_groups[w.group].name:w.weight for w in body.data.vertices[index].groups if body.vertex_groups[w.group].name in [prefix+'Foot',prefix+'Leg',prefix+'UpLeg',prefix+'ToeBase']};total=sum(proxy.values());assert total>0
     weights={name:w*(1-amount) for name,w in weights.items()}
     for name,w in proxy.items():weights[name]=weights.get(name,0)+amount*w/total
    for name,w in weights.items():
     if w>1e-6:o.vertex_groups[name].add([v.index],w,'REPLACE')
   o.matrix_world=translation@rot@o.matrix_world
  bpy.ops.object.select_all(action='DESELECT')
  for o in pieces:o.select_set(True)
  bpy.context.view_layer.objects.active=sole;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);sole.name='F01_'+prefix.lower()+'_sneaker';shoe_objects.append(sole)
 bpy.ops.object.select_all(action='DESELECT')
 for o in shoe_objects:o.select_set(True)
 bpy.context.view_layer.objects.active=shoe_objects[0];bpy.ops.object.join();shoe=shoe_objects[0];shoe.name='F01_strap_sneakers'
 m=shoe.modifiers.new('Shared foot toe skin','ARMATURE');m.object=arm;shoe.parent=arm;shoe.matrix_world=Matrix.Identity(4)
 return shoe

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output_dir.mkdir(parents=True,exist_ok=True);a.review_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()));bpy.context.preferences.filepaths.save_version=0;arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm);body_parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body];shoes=create_shoes(arm,body)
 group=body.vertex_groups.new(name='covered_F01');indices=[]
 for v in body.data.vertices:
  lower_amount=sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in ['LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'])
  if v.co.z<.116 and lower_amount>.50:indices.append(v.index)
 group.add(indices,1,'REPLACE');m=body.modifiers.new('Hide body beneath F01','MASK');m.vertex_group=group.name;m.invert_vertex_group=True;m.threshold=.5
 evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=bpy.data.meshes.new_from_object(evaluated);masked=bpy.data.objects.new('body_underlayer_male_F01',me);bpy.context.collection.objects.link(masked);m=masked.modifiers.new('Canonical skin','ARMATURE');m.object=arm;masked.parent=arm
 export(a.output_dir/'F01.glb',[arm,shoes]);export(a.output_dir/'body-F01.glb',[arm,masked,*body_parts]);bpy.data.objects.remove(masked,do_unlink=True)
 camera=setup_render();camera.data.ortho_scale=.62;reset(arm);bpy.ops.wm.save_as_mainfile(filepath=str((a.output_dir/'F01.blend').resolve()))
 report={'id':'F01','status':'candidate; dense motion/style/runtime acceptance pending','vertices':len(shoes.data.vertices),'polygons':len(shoes.data.polygons),'groups':len(shoes.vertex_groups),'max_influences':max(len(v.groups) for v in shoes.data.vertices),'covered_body_vertices':len(indices),'poses':[]}
 for label,motion,frame,pos in [('rest-front',None,0,(0,-3,.28)),('rest-side',None,0,(3,0,.22)),('rest-back',None,0,(0,3,.28)),('three-quarter',None,0,(2,-3,.26)),('walk-13','walk',13,(0,-3,.28)),('run-8','run',8,(0,-3,.28))]:
  reset(arm)
  if motion:action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
  bpy.context.view_layer.update();bt,_=bvh(body);st,_=bvh(shoes);report['poses'].append({'pose':label,'body_pairs':len(bt.overlap(st))})
  camera.location=pos;camera.rotation_euler=(Vector((0,-.015,.12))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
 (a.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2));print('F01_CANDIDATE',json.dumps(report))

if __name__=='__main__':main()
