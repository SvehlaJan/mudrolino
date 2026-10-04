"""Authored long-sleeve shell for catalog hoodies/sweatshirts/henleys."""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.kdtree import KDTree

def clamp(value):
    return max(0.0, min(1.0, value))

def torso_weights(p):
    chain = [('Hips',1.025),('Spine02',1.120),('Spine01',1.175),('Spine',1.300)]
    weights = {'Spine':1.0} if p.z>=1.300 else {'Hips':1.0}
    for (a,za),(b,zb) in zip(chain,chain[1:]):
        if za<=p.z<zb:
            t=(p.z-za)/(zb-za); weights={a:1-t,b:t}; break
    if p.z>1.37 and abs(p.x)<.115:
        neck=clamp((p.z-1.37)/.04); head=clamp((p.z-1.405)/.085)
        weights={'Spine':1-neck,'neck':neck*(1-head),'Head':neck*head}
    lateral=clamp((abs(p.x)-.12)/.10); upper=clamp((p.z-1.205)/.16)
    amount=.70*lateral*upper
    if amount:
        side='Left' if p.x>=0 else 'Right'
        weights={k:v*(1-amount) for k,v in weights.items()}
        weights[side+'Arm']=amount*.8; weights[side+'Shoulder']=amount*.2
    if p.z<=.960:
        left=clamp(.5+p.x/.08); t=clamp((.960-p.z)/.170)
        weights={'Hips':1-t,'LeftUpLeg':left*t,'RightUpLeg':(1-left)*t}
    return weights

def create_long_top(arm,body,name):
    n=32
    levels=[(.930,.211,.183),(.947,.211,.183),(1.025,.187,.157),
            (1.120,.188,.152),(1.205,.197,.155),(1.275,.216,.150),
            (1.385,.221,.138),(1.414,.097,.094),(1.424,.095,.092)]
    vertices=[];faces=[];sleeve_records={}
    for z,rx,ry in levels:
        cy=.002 if z<=1.205 else .009 if z<=1.275 else .018
        power=.80 if z<=.947 else .90 if z<=1.025 else 1.0
        for i in range(n):
            a=2*math.pi*i/n;c,s=math.cos(a),math.sin(a)
            vertices.append((rx*math.copysign(abs(c)**power,c),cy+ry*math.copysign(abs(s)**power,s),z))
    holes={i%n for side in (0,16) for i in range(side-4,side+4)}
    for row in range(len(levels)-1):
        for i in range(n):
            if row in (4,5) and i in holes:continue
            j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
    for side,prefix in [(0,'Left'),(16,'Right')]:
        boundary=[4*n+(i%n) for i in range(side-4,side+5)]
        boundary += [row*n+((side+4)%n) for row in (5,6)]
        boundary += [6*n+(i%n) for i in range(side+3,side-5,-1)]
        boundary += [5*n+((side-4)%n)]
        points=[Vector(vertices[i]) for i in boundary];center=sum(points,Vector())/len(points)
        shoulder=arm.data.bones[prefix+'Arm'].head_local
        elbow=arm.data.bones[prefix+'ForeArm'].head_local
        wrist=arm.data.bones[prefix+'Hand'].head_local
        axis=(elbow-shoulder).normalized(); fore=(wrist-elbow).normalized()
        a=Vector((0,-1,0)); a=(a-axis*a.dot(axis)).normalized(); b=axis.cross(a).normalized()
        angles=[math.atan2((p-center).dot(b),(p-center).dot(a)) for p in points]
        previous=boundary
        rings=[(shoulder.lerp(elbow,.27),.109,.48),
               (shoulder.lerp(elbow,.57),.101,1),
               (shoulder.lerp(elbow,.85),.091,1),(elbow,.087,1),
               (elbow.lerp(wrist,.20),.081,1),(elbow.lerp(wrist,.55),.073,1),
               (elbow.lerp(wrist,.82),.064,1),(elbow.lerp(wrist,.91),.061,1),
               (elbow.lerp(wrist,.98),.061,1)]
        for row,(c,radius,blend) in enumerate(rings):
            direction=(axis.lerp(fore,clamp((row-2)/3))).normalized()
            basis_a=(a-direction*a.dot(direction)).normalized(); basis_b=direction.cross(basis_a).normalized()
            ring=[]
            for root,p,angle in zip(boundary,points,angles):
                target=c+radius*(basis_a*math.cos(angle)+basis_b*math.sin(angle))
                q=p.lerp(target,blend) if row==0 else target
                index=len(vertices);ring.append(index);vertices.append(tuple(q))
                sleeve_records[index]=(prefix,blend,root)
            for i in range(len(ring)):
                j=(i+1)%len(ring);faces.append((previous[i],previous[j],ring[j],ring[i]))
            previous=ring
    mesh=bpy.data.meshes.new(name+' quad shell');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for bone in arm.data.bones:obj.vertex_groups.new(name=bone.name)
    arm_trees={}
    for prefix in ['Left','Right']:
        names={prefix+n for n in ['Shoulder','Arm','ForeArm','Hand']}
        candidates=[v for v in body.data.vertices if sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in names)>.7 and (v.co.x>0)==(prefix=='Left')]
        tree=KDTree(len(candidates))
        for v in candidates:tree.insert(v.co,v.index)
        tree.balance();arm_trees[prefix]=(tree,names)
    for v in mesh.vertices:
        weights=torso_weights(v.co)
        if v.index in sleeve_records:
            prefix,blend,root=sleeve_records[v.index];tree,names=arm_trees[prefix]
            _,index,_=tree.find(v.co)
            local={body.vertex_groups[w.group].name:w.weight for w in body.data.vertices[index].groups if body.vertex_groups[w.group].name in names}
            total=sum(local.values());assert total>0
            weights={k:w*(1-blend) for k,w in torso_weights(mesh.vertices[root].co).items()}
            for k,w in local.items():weights[k]=weights.get(k,0)+blend*w/total
        for k,w in weights.items():
            if w>1e-7:obj.vertex_groups[k].add([v.index],w,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    m=obj.modifiers.new('Rounded long-sleeve tailoring','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name)
    for v in obj.data.vertices:
        arm_amount=sum(w.weight for w in v.groups if any(obj.vertex_groups[w.group].name.startswith(side+part) for side in ['Left','Right'] for part in ['Arm','ForeArm','Hand','Shoulder']))
        if .940<v.co.z<=1.025 and abs(v.co.x)<.24 and arm_amount<.05:
            t=clamp((v.co.z-.940)/.014);weights={w.group:w.weight*(1-t) for w in v.groups}
            index=obj.vertex_groups['Hips'].index;weights[index]=weights.get(index,0)+t
            for i in [w.group for w in v.groups]:obj.vertex_groups[i].remove([v.index])
            for i,w in weights.items():
                if w>1e-7:obj.vertex_groups[i].add([v.index],w,'REPLACE')
    m=obj.modifiers.new('Soft fabric thickness','SOLIDIFY');m.thickness=.003;m.offset=0;bpy.ops.object.modifier_apply(modifier=m.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
