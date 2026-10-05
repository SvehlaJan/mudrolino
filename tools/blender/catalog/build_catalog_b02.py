"""Palette-A relaxed blue joggers with navy elastic waistband and cuffs."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_bottom_geometry import create_bottom_shell,full_trouser_coverage
from catalog_piece import build_piece,inherit_detail_weights
from build_catalog_head import material,tube

def create_joggers(arm,body):
    blue=material('A blue jogger fabric',(.12,.285,.66),.88)
    navy=material('A navy jogger elastic',(.026,.049,.106),.90)
    seam=material('A blue jogger pocket openings',(.105,.255,.58),.88)
    rings=[(.750,.111,.124),(.670,.110,.117),(.570,.104,.107),(.515,.097,.104),(.475,.093,.101),(.430,.090,.101),(.330,.086,.097),(.265,.080,.090),(.230,.075,.082),(.202,.072,.077),(.190,.071,.075),(.154,.071,.075),(.141,.071,.075),(.135,.072,.076)]
    obj=create_bottom_shell(arm,'B02_joggers',rings,[blue,navy],.954,.202)
    tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])
    parts=[]
    for sign in [-1,1]:
        points=[]
        for i in range(13):
            t=i/12;x=sign*(.115+.039*t);z=.945-.058*t
            p,n,_,_=tree.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)));assert p is not None
            if n.y>0:n.negate()
            points.append(tuple(p+n*.0018))
        opening=tube('B02 soft pocket opening',points,.0016,seam)
        inherit_detail_weights(opening,obj,arm);parts.append(opening)
    bpy.ops.object.select_all(action='DESELECT')
    for part in [obj,*parts]:part.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return obj

if __name__=='__main__':build_piece('B02',create_joggers,full_trouser_coverage)
