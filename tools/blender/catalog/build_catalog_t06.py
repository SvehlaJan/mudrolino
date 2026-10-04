"""Ivory henley with an inset placket and four navy buttons."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t05 import create_sweatshirt
from build_catalog_t02 import mesh_object
from build_catalog_head import material,sphere
from catalog_piece import build_piece,long_top_coverage,inherit_detail_weights

def create_henley(arm,body):
    obj=create_sweatshirt(arm,body);obj.name='T06_henley';obj.data.name='T06 ivory henley shell'
    ivory=material('A ivory henley fabric',(.82,.76,.64),.88)
    rib=material('A ivory henley ribbing',(.74,.68,.57),.9)
    placket_mat=material('A ivory henley placket',(.78,.715,.60),.88)
    navy=material('A navy henley buttons',(.026,.049,.106),.8)
    obj.data.materials[0]=ivory;obj.data.materials[1]=rib
    tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])
    def front(x,z,offset):
        p,n,_,_=tree.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)));assert p is not None,(x,z)
        if n.y>0:n.negate()
        return p+n*offset
    vs=[];fs=[]
    for row in range(25):
        z=1.407-(1.407-1.277)*row/24
        for x in [-.011,.011]:vs.append(tuple(front(x,z,.002)))
    for row in range(24):
        i=row*2;fs.append((i,i+1,i+3,i+2))
    patch=mesh_object('T06 button placket',vs,fs,placket_mat);parts=[patch]
    for z in [1.390,1.358,1.326,1.294]:
        parts.append(sphere('T06 navy button',front(0,z,.0035),(.0055,.0022,.0055),navy,segments=16,rings=8))
    for part in parts:inherit_detail_weights(part,obj,arm)
    bpy.ops.object.select_all(action='DESELECT')
    for part in [obj,*parts]:part.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return obj

if __name__=='__main__':build_piece('T06',create_henley,long_top_coverage)
