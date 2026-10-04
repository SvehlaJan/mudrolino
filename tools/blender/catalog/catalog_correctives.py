"""Portable knee-distance drivers for exported garment corrective shapes."""
from mathutils.bvhtree import BVHTree

KNEE_START=.25
KNEE_RANGE=1.55

def attach_knee_correctives(obj,arm):
    keys=obj.data.shape_keys
    if not keys:return []
    attached=[]
    for prefix in ['Left','Right']:
        name='knee_clearance_'+prefix
        if name not in keys.key_blocks:continue
        up=arm.data.bones[prefix+'UpLeg'].head_local
        knee=arm.data.bones[prefix+'Leg'].head_local
        foot=arm.data.bones[prefix+'Foot'].head_local
        a=(knee-up).length;b=(foot-knee).length
        key=keys.key_blocks[name];key.driver_remove('value')
        driver=key.driver_add('value').driver;driver.type='SCRIPTED'
        variable=driver.variables.new();variable.name='d';variable.type='LOC_DIFF'
        for target,bone in zip(variable.targets,[prefix+'UpLeg',prefix+'Foot']):
            target.id=arm;target.bone_target=bone;target.transform_space='WORLD_SPACE'
        driver.expression=f'min(1,max(0,(acos(min(1,max(-1,(d*d-{a*a+b*b:.12g})/{2*a*b:.12g})))-{KNEE_START})/{KNEE_RANGE}))'
        attached.append(name)
    return attached

def add_shorts_correctives(obj,arm,body):
    # Rolling fabric moves onto the thigh; rear hem weights must follow that
    # thigh rather than swinging around the lower-leg pivot.
    for vertex in obj.data.vertices:
        p=vertex.co;amount=max(0,min(1,(p.y-.025)/.10))*max(0,min(1,(.85-p.z)/.12))
        weights={obj.vertex_groups[w.group].name:w.weight for w in vertex.groups}
        for prefix in ['Left','Right']:
            transfer=weights.get(prefix+'Leg',0)*amount
            weights[prefix+'Leg']=weights.get(prefix+'Leg',0)-transfer
            weights[prefix+'UpLeg']=weights.get(prefix+'UpLeg',0)+transfer
        for index in [w.group for w in vertex.groups]:obj.vertex_groups[index].remove([vertex.index])
        for name,w in weights.items():
            if w>1e-7:obj.vertex_groups[name].add([vertex.index],w,'REPLACE')
    obj.shape_key_add(name='Basis',from_mix=False)
    for prefix,sign in [('Left',1),('Right',-1)]:
        points=[v.co for v in body.data.vertices]
        faces=[tuple(f.vertices) for f in body.data.polygons if all(body.data.vertices[i].co.x*sign>0 and body.data.vertices[i].co.z<.97 for i in f.vertices)]
        tree=BVHTree.FromPolygons(points,faces)
        key=obj.shape_key_add(name='knee_clearance_'+prefix,from_mix=False)
        for source,target in zip(obj.data.vertices,key.data):
            p=source.co
            side=max(0,min(1,p.x*sign/.04))
            rear=max(0,min(1,(p.y-.025)/.10))
            leg=max(0,min(1,(.85-p.z)/.31))
            target.co.y+=.125*rear*rear*leg*side
            target.co.z+=.260*rear*rear*leg*side
            if rear*leg*side>0:
                nearest,normal,_,_=tree.find_nearest(target.co)
                if (target.co-nearest).dot(normal)<.015:target.co=nearest+normal*.015
    attach_knee_correctives(obj,arm)

def add_rear_hip_compression_correctives(obj,arm,body,margin=.006):
    """Compress excess rear cloth ease toward the body during deep flexion."""
    points=[v.co.copy() for v in body.data.vertices]
    faces=[tuple(f.vertices) for f in body.data.polygons
           if all(.60<points[i].z<.99 for i in f.vertices)]
    tree=BVHTree.FromPolygons(points,faces)
    obj.shape_key_add(name='Basis',from_mix=False)
    for prefix,sign in [('Left',1),('Right',-1)]:
        key=obj.shape_key_add(name='knee_clearance_'+prefix,from_mix=False)
        for source,target in zip(obj.data.vertices,key.data):
            p=source.co
            side=max(0,min(1,p.x*sign/.040))
            rear=max(0,min(1,(p.y-.065)/.035))
            height=max(0,min(1,(p.z-.700)/.050))*max(0,min(1,(.910-p.z)/.050))
            amount=side*rear*height
            if not amount:continue
            point,normal,_,_=tree.find_nearest(p)
            if (p-point).dot(normal)<=margin:continue
            target.co=p.lerp(point+normal*margin,amount)
    attach_knee_correctives(obj,arm)
