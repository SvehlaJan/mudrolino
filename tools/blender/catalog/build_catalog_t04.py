"""Navy zip hoodie with orange hood lining and projected stitched details."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_top_geometry import create_long_top,clamp
from catalog_piece import build_piece,long_top_coverage,inherit_detail_weights
from build_catalog_t02 import create_hood,mesh_object
from build_catalog_head import material,tube,sphere

def create_zip_hoodie(arm,body):
    obj=create_long_top(arm,body,'T04_zip_hoodie')
    navy=material('A navy zip hoodie fabric',(.026,.049,.106),.87)
    rib=material('A navy zip hoodie ribbing',(.038,.065,.124),.9)
    orange=material('A orange zip hoodie lining',(.90,.245,.045),.88)
    seam=material('A navy zip hoodie pockets',(.048,.077,.135),.88)
    ivory=material('A ivory zipper and drawcords',(.73,.72,.67),.75)
    obj.data.materials.append(navy);obj.data.materials.append(rib)
    for p in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        trim=center.z<.962 and abs(center.x)<.24
        for prefix in ['Left','Right']:
            elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local;axis=wrist-elbow
            t=(center-elbow).dot(axis)/axis.length_squared
            if abs(center.x)>.24 and t>.81:trim=True
        p.material_index=int(trim)
    tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])
    def front(x,z,offset=.0035):
        point,normal,_,_=tree.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)))
        assert point is not None,(x,z)
        if normal.y>0:normal.negate()
        return point+normal*offset
    # Narrow continuous ribbon: actual cloth intersections, not a proxy ellipse.
    vs=[];fs=[]
    for row in range(49):
        z=1.414-(1.414-.938)*row/48
        for x in [-.0018,.0018]:vs.append(tuple(front(x,z)))
    for row in range(48):
        j=row*2;fs.append((j,j+1,j+3,j+2))
    zipper=mesh_object('T04 center zipper',vs,fs,ivory)
    hood=create_hood(navy,orange);hood.name='T04 resting lined hood'
    parts=[zipper,hood]
    for sign in [-1,1]:
        points=[front(sign*x,z,.003) for x,z in [(.145,1.107),(.131,1.075),(.113,1.035),(.092,1.008)]]
        # Low-resolution seam tubes keep hardware subordinate at runtime scale.
        opening=tube('T04 angled pocket opening',points,.0014,seam);parts.append(opening)
        points=[front(sign*x,z,.006) for x,z in [(.046,1.408),(.050,1.381),(.057,1.350),(.055,1.324)]]
        cord=tube('T04 ivory drawcord',points,.0017,ivory);parts.append(cord)
    pull=front(0,1.402,.004);parts.append(sphere('T04 rounded zipper pull',pull,(.004,.002,.005),ivory,segments=12,rings=8))
    for part in parts:
        fn=None
        if part==hood:
            def fn(p):
                t=clamp((p.z-1.405)/.05)*clamp((.11-p.y)/.09)
                return {'Spine':1-t,'neck':t}
        inherit_detail_weights(part,obj,arm,fn)
    bpy.ops.object.select_all(action='DESELECT')
    for part in [obj,*parts]:part.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return obj

if __name__=='__main__':build_piece('T04',create_zip_hoodie,long_top_coverage)
