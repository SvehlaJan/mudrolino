"""Author H01's rounded face and sculpted hair on the shared metre-scale rig."""
import argparse, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import select,reset,export,setup_render

def material(name,color,roughness=.8):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
 p.inputs['Specular IOR Level'].default_value=.28
 return m

def smooth(obj,mat):
 obj.data.materials.append(mat)
 for p in obj.data.polygons:p.use_smooth=True
 return obj

def sphere(name,location,scale,mat,rotation=(0,0,0),segments=32,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=location)
 o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler=rotation
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return smooth(o,mat)

def tube(name,points,radius,mat):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=12;d.bevel_depth=radius;d.bevel_resolution=3;d.use_fill_caps=True
 s=d.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(mat);select(o);bpy.ops.object.convert(target='MESH')
 return bpy.context.object

def surface_point(phi,theta,offset=0):
 c=math.cos(phi);s=math.sin(phi)
 # Slightly narrower rounded jaw; forehead and cheeks remain broad.
 jaw=1-.16*max(0,-c)
 return Vector(((.139+offset)*s*math.cos(theta)*jaw,
                .012+(.131+offset)*s*math.sin(theta),
                1.608+(.172*c if c>=0 else -.148*min(1,-c/.92))+offset*c))

def face_y(x,z,offset=.002):
 c=(z-1.608)/(.172 if z>=1.608 else .160)
 c=max(-.99,min(.99,c));phi=math.acos(c)
 rx=surface_point(phi,0).x
 theta=2*math.pi-math.acos(max(-.99,min(.99,x/rx)))
 return surface_point(phi,theta).y-offset

def loft(name,rows,mat):
 n=len(rows[0]);vs=[tuple(v) for row in rows for v in row];fs=[]
 for r in range(len(rows)-1):
  for i in range(n-1):fs.append((r*n+i,r*n+i+1,(r+1)*n+i+1,(r+1)*n+i))
 m=bpy.data.meshes.new(name);m.from_pydata(vs,[],fs);m.update()
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
 return smooth(o,mat)

