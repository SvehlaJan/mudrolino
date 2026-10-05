"""Author straight trousers with a quad crotch fork and shared rig weights."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Matrix,Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,select,export,setup_render,bvh
from build_catalog_head import material,tube,sphere

def weights(p):
 left=max(0,min(1,.5+p.x/.08));right=1-left
 if p.z>=.960:return {'Hips':1}
 if p.z>.790:
  t=(.960-p.z)/.170
  return {'Hips':1-t,'LeftUpLeg':left*t,'RightUpLeg':right*t}
 t=max(0,min(1,(.560-p.z)/.150))
 return {'LeftUpLeg':left*(1-t),'RightUpLeg':right*(1-t),'LeftLeg':left*t,'RightLeg':right*t}

def surface_y(x,z):
 t=max(0,min(1,(z-.858)/(.982-.858)));rx=.205*(1-t)+.180*t;ry=.169*(1-t)+.147*t
 return .010+ry*(max(0,1-(abs(x)/rx)**2.4))**(1/2.4)

def create_pants(arm):
 n=32;vertices=[];faces=[]
 for z,rx,ry in [(.982,.180,.147),(.968,.181,.148),(.921,.194,.163),(.858,.205,.169)]:
  for i in range(n):
   theta=2*math.pi*i/n;c,s=math.cos(theta),math.sin(theta)
   vertices.append((rx*math.copysign(abs(c)**.84,c),.010+ry*math.copysign(abs(s)**.84,s),z))
 for row in range(3):
  for i in range(n):
   j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
 # Seven shared inseam points join the two leg openings without duplicate
 # intersecting tubes or a cropped body shell.
 crotch=[]
 for i in range(1,8):
  theta=math.pi*i/8;crotch.append(len(vertices));vertices.append((0,.010+.169*math.cos(theta),.858-.094*math.sin(theta)))
 for prefix,sign in [('Left',1),('Right',-1)]:
  if sign==1:
   outer=[3*n+(i%n) for i in range(24,41)];boundary=outer+crotch
   angles=[-math.pi/2+math.pi*i/16 for i in range(17)]+[math.pi/2+math.pi*i/8 for i in range(1,8)]
  else:
   outer=[3*n+i for i in range(8,25)];boundary=outer+list(reversed(crotch))
   angles=[math.pi/2+math.pi*i/16 for i in range(17)]+[3*math.pi/2+math.pi*i/8 for i in range(1,8)]
  previous=boundary
  for z,rx,ry in [(.750,.103,.120),(.670,.098,.109),(.570,.090,.096),(.515,.085,.091),(.475,.083,.089),(.430,.080,.091),(.330,.078,.088),(.230,.073,.080),(.154,.071,.075),(.141,.071,.075),(.135,.072,.076)]:
   a=arm.data.bones[prefix+('UpLeg' if z>.483 else 'Leg')].head_local
   b=arm.data.bones[prefix+('Leg' if z>.483 else 'Foot')].head_local
   t=(a.z-z)/(a.z-b.z);center=a.lerp(b,t);center.z=z
   ring=[]
   for angle in angles:ring.append(len(vertices));vertices.append((center.x+rx*math.cos(angle),center.y+ry*math.sin(angle),z))
   for i in range(len(ring)):
    j=(i+1)%len(ring);faces.append((previous[i],previous[j],ring[j],ring[i]))
   previous=ring
 mesh=bpy.data.meshes.new('B01 tailored quad trousers');mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new('B01_straight_trousers',mesh);bpy.context.collection.objects.link(obj)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 for bone in arm.data.bones:obj.vertex_groups.new(name=bone.name)
 for v in mesh.vertices:
  for name,w in weights(v.co).items():
   if w>1e-6:obj.vertex_groups[name].add([v.index],w,'REPLACE')
 select(obj);m=obj.modifiers.new('Rounded trouser tailoring','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name)
 m=obj.modifiers.new('Cloth edge thickness','SOLIDIFY');m.thickness=.0025;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name)
 # Let the lower cuff share part of the ankle flex instead of remaining
 # rigidly on the shin while the shoe rotates underneath it.
 for v in obj.data.vertices:
  if v.co.z>.240:continue
  t=.5*max(0,min(1,(.240-v.co.z)/.080));cuff_weights={w.group:w.weight*(1-t) for w in v.groups};index=obj.vertex_groups[('Left' if v.co.x>0 else 'Right')+'Foot'].index;cuff_weights[index]=cuff_weights.get(index,0)+t
  for index in [w.group for w in v.groups]:obj.vertex_groups[index].remove([v.index])
  for index,w in cuff_weights.items():
   if w>1e-7:obj.vertex_groups[index].add([v.index],w,'REPLACE')
 navy=material('A navy trouser fabric',(.028,.052,.105));trim=material('A navy trouser trim',(.038,.066,.122));obj.data.materials.append(navy);obj.data.materials.append(trim)
 for f in obj.data.polygons:
  f.use_smooth=True;z=sum(obj.data.vertices[i].co.z for i in f.vertices)/len(f.vertices);f.material_index=1 if z>.969 or z<.150 else 0
 pieces=[obj]
 # Keep cloth trim separate from sewn detail roles for attachment checks;
 # the material values and original authored rest construction are unchanged.
 trim=material('A navy trouser seams',(.038,.066,.122))
 cloth_tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[tuple(f.vertices) for f in obj.data.polygons])
 # Front pocket openings, fly and waistband button.
 for sign in (-1,1):
  points=[]
  for x,z in [(.116,.962),(.133,.941),(.151,.915)]:points.append((sign*x,-surface_y(x,z)+.020-.003,z))
  pieces.append(tube('B01 front pocket opening',points,.0017,trim))
 pieces.append(tube('B01 fly seam',[(.004,-.140,.965),(.008,-.151,.923),(.005,-.155,.882)],.0012,trim))
 pieces.append(sphere('B01 waistband button',(0,-.140,.972),(.007,.003,.007),trim,segments=16,rings=8))
 # Curved patch-pocket surfaces follow the pelvis loft, with rounded corners.
 for sign in (-1,1):
  vs=[];fs=[]
  for row in range(6):
   z=.942-row*.012
   for col in range(6):
    x=sign*(.045+col*.013);vs.append((x,surface_y(x,z)+.003,z))
  for row in range(5):
   for col in range(5):i=row*6+col;fs.append((i,i+1,i+7,i+6))
  me=bpy.data.meshes.new('B01 back patch pocket');me.from_pydata(vs,[],fs);me.update();po=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(po);po.data.materials.append(trim)
  select(po);m=po.modifiers.new('Rounded pocket','SUBSURF');m.levels=2;bpy.ops.object.modifier_apply(modifier=m.name)
  for v in po.data.vertices:
   point,normal,_,_=cloth_tree.find_nearest(v.co)
   if normal.y<0:normal.negate()
   v.co=point+normal*.0017
  m=po.modifiers.new('Pocket thickness','SOLIDIFY');m.thickness=.0012;bpy.ops.object.modifier_apply(modifier=m.name)
  for f in po.data.polygons:f.use_smooth=True
  pieces.append(po)
 # Small belt-loop ribbons around the waist, kept broad at runtime scale.
 for x,y in [(-.115,-.123),(.115,-.123),(-.125,.129),(.125,.129),(0,.157)]:
  y=(surface_y(x,.970)+.0025) if y>0 else (-surface_y(x,.970)+.020-.0025)
  bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,.970));o=bpy.context.object;o.name='B01 belt loop';o.scale=(.014,.004,.035);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(trim)
  select(o);m=o.modifiers.new('Soft belt loop edges','BEVEL');m.width=.002;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name);pieces.append(o)
 # All stitched details inherit the nearby trouser surface's actual weights.
 tree=KDTree(len(obj.data.vertices))
 for v in obj.data.vertices:tree.insert(v.co,v.index)
 tree.balance()
 for o in pieces[1:]:
  for bone in arm.data.bones:o.vertex_groups.new(name=bone.name)
  for v in o.data.vertices:
   _,index,_=tree.find(o.matrix_world@v.co)
   for w in obj.data.vertices[index].groups:o.vertex_groups[w.group].add([v.index],w.weight,'REPLACE')
 bpy.ops.object.select_all(action='DESELECT')
 for o in pieces:o.select_set(True)
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 for v in obj.data.vertices:
  ws=sorted([(w.group,w.weight) for w in v.groups],key=lambda w:-w[1])[:4];total=sum(w for _,w in ws);assert total>0
  for g in obj.vertex_groups:g.remove([v.index])
  for i,w in ws:obj.vertex_groups[i].add([v.index],w/total,'REPLACE')
 m=obj.modifiers.new('Canonical trousers skin','ARMATURE');m.object=arm;obj.parent=arm;obj.matrix_world=Matrix.Identity(4)
 return obj

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output_dir.mkdir(parents=True,exist_ok=True);a.review_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()));arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm);body_parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body]
 pants=create_pants(arm);group=body.vertex_groups.new(name='covered_B01');indices=[]
 lower_names={'Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'}
 for v in body.data.vertices:
  amount=sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower_names)
  if .118<v.co.z<.956 and amount>.50 and abs(v.co.x)<.28:indices.append(v.index)
 group.add(indices,1,'REPLACE');m=body.modifiers.new('Hide body beneath B01','MASK');m.vertex_group=group.name;m.invert_vertex_group=True;m.threshold=.5
 evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(evaluated);masked=bpy.data.objects.new('body_underlayer_male_B01',mesh);bpy.context.collection.objects.link(masked)
 assert [g.name for g in masked.vertex_groups]==[g.name for g in body.vertex_groups]
 m=masked.modifiers.new('Canonical body skin','ARMATURE');m.object=arm;masked.parent=arm
 export(a.output_dir/'B01.glb',[arm,pants]);export(a.output_dir/'body-B01.glb',[arm,masked,*body_parts]);bpy.data.objects.remove(masked,do_unlink=True)
 camera=setup_render();camera.data.ortho_scale=2.03;reset(arm);bpy.ops.wm.save_as_mainfile(filepath=str((a.output_dir/'B01.blend').resolve()))
 report={'id':'B01','status':'candidate; full-cycle/style/runtime acceptance pending','vertices':len(pants.data.vertices),'polygons':len(pants.data.polygons),'groups':len(pants.vertex_groups),'covered_body_vertices':len(indices),'poses':[]}
 for label,motion,frame,pos in [('rest-front',None,0,(0,-3,.92)),('rest-back',None,0,(0,3,.92)),('rest-side',None,0,(3,0,.92)),('walk-13','walk',13,(0,-3,.92)),('run-8','run',8,(0,-3,.92))]:
  reset(arm)
  if motion:
   action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
  bpy.context.view_layer.update();bt,_=bvh(body);gt,_=bvh(pants);count=len(bt.overlap(gt));report['poses'].append({'pose':label,'body_garment_pairs':count})
  camera.location=pos;camera.rotation_euler=(Vector((0,0,.92))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
 (a.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2));print('B01_CANDIDATE',json.dumps(report))

def create_fitted_pants(arm,body):
 from catalog_bottom_geometry import fit_bottom_cuff,fit_bottom_rear_hip_weights
 from catalog_correctives import add_rear_hip_compression_correctives
 obj=create_pants(arm)
 for modifier in list(obj.modifiers):
  if modifier.type=='ARMATURE':obj.modifiers.remove(modifier)
 obj.parent=None
 fit_bottom_cuff(obj,arm,body,posterior_ease=.030)
 fit_bottom_rear_hip_weights(obj,body)
 add_rear_hip_compression_correctives(obj,arm,body,margin=.004)
 return obj

if __name__=='__main__':
 from catalog_piece import build_piece
 from catalog_bottom_geometry import full_trouser_coverage
 build_piece('B01',create_fitted_pants,full_trouser_coverage)
