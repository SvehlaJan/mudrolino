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

# The construction target forbids dangling strings; revisions turn the canonical cords off.
DRAWCORDS=True
# Canonical zip tape half-width and pull; the zip-lining revision widens the tape so the
# ivory zip reads at phone size, and adds an orange lining binding along the front neckline.
ZIP_HALF_WIDTH=.0018
PULL_SCALE=(.004,.002,.005)
LINING_COLLAR=False
COLLAR={'half_span':.105,'zip_gap':.0095,'below_rim':(.003,.017),'samples':16}

def neckline_rim(tree,x,low=1.30,high=1.50,step=.001):
    """Highest z at which a ray from the front still hits the hoodie's front or neck side."""
    rim=None;z=low
    while z<=high:
        hit=tree.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)))
        if hit[0] is not None and hit[0].y<.02:rim=z
        z+=step
    assert rim is not None,x
    return rim

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
        for x in [-ZIP_HALF_WIDTH,ZIP_HALF_WIDTH]:vs.append(tuple(front(x,z)))
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
        if DRAWCORDS:cord=tube('T04 ivory drawcord',points,.0017,ivory);parts.append(cord)
    pull=front(0,1.402,.004);parts.append(sphere('T04 rounded zipper pull',pull,PULL_SCALE,ivory,segments=12,rings=8))
    if LINING_COLLAR:
        # Two ribbons just under the neckline rim, from the zip edge to the hood's lined
        # ends at the neck sides, so the orange lining frames the neck from the front.
        lining=material('A orange zip hoodie collar lining',(.90,.245,.045),.88)
        vs=[];fs=[];n=COLLAR['samples']
        for sign in [-1,1]:
            base=len(vs)
            for i in range(n+1):
                x=sign*(COLLAR['zip_gap']+(COLLAR['half_span']-COLLAR['zip_gap'])*i/n);rim=neckline_rim(tree,x)
                for below in COLLAR['below_rim']:vs.append(tuple(front(x,rim-below,.004)))
            for i in range(n):
                j=base+2*i;fs.append((j,j+1,j+3,j+2) if sign>0 else (j,j+2,j+3,j+1))
        parts.append(mesh_object('T04 collar lining',vs,fs,lining))
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