def head_objects():
 skin=material('A warm peach skin',(.72,.385,.215));ear=material('A ear warmth',(.64,.27,.15))
 hair=material('A chestnut hair',(.082,.030,.015));beard_mat=material('A soft chestnut beard',(.155,.061,.027));hair_light=material('A chestnut waves',(.110,.041,.020))
 white=material('A eye white',(.88,.86,.79),.32);iris=material('A brown iris',(.14,.054,.019),.26)
 pupil=material('A dark pupil',(.006,.003,.002),.18);spark=material('A eye highlight',(1,1,1),.18)
 lip=material('A warm smile',(.24,.066,.032),.78)
 objects=[]
 rows=[[surface_point(math.pi*r/64,2*math.pi*i/96) for i in range(97)] for r in range(65)]
 head=loft('H01 rounded face',rows,skin);objects.append(head)
 # Merge the poles and circumferential seam to make a closed head volume.
 bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(head.data);bm.free()
 for sign in (-1,1):
  objects.append(sphere('H01 ear',(sign*.136,.018,1.620),(.024,.018,.042),skin))
  objects.append(sphere('H01 ear inset',(sign*.149,.001,1.620),(.010,.008,.024),ear))
  x=sign*.055
  objects.append(sphere('H01 eye white',(x,-.095,1.634),(.025,.017,.030),white))
  objects.append(sphere('H01 brown iris',(x,-.112,1.634),(.013,.0025,.019),iris))
  objects.append(sphere('H01 pupil',(x,-.1145,1.634),(.0065,.0015,.0135),pupil))
  objects.append(sphere('H01 eye sparkle',(x-.004,-.116,1.641),(.0025,.001,.0035),spark,segments=16,rings=8))
  objects.append(tube('H01 brow',[(sign*x,face_y(sign*x,z,.004),z) for x,z in [(.026,1.684),(.052,1.691),(.081,1.684)]],.0065,hair))
 objects.append(sphere('H01 nose',(0,-.113,1.593),(.021,.028,.022),skin))
 objects.append(tube('H01 smile',[(x,face_y(x,z,.0035),z) for x,z in [(-.043,1.565),(-.022,1.555),(0,1.553),(.022,1.555),(.043,1.565)]],.003,lip))
 objects.append(tube('H01 lower lip',[(x,face_y(x,z,.003),z) for x,z in [(-.022,1.550),(0,1.548),(.022,1.550)]],.003,skin))
 # Tint the head surface itself for softly blended stubble. Separate beard
 # shells cast an artificial cheek ridge and hard seam behind the ears.
 head_skin=skin.copy();head_skin.name='A face and stubble';head.data.materials.clear();head.data.materials.append(head_skin)
 colors=head.data.color_attributes.new(name='Head tint',type='FLOAT_COLOR',domain='POINT')
 def smoothstep(x):
  x=max(0,min(1,x));return x*x*(3-2*x)
 for v in head.data.vertices:
  theta=math.atan2(v.co.y-.012,v.co.x)
  top_z=1.610-.073*abs(math.sin(theta))**3
  lower=smoothstep((top_z-v.co.z)/.030)
  front=smoothstep(-math.sin(theta)/.40)
  mouth_clear=smoothstep(((v.co.x/.050)**2+((v.co.z-1.561)/.023)**2-.65)/.75)
  amount=lower*front*mouth_clear*.88
  skin_color=(.72,.385,.215);beard_color=(.155,.061,.027)
  colors.data[v.index].color=(*(skin_color[i]*(1-amount)+beard_color[i]*amount for i in range(3)),1)
 node=head_skin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Head tint'
 head_skin.node_tree.links.new(node.outputs['Color'],head_skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 for sign in (-1,1):
  objects.append(tube('H01 moustache',[(sign*x,face_y(sign*x,z,.003),z) for x,z in [(.006,1.576),(.020,1.574),(.033,1.568)]],.0035,hair))
 # Close-fitting cap plus broad wave masses establishes the hair silhouette.
 cap_rows=[]
 for r in range(17):
  row=[]
  for i in range(49):
   theta=2*math.pi*i/48;front=max(0,-math.sin(theta));back=max(0,math.sin(theta))
   phi_end=1.50-.64*front+.29*back
   row.append(surface_point(phi_end*r/16,theta,.010))
  cap_rows.append(row)
 cap=loft('H01 hair foundation',cap_rows,hair)
 bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(cap.data);bm.free()
 select(cap);m=cap.modifiers.new('Closed scalp volume','SOLIDIFY');m.thickness=.012;m.offset=-1;bpy.ops.object.modifier_apply(modifier=m.name)
 objects.append(cap)
 waves=[(-.091,-.068,1.716,.044,.053,.039,-.35),(-.040,-.091,1.740,.043,.049,.041,-.4),(.017,-.092,1.753,.045,.051,.042,-.35),(.075,-.081,1.743,.047,.048,.039,-.45),
        (-.106,.025,1.707,.032,.061,.039,.35),(-.055,.035,1.760,.041,.061,.035,.3),(.006,.043,1.784,.044,.059,.033,.4),(.069,.039,1.764,.043,.061,.035,.45),(.112,.013,1.705,.033,.055,.045,.6),
        (-.086,.092,1.694,.037,.045,.046,.0),(-.029,.111,1.714,.039,.042,.047,.0),(.033,.108,1.718,.040,.043,.047,.0),(.091,.080,1.693,.034,.041,.046,.0)]
 for sign in (-1,1):
  for row in range(3):
   waves.append((sign*(.120-.012*row),.040+.014*row,1.644+.041*row,.027,.048,.037,sign*.45))
 for x in (-.086,-.043,0,.043,.086):
  for row in range(2):waves.append((x,.119-.006*row,1.630+.045*row,.029,.024,.032,.3))
 for i,(x,y,z,sx,sy,sz,angle) in enumerate(waves):objects.append(sphere('H01 sculpted wave',(x,y,z),(sx,sy,sz),hair_light if i%4==1 else hair,(0,angle,.38),segments=24,rings=12))
 # Blend the intersecting wave masses into a continuous sculpted surface.
 hair_parts=[o for o in objects if o.name.startswith(('H01 hair','H01 sculpted'))]
 bpy.ops.object.select_all(action='DESELECT')
 for o in hair_parts:o.select_set(True)
 bpy.context.view_layer.objects.active=hair_parts[0];bpy.ops.object.join();hair_obj=bpy.context.object
 hair_obj.data.materials.clear();hair_obj.data.materials.append(hair)
 m=hair_obj.modifiers.new('Unified sculpted waves','REMESH');m.mode='VOXEL';m.voxel_size=.0045; m.use_smooth_shade=True
 bpy.ops.object.modifier_apply(modifier=m.name)
 m=hair_obj.modifiers.new('Soft wave transitions','SMOOTH');m.factor=.65;m.iterations=3;bpy.ops.object.modifier_apply(modifier=m.name)
 objects=[o for o in objects if o not in hair_parts]+[hair_obj]
 return objects,skin

def main():
 p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True)
 args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output_dir.mkdir(parents=True,exist_ok=True);args.review_dir.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.open_mainfile(filepath=str(args.foundation.resolve()));arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm)
 # Remove the fused placeholder head with a geometric neck cut. Preserve all
 # body deform data; the new head is independently replaceable.
 bm=bmesh.new();bm.from_mesh(body.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000025)
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,plane_co=(0,0,1.390),plane_no=(0,0,1),clear_outer=True)
 boundary=[v for v in bm.verts if abs(v.co.z-1.390)<.00001]
 boundary.sort(key=lambda v:math.atan2(v.co.y-.018,v.co.x))
 assert len(boundary)>20
 deform=bm.verts.layers.deform.verify();last=boundary
 for z,rx,ry in [(1.415,.087,.078),(1.439,.072,.065),(1.473,.062,.058),(1.510,.059,.056)]:
  ring=[]
  for original in boundary:
   theta=math.atan2(original.co.y-.018,original.co.x)
   v=bm.verts.new((rx*math.cos(theta),.018+ry*math.sin(theta),z))
   t=max(0,min(1,(z-1.405)/.085))
   v[deform][body.vertex_groups['neck'].index]=1-t;v[deform][body.vertex_groups['Head'].index]=t
   ring.append(v)
  for i in range(len(ring)):
   j=(i+1)%len(ring)
   try:bm.faces.new((last[i],last[j],ring[j],ring[i]))
   except ValueError:pass
  last=ring
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
 for poly in body.data.polygons:poly.use_smooth=True
 parts,skin=head_objects();body.data.materials.clear();body.data.materials.append(skin)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:
  # glTF multiplies COLOR_0 into every material that carries that attribute.
  # Joining a painted face with unpainted features otherwise fills their
  # colors with zero, turning white eyes and brown hair black in Three.js.
  if not o.data.color_attributes.get('Head tint'):
   colors=o.data.color_attributes.new(name='Head tint',type='FLOAT_COLOR',domain='POINT')
   for color in colors.data:color.color=(1,1,1,1)
  o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();head=bpy.context.object;head.name='H01_head'
 # Bake object transforms so head-only GLB and full body share the same binds.
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 g=head.vertex_groups.new(name='Head');g.add(list(range(len(head.data.vertices))),1,'REPLACE')
 m=head.modifiers.new('Shared head bone','ARMATURE');m.object=arm
 head.parent=arm;head.matrix_world=Matrix.Identity(4)
 export(args.output_dir/'H01.glb',[arm,head]);export(args.output_dir/'body-H01.glb',[arm,body,head])
 camera=setup_render();reset(arm)
 bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir/'H01.blend').resolve()))
 report={'id':'H01','status':'candidate; visual/style acceptance pending','head_vertices':len(head.data.vertices),'head_polygons':len(head.data.polygons),'materials':[m.name for m in head.data.materials],'bone':'Head','weight':1,'source':'authored Blender geometry; build_catalog_head.py'}
 for label,pos in [('front',(0,-3,1.65)),('side',(3,0,1.65)),('three-quarter',(2,-3,1.65)),('back',(0,3,1.65))]:
  camera.data.ortho_scale=.50;camera.location=pos;camera.rotation_euler=(Vector((0,0,1.630))-camera.location).to_track_quat('-Z','Y').to_euler()
  bpy.context.scene.render.filepath=str(args.review_dir/(label+'-review.png'));bpy.ops.render.render(write_still=True)
 (args.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2));print('HEAD_CANDIDATE',json.dumps(report))

if __name__=='__main__':main()
