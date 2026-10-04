"""Shared quad pelvis/crotch/leg topology for separately tailored bottoms."""
import math
import bpy,bmesh
from mathutils import Vector
from build_catalog_b01 import weights
from build_catalog_t01 import select

def create_bottom_shell(arm,name,leg_rings,materials,waist_boundary,cuff_boundary):
    n=32;vertices=[];faces=[]
    for z,rx,ry in [(.982,.180,.147),(.968,.181,.148),(.921,.194,.163),(.858,.205,.169)]:
        for i in range(n):
            angle=2*math.pi*i/n;c,s=math.cos(angle),math.sin(angle)
            vertices.append((rx*math.copysign(abs(c)**.84,c),.010+ry*math.copysign(abs(s)**.84,s),z))
    for row in range(3):
        for i in range(n):
            j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
    crotch=[]
    for i in range(1,8):
        angle=math.pi*i/8;crotch.append(len(vertices))
        vertices.append((0,.010+.169*math.cos(angle),.858-.094*math.sin(angle)))
    for prefix,sign in [('Left',1),('Right',-1)]:
        if sign==1:
            boundary=[3*n+(i%n) for i in range(24,41)]+crotch
            angles=[-math.pi/2+math.pi*i/16 for i in range(17)]+[math.pi/2+math.pi*i/8 for i in range(1,8)]
        else:
            boundary=[3*n+i for i in range(8,25)]+list(reversed(crotch))
            angles=[math.pi/2+math.pi*i/16 for i in range(17)]+[3*math.pi/2+math.pi*i/8 for i in range(1,8)]
        previous=boundary
        for z,rx,ry in leg_rings:
            a=arm.data.bones[prefix+('UpLeg' if z>.483 else 'Leg')].head_local
            b=arm.data.bones[prefix+('Leg' if z>.483 else 'Foot')].head_local
            center=a.lerp(b,(a.z-z)/(a.z-b.z));center.z=z
            ring=[]
            for angle in angles:
                ring.append(len(vertices));vertices.append((center.x+rx*math.cos(angle),center.y+ry*math.sin(angle),z))
            for i in range(len(ring)):
                j=(i+1)%len(ring);faces.append((previous[i],previous[j],ring[j],ring[i]))
            previous=ring
    mesh=bpy.data.meshes.new(name+' quad shell');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for bone in arm.data.bones:obj.vertex_groups.new(name=bone.name)
    for vertex in mesh.vertices:
        for bone,weight in weights(vertex.co).items():
            if weight>1e-6:obj.vertex_groups[bone].add([vertex.index],weight,'REPLACE')
    select(obj);sub=obj.modifiers.new('Rounded bottom tailoring','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    thick=obj.modifiers.new('Cloth thickness','SOLIDIFY');thick.thickness=.0025;thick.offset=0;bpy.ops.object.modifier_apply(modifier=thick.name)
    # Preserve the verified shoe-following hem blend, with numeric indices
    # copied before removing Blender RNA weight entries.
    for vertex in obj.data.vertices:
        if vertex.co.z>.240:continue
        t=.5*max(0,min(1,(.240-vertex.co.z)/.080))
        ws={w.group:w.weight*(1-t) for w in vertex.groups}
        foot=obj.vertex_groups[('Left' if vertex.co.x>0 else 'Right')+'Foot'].index
        ws[foot]=ws.get(foot,0)+t
        for index in [w.group for w in vertex.groups]:obj.vertex_groups[index].remove([vertex.index])
        for index,weight in ws.items():
            if weight>1e-7:obj.vertex_groups[index].add([vertex.index],weight,'REPLACE')
    # Actual cuts make clear elastic-band boundaries independent of the
    # smoothed rings; bmesh preserves deform weights on inserted vertices.
    bm=bmesh.new();bm.from_mesh(obj.data)
    for z in [waist_boundary,cuff_boundary]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,plane_co=Vector((0,0,z)),plane_no=Vector((0,0,1)),clear_inner=False,clear_outer=False)
    bm.to_mesh(obj.data);bm.free()
    for mat in materials:obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth=True
        z=sum(obj.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)
        face.material_index=1 if z>waist_boundary or z<cuff_boundary else 0
    return obj

