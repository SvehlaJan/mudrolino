"""Palette-A orange pullover hoodie, with hanging hood and kangaroo pocket."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Matrix,Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_top_geometry import create_long_top,clamp
from build_catalog_t01 import reset,select,export,setup_render,bvh
from build_catalog_head import material

def mesh_object(name,vertices,faces,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for p in mesh.polygons:p.use_smooth=True
    return obj

def create_hood(orange,inside):
    # Open U-shaped neckline, softly collapsing into the back hanging bowl.
    vertices=[];faces=[];n=40;rows=9
    for row in range(rows):
        t=row/(rows-1)
        for i in range(n+1):
            angle=-.20+(math.pi+.40)*i/n;s=max(0,math.sin(angle))
            top=Vector((.121*math.cos(angle),.025+.128*math.sin(angle),1.436+.022*s))
            bottom=Vector((.086*math.cos(angle),.180+.055*s,1.285+.026*(1-s)))
            p=top.lerp(bottom,t);p.y+=.025*math.sin(math.pi*t)*s
            vertices.append(tuple(p))
    for row in range(rows-1):
        for i in range(n):
            j=row*(n+1)+i;faces.append((j,j+1,j+n+2,j+n+1))
    # Close the side margins against the upper back, leaving the hood mouth open.
    start=len(vertices);vertices.append((0,.173,1.287))
    for i in range(n):faces.append(((rows-1)*(n+1)+i,(rows-1)*(n+1)+i+1,start))
    hood=mesh_object('T02 hanging hood',vertices,faces,orange);hood.data.materials.append(inside)
    select(hood);m=hood.modifiers.new('Rounded hood folds','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name)
    m=hood.modifiers.new('Hood lining and soft rim','SOLIDIFY');m.thickness=.006;m.offset=0;m.material_offset=1;m.material_offset_rim=1;bpy.ops.object.modifier_apply(modifier=m.name)
    return hood

def create_hoodie(arm,body):
    obj=create_long_top(arm,body,'T02_pullover_hoodie')
    orange=material('A tangerine hoodie fabric',(.90,.245,.045),.87)
    rib=material('A tangerine ribbed hems',(.78,.182,.025),.90)
    inside=material('A warm orange hood lining',(.67,.139,.022),.9)
    obj.data.materials.append(orange);obj.data.materials.append(rib)
    for p in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        trim=center.z<.962 and abs(center.x)<.24
        for prefix in ['Left','Right']:
            elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local;axis=wrist-elbow
            t=(center-elbow).dot(axis)/axis.length_squared
            if abs(center.x)>.24 and t>.81:trim=True
        p.material_index=int(trim)
    tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])
    # A shallow patch on the actual smoothed front; side cut-ins indicate entries.
    vs=[];fs=[];rows=7;cols=13
    for row in range(rows):
        t=row/(rows-1);z=1.145-.153*t;width=.098+.037*math.sin(math.pi*t*.75)
        for col in range(cols):
            x=-width+2*width*col/(cols-1);vs.append((x,-.19,z))
    for row in range(rows-1):
        for col in range(cols-1):
            j=row*cols+col;fs.append((j,j+1,j+cols+1,j+cols))
    pocket=mesh_object('T02 kangaroo pocket',vs,fs,orange)
    select(pocket);m=pocket.modifiers.new('Rounded pocket corners','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name)
    for v in pocket.data.vertices:
        point,normal,_,_=tree.find_nearest(v.co)
        if normal.y>0:normal.negate()
        v.co=point+normal*.0035
    m=pocket.modifiers.new('Pocket fabric thickness','SOLIDIFY');m.thickness=.0015;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name)
    hood=create_hood(orange,inside)
    kd=KDTree(len(obj.data.vertices))
    for v in obj.data.vertices:kd.insert(v.co,v.index)
    kd.balance()
    for part in [pocket,hood]:
        for bone in arm.data.bones:part.vertex_groups.new(name=bone.name)
        for v in part.data.vertices:
            if part==hood:
                # Neck opening follows its local blend; the hanging bag follows chest.
                t=clamp((v.co.z-1.405)/.05)*clamp((.11-v.co.y)/.09)
                weights={'Spine':1-t,'neck':t}
            else:
                _,index,_=kd.find(v.co);weights={obj.vertex_groups[w.group].name:w.weight for w in obj.data.vertices[index].groups}
            for k,w in weights.items():
                if w>1e-7:part.vertex_groups[k].add([v.index],w,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for part in [obj,pocket,hood]:part.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for v in obj.data.vertices:
        weights=sorted([(w.group,w.weight) for w in v.groups],key=lambda w:-w[1])[:4];total=sum(w for _,w in weights);assert total>0
        for index in [w.group for w in v.groups]:obj.vertex_groups[index].remove([v.index])
        for index,w in weights:obj.vertex_groups[index].add([v.index],w/total,'REPLACE')
    m=obj.modifiers.new('Shared hoodie skin','ARMATURE');m.object=arm;obj.parent=arm;obj.matrix_world=Matrix.Identity(4)
    return obj

def main():
    p=argparse.ArgumentParser();p.add_argument('--foundation',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--review-dir',type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output_dir.mkdir(parents=True,exist_ok=True);a.review_dir.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()));bpy.context.preferences.filepaths.save_version=0
    arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm);parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body]
    hoodie=create_hoodie(arm,body);group=body.vertex_groups.new(name='covered_T02');indices=[]
    for v in body.data.vertices:
        p=v.co;torso=abs(p.x)<.23 and .942<p.z<1.389
        covered_arm=False
        for prefix in ['Left','Right']:
            shoulder=arm.data.bones[prefix+'Arm'].head_local;elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local
            # Projection slabs must overlap at a bent joint; otherwise a
            # narrow ring on the back of the elbow is left uncovered.
            for aa,bb,start,end in [(shoulder,elbow,-.20,1.05),(elbow,wrist,-.10,.91)]:
                axis=bb-aa;t=(p-aa).dot(axis)/axis.length_squared
                if start<=t<=end and (p-aa-axis*t).length<.13:covered_arm=True
        if torso or covered_arm:indices.append(v.index)
    group.add(indices,1,'REPLACE');m=body.modifiers.new('Hide body beneath T02','MASK');m.vertex_group=group.name;m.invert_vertex_group=True;m.threshold=.5
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(evaluated);masked=bpy.data.objects.new('body_underlayer_male_T02',mesh);bpy.context.collection.objects.link(masked)
    m=masked.modifiers.new('Canonical body skin','ARMATURE');m.object=arm;masked.parent=arm
    export(a.output_dir/'T02.glb',[arm,hoodie]);export(a.output_dir/'body-T02.glb',[arm,masked,*parts]);bpy.data.objects.remove(masked,do_unlink=True)
    camera=setup_render();camera.data.ortho_scale=2.03;reset(arm);bpy.ops.wm.save_as_mainfile(filepath=str((a.output_dir/'T02.blend').resolve()))
    report={'id':'T02','status':'candidate; complete motion/style/runtime checks pending','vertices':len(hoodie.data.vertices),'polygons':len(hoodie.data.polygons),'groups':len(hoodie.vertex_groups),'max_influences':max(len(v.groups) for v in hoodie.data.vertices),'covered_body_vertices':len(indices),'poses':[]}
    for label,motion,frame,pos in [('rest-front',None,0,(0,-3,.92)),('rest-back',None,0,(0,3,.92)),('rest-side',None,0,(3,0,.92)),('three-quarter',None,0,(2,-3,.92)),('walk-13','walk',13,(0,-3,.92)),('run-8','run',8,(0,-3,.92))]:
        reset(arm)
        if motion:
            action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update();ht,_=bvh(hoodie);counts={o.name:len(bvh(o)[0].overlap(ht)) for o in [body,*parts]}
        report['poses'].append({'pose':label,'body_pairs':counts})
        camera.location=pos;camera.rotation_euler=(Vector((0,0,.92))-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
    (a.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2));print('T02_CANDIDATE',json.dumps(report))

if __name__=='__main__':main()
