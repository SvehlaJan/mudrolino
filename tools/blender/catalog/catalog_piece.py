"""Shared independent-master export and selected-pose review for catalog pieces."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Vector
from build_catalog_t01 import reset,export,setup_render,bvh
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

def inherit_detail_weights(part,cloth,arm,weight_function=None):
    tree=KDTree(len(cloth.data.vertices))
    for v in cloth.data.vertices:tree.insert(v.co,v.index)
    tree.balance()
    cloth.data.calc_loop_triangles()
    triangles=[tuple(t.vertices) for t in cloth.data.loop_triangles]
    points=[v.co.copy() for v in cloth.data.vertices]
    surface=BVHTree.FromPolygons(points,triangles,all_triangles=True)
    for bone in arm.data.bones:part.vertex_groups.new(name=bone.name)
    for v in part.data.vertices:
        p=part.matrix_world@v.co
        if weight_function is None:
            point,normal,index,_=surface.find_nearest(p)
            ids=triangles[index];a,b,c=[points[i] for i in ids]
            if (b-a).cross(c-a).length<1e-12:
                _,index,_=tree.find(p)
                weights={cloth.vertex_groups[w.group].name:w.weight for w in cloth.data.vertices[index].groups}
            else:
                bary=barycentric_transform(point,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
                factors=[max(0,min(1,value)) for value in bary];total=sum(factors);assert total>0
                weights={}
                for i,factor in zip(ids,factors):
                    for w in cloth.data.vertices[i].groups:
                        name=cloth.vertex_groups[w.group].name
                        weights[name]=weights.get(name,0)+w.weight*factor/total
        else:weights=weight_function(p)
        for name,w in weights.items():
            if w>1e-7:part.vertex_groups[name].add([v.index],w,'REPLACE')

def long_top_coverage(body,obj,arm):
    covered=[]
    for v in body.data.vertices:
        p=v.co;torso=abs(p.x)<.23 and .942<p.z<1.389;sleeve=False
        for prefix in ['Left','Right']:
            shoulder=arm.data.bones[prefix+'Arm'].head_local;elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local
            for a,b,start,end in [(shoulder,elbow,-.20,1.05),(elbow,wrist,-.10,.91)]:
                axis=b-a;t=(p-a).dot(axis)/axis.length_squared
                if start<=t<=end and (p-a-axis*t).length<.13:sleeve=True
        if torso or sleeve:covered.append(v.index)
    return covered

def normalize_skin(obj,arm):
    pruned_vertices=0;max_discarded=0
    for v in obj.data.vertices:
        original=[(w.group,w.weight) for w in v.groups if w.weight>0]
        # Blender 5.1 glTF primitive_extract.__get_bone_data omits weights
        # <= 0.0001. Fit and export the same master, including morph targets.
        weights=sorted([(i,w) for i,w in original if w>.0001],key=lambda w:-w[1])[:4]
        if len(weights)!=len(original):pruned_vertices+=1
        max_discarded=max(max_discarded,sum(w for _,w in original)-sum(w for _,w in weights))
        total=sum(w for _,w in weights);assert total>0,(obj.name,v.index)
        for index in [w.group for w in v.groups]:obj.vertex_groups[index].remove([v.index])
        for index,w in weights:obj.vertex_groups[index].add([v.index],w/total,'REPLACE')
    modifier=obj.modifiers.new('Shared catalog skin','ARMATURE');modifier.object=arm
    obj.parent=arm;obj.matrix_world=Matrix.Identity(4)
    return {'minimum_exported_influence':.0001,'max_influences':4,'pruned_vertices':pruned_vertices,'max_discarded_weight':max_discarded}

def short_top_coverage(body,obj,arm):
    tree,vertices=bvh(obj);hem=min(v.z for v in vertices);covered=[]
    for v in body.data.vertices:
        p=v.co;point,normal,index,distance=tree.find_nearest(p)
        if point is None or distance>.12 or p.z<hem+.008 or p.z>=1.389:continue
        torso=abs(p.x)<.23 and p.z<1.415;sleeve=False
        for prefix in ['Left','Right']:
            a=arm.data.bones[prefix+'Arm'].head_local;b=arm.data.bones[prefix+'ForeArm'].head_local;axis=b-a
            t=(p-a).dot(axis)/axis.length_squared
            if -.20<=t<=.39 and (p-a-axis*t).length<.13:sleeve=True
        if torso or sleeve:covered.append(v.index)
    return covered

def build_piece(id,factory,coverage,review_target_z=.92,review_ortho_scale=2.03):
    parser=argparse.ArgumentParser();parser.add_argument('--foundation',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--review-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output_dir.mkdir(parents=True,exist_ok=True);args.review_dir.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.foundation.resolve()));bpy.context.preferences.filepaths.save_version=0
    arm=bpy.data.objects['Armature_Catalog'];body=bpy.data.objects['body_underlayer_male'];reset(arm)
    parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body]
    obj=factory(arm,body)
    from assemble_catalog_outfit import OBJECT_NAMES
    assert id in OBJECT_NAMES,'Register the catalog object before building: '+id
    assert obj.name==OBJECT_NAMES[id],f'Catalog object mismatch: {id} expects {OBJECT_NAMES[id]}, got {obj.name}'
    skinning=normalize_skin(obj,arm)
    indices=coverage(body,obj,arm);group=body.vertex_groups.new(name='covered_'+id);group.add(indices,1,'REPLACE')
    modifier=body.modifiers.new('Hide covered body beneath '+id,'MASK');modifier.vertex_group=group.name;modifier.invert_vertex_group=True;modifier.threshold=.5
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(evaluated)
    masked=bpy.data.objects.new('body_underlayer_male_'+id,mesh);bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups]==[g.name for g in body.vertex_groups]
    skin=masked.modifiers.new('Shared body skin','ARMATURE');skin.object=arm;masked.parent=arm
    # Painted-face heads need texture coordinates; the garment exporter drops them.
    textured=any(node.type=='TEX_IMAGE' for part in parts for m in part.data.materials if m and m.use_nodes for node in m.node_tree.nodes)
    if textured:from build_catalog_female_foundation_study import export_uv
    export(args.output_dir/(id+'.glb'),[arm,obj]);(export_uv if textured else export)(args.output_dir/('body-'+id+'.glb'),[arm,masked,*parts]);bpy.data.objects.remove(masked,do_unlink=True)
    camera=setup_render();camera.data.ortho_scale=review_ortho_scale;reset(arm)
    source=args.output_dir/(id+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()))
    report={'id':id,'status':'authored candidate; complete motion/style/runtime acceptance pending','source':str(source),'object':obj.name,'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),'groups':len(obj.vertex_groups),'max_influences':max(len(v.groups) for v in obj.data.vertices),'covered_body_vertices':len(indices),'poses':[]}
    report['skinning']=skinning
    report['review_framing']={'target_z':review_target_z,'ortho_scale':review_ortho_scale}
    for label,motion,frame,pos in [('rest-front',None,0,(0,-3,.92)),('rest-back',None,0,(0,3,.92)),('rest-side',None,0,(3,0,.92)),('three-quarter',None,0,(2,-3,.92)),('walk-13','walk',13,(0,-3,.92)),('run-8','run',8,(0,-3,.92))]:
        reset(arm)
        if motion:
            action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update();tree=bvh(obj)[0]
        report['poses'].append({'pose':label,'body_pairs':{part.name:len(bvh(part)[0].overlap(tree)) for part in [body,*parts]}})
        camera.location=pos if review_target_z==.92 else (pos[0],pos[1],review_target_z+.14)
        camera.rotation_euler=(Vector((0,0,review_target_z))-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=str((args.review_dir/(label+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
    (args.output_dir/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n');print('CATALOG_CANDIDATE',json.dumps(report))