def full_trouser_coverage(body,obj,arm):
    lower={'Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'}
    return [v.index for v in body.data.vertices if .118<v.co.z<.956 and abs(v.co.x)<.28 and sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower)>.5]

def fit_bottom_cuff(obj,arm,body,posterior_ease=.012):
    """Give a long cuff measured rear ease and actual ankle-surface weights.

    This replaces the uniform half-Foot blend only within the cuff; thigh,
    knee, waist and already authored material boundaries are unchanged.
    """
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import barycentric_transform
    body.data.calc_loop_triangles()
    points=[v.co.copy() for v in body.data.vertices]
    for prefix,sign in [('Left',1),('Right',-1)]:
        triangles=[tuple(t.vertices) for t in body.data.loop_triangles
                   if all(points[i].x*sign>0 and .070<points[i].z<.270 for i in t.vertices)]
        surface=BVHTree.FromPolygons(points,triangles,all_triangles=True)
        leg=arm.data.bones[prefix+'Leg'].head_local
        foot=arm.data.bones[prefix+'Foot'].head_local
        allowed={prefix+'Foot',prefix+'Leg',prefix+'UpLeg',prefix+'ToeBase'}
        for vertex in obj.data.vertices:
            p=vertex.co
            if p.x*sign<=0 or p.z>=.240:continue
            center=leg.lerp(foot,(leg.z-p.z)/(leg.z-foot.z))
            rear=max(0,min(1,(p.y-center.y)/.075))**2
            height=max(0,min(1,(.240-p.z)/.055))
            p.y+=posterior_ease*rear*height
            point,_,index,_=surface.find_nearest(p)
            ids=triangles[index];a,b,c=[points[i] for i in ids]
            assert (b-a).cross(c-a).length>1e-12,'Degenerate ankle surface triangle'
            factors=[max(0,min(1,value)) for value in barycentric_transform(point,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))]
            proxy={}
            for i,factor in zip(ids,factors):
                for w in body.data.vertices[i].groups:
                    name=body.vertex_groups[w.group].name
                    if name in allowed:proxy[name]=proxy.get(name,0)+w.weight*factor
            total=sum(proxy.values());assert total>0
            amount=max(0,min(1,(.240-p.z)/.040))
            old={obj.vertex_groups[w.group].name:w.weight*(1-amount) for w in vertex.groups}
            for name,value in proxy.items():old[name]=old.get(name,0)+amount*value/total
            for index in [w.group for w in vertex.groups]:obj.vertex_groups[index].remove([vertex.index])
            for name,value in old.items():
                if value>1e-7:obj.vertex_groups[name].add([vertex.index],value,'REPLACE')
    obj.data.update()
    return obj

def fit_bottom_rear_hip_weights(obj,body):
    """Align a relaxed rear hip panel with the underlying body transition."""
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import barycentric_transform
    body.data.calc_loop_triangles()
    points=[v.co.copy() for v in body.data.vertices]
    triangles=[tuple(t.vertices) for t in body.data.loop_triangles
               if all(.60<points[i].z<.99 for i in t.vertices)]
    tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
    allowed={'Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'}
    for vertex in obj.data.vertices:
        p=vertex.co
        amount=max(0,min(1,(p.y-.065)/.035))*max(0,min(1,(p.z-.700)/.050))*max(0,min(1,(.910-p.z)/.050))
        if not amount:continue
        point,_,index,_=tree.find_nearest(p)
        ids=triangles[index];a,b,c=[points[i] for i in ids]
        assert (b-a).cross(c-a).length>1e-12
        factors=[max(0,min(1,value)) for value in barycentric_transform(point,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))]
        proxy={}
        for i,factor in zip(ids,factors):
            for w in body.data.vertices[i].groups:
                name=body.vertex_groups[w.group].name
                if name in allowed:proxy[name]=proxy.get(name,0)+w.weight*factor
        total=sum(proxy.values());assert total>0
        old={obj.vertex_groups[w.group].name:w.weight*(1-amount) for w in vertex.groups}
        for name,value in proxy.items():old[name]=old.get(name,0)+amount*value/total
        for index in [w.group for w in vertex.groups]:obj.vertex_groups[index].remove([vertex.index])
        for name,value in old.items():
            if value>1e-7:obj.vertex_groups[name].add([vertex.index],value,'REPLACE')
    return obj
