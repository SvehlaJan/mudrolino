"""Projected, economical pockets and waist details for tailored bottoms."""
import math
import bpy,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from build_catalog_head import sphere
from build_catalog_t01 import select
from catalog_piece import inherit_detail_weights

def surface_projector(cloth):
    tree=BVHTree.FromPolygons([v.co for v in cloth.data.vertices],[tuple(p.vertices) for p in cloth.data.polygons])
    def project(x,z,side,offset=.0018):
        p,n,_,_=tree.ray_cast(Vector((x,side*.45,z)),Vector((0,-side,0)))
        assert p is not None,(x,z,side)
        if n.y*side<0:n.negate()
        return p+n*offset
    return project

def mesh_object(name,vertices,faces,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:face.use_smooth=True
    return obj

def seam_tube(name,points,radius,mat):
    """An eight-sided tube over projected samples; no Bezier overshoot."""
    vertices=[];faces=[];sides=8
    for i,p in enumerate(points):
        tangent=points[min(i+1,len(points)-1)]-points[max(0,i-1)]
        tangent.normalize();u=Vector((0,1,0));u=(u-tangent*u.dot(tangent)).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):
            angle=2*math.pi*j/sides;vertices.append(tuple(p+radius*(u*math.cos(angle)+v*math.sin(angle))))
    for row in range(len(points)-1):
        for j in range(sides):
            k=(j+1)%sides;faces.append((row*sides+j,row*sides+k,(row+1)*sides+k,(row+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh_object(name,vertices,faces,mat)

def add_tailored_details(cloth,arm,seam_material,button_material,back_pockets=True,belt_loops=True):
    project=surface_projector(cloth);parts=[]
    for sign in [-1,1]:
        points=[project(sign*(.115+.039*i/12),.946-.058*i/12,-1) for i in range(13)]
        parts.append(seam_tube(cloth.name+' front pocket opening',points,.0016,seam_material))
    points=[project(.003,.952-.078*i/16,-1,.0015) for i in range(17)]
    parts.append(seam_tube(cloth.name+' fly seam',points,.0011,seam_material))
    parts.append(sphere(cloth.name+' waist button',project(0,.969,-1,.002),(.006,.0025,.006),button_material,segments=16,rings=8))
    if back_pockets:
        for sign in [-1,1]:
            vertices=[];faces=[]
            for row in range(6):
                for col in range(6):vertices.append(tuple(project(sign*(.041+col*.014),.940-row*.014,1)))
            for row in range(5):
                for col in range(5):i=row*6+col;faces.append((i,i+1,i+7,i+6))
            pocket=mesh_object(cloth.name+' rounded back pocket',vertices,faces,seam_material)
            select(pocket);sub=pocket.modifiers.new('Rounded patch corners','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
            for vertex in pocket.data.vertices:vertex.co=project(vertex.co.x,vertex.co.z,1,.002)
            thick=pocket.modifiers.new('Pocket thickness','SOLIDIFY');thick.thickness=.0012;thick.offset=0;bpy.ops.object.modifier_apply(modifier=thick.name)
            parts.append(pocket)
    if belt_loops:
        for x,side in [(-.115,-1),(.115,-1),(-.125,1),(.125,1),(0,1)]:
            vertices=[];faces=[]
            for row in range(5):
                for dx in [-.005,.005]:vertices.append(tuple(project(x+dx,.981-row*.006,side,.0024)))
            for row in range(4):i=row*2;faces.append((i,i+1,i+3,i+2))
            loop=mesh_object(cloth.name+' belt loop',vertices,faces,seam_material);select(loop)
            thick=loop.modifiers.new('Loop thickness','SOLIDIFY');thick.thickness=.0015;thick.offset=0;bpy.ops.object.modifier_apply(modifier=thick.name)
            parts.append(loop)
    for part in parts:inherit_detail_weights(part,cloth,arm)
    bpy.ops.object.select_all(action='DESELECT')
    for part in [cloth,*parts]:part.select_set(True)
    bpy.context.view_layer.objects.active=cloth;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return cloth
