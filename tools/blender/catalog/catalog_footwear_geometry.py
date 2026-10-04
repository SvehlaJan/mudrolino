"""Shared low-top foot placement, ankle blend, and anatomical-side binding."""
import math
import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree
from build_catalog_f01 import loft, ring


def foot_rest_transform(arm, sign):
    prefix = 'Left' if sign > 0 else 'Right'
    foot = arm.data.bones[prefix+'Foot'].head_local
    toe = arm.data.bones[prefix+'ToeBase'].head_local
    angle = math.atan2(toe.x-foot.x, foot.y-toe.y)
    transform = Matrix.Translation(Vector((foot.x, foot.y, 0))) @ Matrix.Rotation(angle, 4, 'Z')
    return transform


def bind_foot_parts(parts, arm, body, sign, ankle_max_z=.180,ankle_weight_mode='nearest_vertex'):
    prefix = 'Left' if sign > 0 else 'Right'
    transform = foot_rest_transform(arm, sign)
    ankle = [v for v in body.data.vertices if .095 < v.co.z < ankle_max_z and v.co.x*sign > 0]
    assert ankle
    tree = KDTree(len(ankle))
    for v in ankle: tree.insert(v.co, v.index)
    tree.balance()
    surface=None
    if ankle_weight_mode=='triangle':
        from mathutils.bvhtree import BVHTree
        from mathutils.geometry import barycentric_transform
        body.data.calc_loop_triangles()
        body_points=[v.co.copy() for v in body.data.vertices]
        triangles=[tuple(t.vertices) for t in body.data.loop_triangles
                   if all(body.data.vertices[i].co.x*sign>0 and .070<body.data.vertices[i].co.z<ankle_max_z+.030 for i in t.vertices)]
        assert triangles
        surface=BVHTree.FromPolygons(body_points,triangles,all_triangles=True)
    else:assert ankle_weight_mode=='nearest_vertex'
    for obj in parts:
        bpy.context.view_layer.update()
        for bone in arm.data.bones: obj.vertex_groups.new(name=bone.name)
        for vertex in obj.data.vertices:
            local = obj.matrix_world @ vertex.co
            toe_amount = max(0, min(1, (-local.y-.070)/.090))
            weights = {prefix+'Foot': 1-toe_amount, prefix+'ToeBase': toe_amount}
            ankle_amount = max(0, min(1, (local.z-.092)/.018))*max(0, min(1, (local.y+.090)/.020))
            if ankle_amount:
                allowed=[prefix+'Foot',prefix+'Leg',prefix+'UpLeg',prefix+'ToeBase']
                if surface is None:
                    _,index,_=tree.find(transform@local)
                    proxy={body.vertex_groups[w.group].name:w.weight for w in body.data.vertices[index].groups
                           if body.vertex_groups[w.group].name in allowed}
                else:
                    point,_,index,_=surface.find_nearest(transform@local)
                    ids=triangles[index];a,b,c=[body_points[i] for i in ids]
                    if (b-a).cross(c-a).length<1e-12:
                        _,index,_=tree.find(point);ids=[index];factors=[1]
                    else:
                        factors=[max(0,min(1,value)) for value in barycentric_transform(point,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))]
                    proxy={}
                    for i,factor in zip(ids,factors):
                        for w in body.data.vertices[i].groups:
                            name=body.vertex_groups[w.group].name
                            if name in allowed:proxy[name]=proxy.get(name,0)+w.weight*factor
                total = sum(proxy.values())
                assert total > 0
                weights = {name: w*(1-ankle_amount) for name, w in weights.items()}
                for name, w in proxy.items(): weights[name] = weights.get(name, 0)+ankle_amount*w/total
            for name, w in weights.items():
                if w > 1e-6: obj.vertex_groups[name].add([vertex.index], w, 'REPLACE')
        obj.matrix_world = transform @ obj.matrix_world


def join_footwear(parts, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.name = name
    return obj


def fit_ankle_upper(upper,arm,body,sign,min_z=.150,margin=.004):
    """Fit a tall upper's rounded ankle outline before adding thickness."""
    from mathutils.bvhtree import BVHTree
    transform=foot_rest_transform(arm,sign);inverse=transform.inverted()
    tree=BVHTree.FromPolygons([v.co for v in body.data.vertices],
                             [tuple(p.vertices) for p in body.data.polygons])
    for vertex in upper.data.vertices:
        if vertex.co.z<min_z:continue
        world=transform@vertex.co
        point,normal,_,_=tree.find_nearest(world)
        if (world-point).dot(normal)<margin:
            target=point+normal*margin;target.z=world.z
            vertex.co=inverse@target
    upper.data.update()


def low_top_coverage(body, obj, arm):
    lower = {'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'}
    return [v.index for v in body.data.vertices if v.co.z < .116
            and sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower) > .50]


