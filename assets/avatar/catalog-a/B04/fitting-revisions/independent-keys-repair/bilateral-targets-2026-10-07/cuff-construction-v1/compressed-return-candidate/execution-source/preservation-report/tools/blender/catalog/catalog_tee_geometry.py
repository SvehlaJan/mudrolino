"""Tailored quad tee: torso loft, sleeve openings, short sleeve lofts."""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.kdtree import KDTree

def create_tee(arm, body=None, panel_materials=None):
    n=32
    # Metre-scale dimensions; the hem sits at the pelvis rather than crotch.
    levels=[(.930,.210,.182),(.943,.210,.182),(1.025,.184,.152),
            (1.120,.181,.145),(1.205,.191,.149),(1.275,.210,.144),
            (1.385,.216,.132),(1.414,.096,.092),(1.424,.094,.090)]
    vertices=[];faces=[];sleeve_weights={}
    for z,rx,ry in levels:
        for i in range(n):
            a=2*math.pi*i/n
            center_y=.002 if z<=1.205 else .009 if z<=1.275 else .018
            power=.80 if z<=.944 else .90 if z<=1.025 else 1.0
            c,s=math.cos(a),math.sin(a)
            vertices.append((rx*math.copysign(abs(c)**power,c),center_y+ry*math.copysign(abs(s)**power,s),z))
    holes={i%n for side in (0,16) for i in range(side-4,side+4)}
    for row in range(len(levels)-1):
        for i in range(n):
            if row in (4,5) and i in holes:continue
            j=(i+1)%n
            faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
    torso_face_count=len(faces)
    for side,prefix in [(0,'Left'),(16,'Right')]:
        # Boundary travels round a rectangular hole cut in the torso loft.
        boundary=[4*n+(i%n) for i in range(side-4,side+5)]
        boundary += [row*n+((side+4)%n) for row in (5,6)]
        boundary += [6*n+(i%n) for i in range(side+3,side-5,-1)]
        boundary += [5*n+((side-4)%n)]
        points=[Vector(vertices[i]) for i in boundary]
        center=sum(points,Vector())/len(points)
        shoulder=arm.data.bones[prefix+'Arm'].head_local
        elbow=arm.data.bones[prefix+'ForeArm'].head_local
        axis=(elbow-shoulder).normalized()
        cuff_center=shoulder+(elbow-shoulder)*.46
        basis_a=Vector((0,-1,0));basis_a=(basis_a-axis*basis_a.dot(axis)).normalized()
        basis_b=axis.cross(basis_a).normalized()
        angles=[math.atan2((p-center).dot(basis_b),(p-center).dot(basis_a)) for p in points]
        previous=boundary
        for t,radius in [(.45,.101),(.88,.097),(1,.096)]:
            ring=[]
            for p,a in zip(points,angles):
                target=cuff_center+radius*(basis_a*math.cos(a)+basis_b*math.sin(a))
                q=p.lerp(target,t)
                sleeve_weights[len(vertices)]=(prefix,t,boundary[len(ring)])
                ring.append(len(vertices));vertices.append(tuple(q))
            for i in range(len(ring)):
                j=(i+1)%len(ring)
                faces.append((previous[i],previous[j],ring[j],ring[i]))
            previous=ring
    mesh=bpy.data.meshes.new('T01 tailored quad surface');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('T01_crew_tee',mesh);bpy.context.collection.objects.link(obj)
    if panel_materials is not None:
        for material in panel_materials:mesh.materials.append(material)
        for polygon in mesh.polygons:polygon.material_index=int(polygon.index>=torso_face_count)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for bone in arm.data.bones:obj.vertex_groups.new(name=bone.name)
    def torso_weights(p):
        chain=[('Hips',1.025),('Spine02',1.120),('Spine01',1.175),('Spine',1.300)]
        if p.z>=chain[-1][1]:weights={'Spine':1.0}
        else:
            weights={'Hips':1.0}
            for (a,za),(b,zb) in zip(chain,chain[1:]):
                if za<=p.z<zb:
                    t=(p.z-za)/(zb-za);weights={a:1-t,b:t};break
        # Neck/collar follows the same blend as the constructed body neck.
        if p.z>1.37 and abs(p.x)<.115:
            neck_blend=min(1,max(0,(p.z-1.37)/.04))
            head_blend=min(1,max(0,(p.z-1.405)/.085))
            weights={'Spine':1-neck_blend,'neck':neck_blend*(1-head_blend),'Head':neck_blend*head_blend}
        lateral=min(1,max(0,(abs(p.x)-.12)/.10))
        upper=min(1,max(0,(p.z-1.205)/.16))
        amount=.70*lateral*upper
        if amount:
            prefix='Left' if p.x>=0 else 'Right'
            weights={k:v*(1-amount) for k,v in weights.items()}
            weights[prefix+'Arm']=amount*.8;weights[prefix+'Shoulder']=amount*.2
        return weights
    hip_tree=None
    if body:
        hip_vertices=[v for v in body.data.vertices if .86<v.co.z<.99 and abs(v.co.x)<.19]
        hip_tree=KDTree(len(hip_vertices))
        for i,v in enumerate(hip_vertices):hip_tree.insert(v.co,v.index)
        hip_tree.balance()
    for v in mesh.vertices:
        weights=torso_weights(v.co)
        if v.co.z<=.960:
            # The shirt and trouser overlap shares one pelvis deformation;
            # nearest-body sampling can bind a loose hem to a nearby hand.
            left=max(0,min(1,.5+v.co.x/.08));t=max(0,min(1,(.960-v.co.z)/.170))
            weights={'Hips':1-t,'LeftUpLeg':left*t,'RightUpLeg':(1-left)*t}
        if v.index in sleeve_weights:
            prefix,t,root=sleeve_weights[v.index]
            weights={k:w*(1-t) for k,w in torso_weights(mesh.vertices[root].co).items()}
            weights[prefix+'Arm']=weights.get(prefix+'Arm',0)+t
        for name,weight in weights.items():
            if weight>1e-6:obj.vertex_groups[name].add([v.index],weight,'REPLACE')
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    smooth=obj.modifiers.new('Rounded tailoring','SUBSURF');smooth.levels=2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    # Subdivision blends lower-hem leg weights upwards into the waistband.
    # Restore the shared Hips-only overlap after smoothing so stitched loops
    # and the shirt above them remain in the same deformation space.
    for v in obj.data.vertices:
        if .940<v.co.z<=1.025:
            t=min(1,(v.co.z-.940)/.014)
            ws={obj.vertex_groups[w.group].name:w.weight*(1-t) for w in v.groups}
            ws['Hips']=ws.get('Hips',0)+t
            for g in obj.vertex_groups:g.remove([v.index])
            for name,w in ws.items():
                if w>1e-6:obj.vertex_groups[name].add([v.index],w,'REPLACE')
    thickness=obj.modifiers.new('Cloth edge thickness','SOLIDIFY');thickness.thickness=.0025;thickness.offset=0
    bpy.ops.object.modifier_apply(modifier=thickness.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
