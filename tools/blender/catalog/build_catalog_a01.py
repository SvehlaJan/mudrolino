"""Author the orange baseball cap, clear of H01 hair and bound to Head."""
import bpy,bmesh,sys,argparse,json,math
from pathlib import Path
from mathutils import Vector,Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,select,export,setup_render,bvh
from build_catalog_head import material,sphere

def mesh_object(name,vs,fs,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 for f in me.polygons:f.use_smooth=True
 return o

def crown_point(phi,theta,offset=0):
 return Vector(((.181+offset)*math.sin(phi)*math.cos(theta),.015+(.175+offset)*math.sin(phi)*math.sin(theta),1.703+(.212+offset)*math.cos(phi)))

def create_cap(arm):
 orange=material('A tangerine cap fabric',(.86,.22,.040));seam=material('A cap panel seams',(.74,.165,.028));navy=material('A navy brim underside',(.028,.052,.105));blue=material('A blue cap adjustment band',(.12,.285,.66))
 n=64;rows=17;vs=[tuple(crown_point(.07+(math.pi/2-.07)*r/(rows-1),2*math.pi*i/n)) for r in range(rows) for i in range(n)];fs=[]
 for r in range(rows-1):
  for i in range(n):
   if r>=rows-3 and 13<=i<=18:continue
   j=(i+1)%n;fs.append((r*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i))
 fs.append(tuple(reversed(range(n))))
 crown=mesh_object('A01 soft cap crown',vs,fs,orange);select(crown);m=crown.modifiers.new('Cap fabric thickness','SOLIDIFY');m.thickness=.003;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name)
 # A broad softly curved visor with orange top and navy underside.
 vs=[];fs=[];cols=25;rows=9
 for row in range(rows):
  t=row/(rows-1)
  for col in range(cols):
   u=-1+2*col/(cols-1);x=.150*u;y=.015-.175*math.sqrt(max(0,1-(x/.181)**2))-.102*t*max(0,1-u*u)**.4;z=1.703-.007*u*u-.017*t+.012*u*u*t;vs.append((x,y,z))
 for row in range(rows-1):
  for col in range(cols-1):i=row*cols+col;fs.append((i,i+cols,i+cols+1,i+1))
 brim=mesh_object('A01 curved visor',vs,fs,orange);brim.data.materials.append(navy);select(brim);m=brim.modifiers.new('Rounded visor','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name);m=brim.modifiers.new('Navy visor underside','SOLIDIFY');m.thickness=.006;m.offset=-1;m.material_offset=1;bpy.ops.object.modifier_apply(modifier=m.name)
 parts=[crown,brim,sphere('A01 crown button',(0,.015,1.915),(.010,.010,.006),orange,segments=16,rings=8)]
 for theta in [0,math.pi/3,2*math.pi/3,math.pi,4*math.pi/3,5*math.pi/3]:
  points=[crown_point(.13+(math.pi/2-.13)*i/12,theta,.0018) for i in range(13)];d=bpy.data.curves.new('A01 panel seam','CURVE');d.dimensions='3D';d.bevel_depth=.0009;d.bevel_resolution=0;s=d.splines.new('POLY');s.points.add(len(points)-1)
  for p,co in zip(s.points,points):p.co=(*co,1)
  o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);d.materials.append(seam);select(o);bpy.ops.object.convert(target='MESH');parts.append(bpy.context.object)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.191,1.708));band=bpy.context.object;band.name='A01 blue back adjustment band';band.scale=(.078,.006,.017);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);band.data.materials.append(blue);select(band);m=band.modifiers.new('Rounded adjustment band','BEVEL');m.width=.002;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name);parts.append(band)
 for o in parts:
  for bone in arm.data.bones:o.vertex_groups.new(name=bone.name)
  o.vertex_groups['Head'].add(list(range(len(o.data.vertices))),1,'REPLACE')
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=crown;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);crown.name='A01_baseball_cap';m=crown.modifiers.new('Head attachment','ARMATURE');m.object=arm;crown.parent=arm;crown.matrix_world=Matrix.Identity(4)
 return crown

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output_dir.mkdir(parents=True,exist_ok=True);a.review_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()));bpy.context.preferences.filepaths.save_version=0;arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];head=bpy.data.objects['H01_head'];reset(arm);parts=[o for o in bpy.data.objects if o.type=='MESH'];cap=create_cap(arm);body.vertex_groups.new(name='covered_A01')
 export(a.output_dir/'A01.glb',[arm,cap]);export(a.output_dir/'body-A01.glb',[arm,*parts]);camera=setup_render();camera.data.ortho_scale=.65;reset(arm);bpy.ops.wm.save_as_mainfile(filepath=str((a.output_dir/'A01.blend').resolve()))
 report={'id':'A01','status':'candidate; head/hair clearance, motion and style acceptance pending','vertices':len(cap.data.vertices),'polygons':len(cap.data.polygons),'attachment':'Head, weight 1','covered_body_vertices':0,'poses':[]}
 for label,motion,frame,pos in [('rest-front',None,0,(0,-3,1.72)),('rest-back',None,0,(0,3,1.72)),('rest-side',None,0,(3,0,1.72)),('three-quarter',None,0,(2,-3,1.72)),('walk-13','walk',13,(0,-3,1.72)),('run-8','run',8,(0,-3,1.72))]:
  reset(arm)
  if motion:action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
  bpy.context.view_layer.update();ht,_=bvh(head);ct,_=bvh(cap);report['poses'].append({'pose':label,'head_hair_pairs':len(ht.overlap(ct))});camera.location=pos;camera.rotation_euler=(Vector((0,-.020,1.69))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
 (a.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2));print('A01_CANDIDATE',json.dumps(report))

if __name__=='__main__':main()