def face_safe_footwear_coverage(body,opening_z):
    """Remove only vertices whose incident faces stay below the opening."""
    lower={'LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'}
    adjacent_top=[v.co.z for v in body.data.vertices]
    for face in body.data.polygons:
        maximum=max(body.data.vertices[i].co.z for i in face.vertices)
        for i in face.vertices:adjacent_top[i]=max(adjacent_top[i],maximum)
    indices=[v.index for v in body.data.vertices if adjacent_top[v.index]<opening_z
             and sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower)>.50]
    selected=set(indices)
    assert all(max(body.data.vertices[i].co.z for i in face.vertices)<opening_z
               for face in body.data.polygons if any(i in selected for i in face.vertices))
    return indices


def add_soft_heel_tab_correctives(obj, arm, material_name,base_z=.115):
    """Fold the flexible pull-tab tip against the heel during deep flexion."""
    from catalog_correctives import attach_knee_correctives
    from mathutils.bvhtree import BVHTree
    ids = {i for face in obj.data.polygons if obj.data.materials[face.material_index].name == material_name
           for i in face.vertices}
    assert ids
    surface = BVHTree.FromPolygons([v.co for v in obj.data.vertices],
        [tuple(face.vertices) for face in obj.data.polygons
         if obj.data.materials[face.material_index].name != material_name])
    obj.shape_key_add(name='Basis',from_mix=False)
    for prefix, sign in [('Left', 1), ('Right', -1)]:
        transform = foot_rest_transform(arm, sign)
        inverse = transform.inverted()
        key = obj.shape_key_add(name='knee_clearance_'+prefix,from_mix=False)
        for index in ids:
            source = obj.data.vertices[index].co
            if source.x*sign <= 0: continue
            local = inverse @ source
            amount = max(0, local.z-base_z)
            if not amount: continue
            # Preserve the tab length as a fold, rather than shrinking the
            # reference mesh or changing the shared gait. The tip bends down
            # and sits just outside the lower ribbon and rear upper.
            local.z = base_z-amount*.75
            local.y += .002+amount*.40
            target = transform @ local
            point, normal, _, _ = surface.find_nearest(target)
            rear = transform.to_3x3() @ Vector((0, 1, 0))
            if normal.dot(rear) < 0: normal.negate()
            # Fit the folded target to the actual heel, not a fixed offset
            # from the taller opening where the heel has a different radius.
            key.data[index].co = point+normal*.004
    attach_knee_correctives(obj, arm)

def fit_fold_to_posed_shell(obj,arm,material_name,anchor_attribute,margin=.004):
    """Fit a folded target in its actual deformed pose, then invert skinning.

    A standing tab's fixed skin weights differ from the lower shell where its
    folded target lands. Rest-space nearest-surface projection alone therefore
    does not establish clearance after skinning. Preserve both sewn ends.
    """
    import json
    from mathutils.bvhtree import BVHTree
    from build_catalog_t01 import reset
    roles=obj.data.attributes[anchor_attribute]
    ids={i for face in obj.data.polygons if obj.data.materials[face.material_index].name==material_name for i in face.vertices}
    faces=[tuple(face.vertices) for face in obj.data.polygons if obj.data.materials[face.material_index].name!=material_name]
    keys=obj.data.shape_keys.key_blocks;records=[]
    for prefix,sign,frame in [('Right',-1,7.25),('Left',1,15.25)]:
        reset(arm);action=bpy.data.actions['run'];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
        bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
        key=keys['knee_clearance_'+prefix];assert key.value>.99,(prefix,key.value)
        bone_matrices={bone.name:arm.pose.bones[bone.name].matrix@bone.matrix_local.inverted() for bone in arm.data.bones}
        matrices=[]
        for vertex in obj.data.vertices:
            influences=sorted([(obj.vertex_groups[w.group].name,w.weight) for w in vertex.groups if w.weight>.0001],key=lambda x:-x[1])[:4]
            total=sum(w for _,w in influences);assert total>0
            matrix=Matrix.Identity(4)*0
            for name,weight in influences:matrix+=bone_matrices[name]*(weight/total)
            matrices.append(matrix)
        points=[matrix@vertex.co for matrix,vertex in zip(matrices,obj.data.vertices)]
        tree=BVHTree.FromPolygons(points,faces);changed=0;max_shift=0
        for index in ids:
            vertex=obj.data.vertices[index]
            if vertex.co.x*sign<=0 or roles.data[index].value:continue
            matrix=matrices[index];posed=matrix@key.data[index].co
            point,normal,_,_=tree.find_nearest(posed)
            rear=matrix.to_3x3()@(foot_rest_transform(arm,sign).to_3x3()@Vector((0,1,0)))
            if normal.dot(rear)<0:normal.negate()
            if (posed-point).dot(normal)>=margin:continue
            target=matrix.inverted()@(point+normal*margin)
            max_shift=max(max_shift,(target-key.data[index].co).length)
            key.data[index].co=target;changed+=1
        records.append({'side':prefix,'motion':'run','frame':frame,'key_value':key.value,'changed_vertices':changed,'max_rest_target_shift_m':max_shift,'posed_shell_margin_m':margin})
    reset(arm);bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
    obj['fold_calibration']=json.dumps(records)
    print('FOLD_CALIBRATION',json.dumps(records))
    return records
