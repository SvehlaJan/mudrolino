"""Palette-A ankle-height blue sneakers with exactly three ivory straps."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_head import material
from build_catalog_t01 import select
from catalog_bottom_details import mesh_object
from catalog_footwear_geometry import loft,ring,bind_foot_parts,join_footwear,fit_ankle_upper,face_safe_footwear_coverage
from catalog_piece import build_piece,inherit_detail_weights


def projected_strap(upper, name, mat, x_radius, low, high, upright=False):
    tree=BVHTree.FromPolygons([v.co for v in upper.data.vertices],
                             [tuple(p.vertices) for p in upper.data.polygons])
    vertices=[];faces=[]
    for row in range(5):
        coord=low+(high-low)*row/4
        for col in range(13):
            x=-x_radius+2*x_radius*col/12
            origin=Vector((x,-.30,coord)) if upright else Vector((x,coord,.30))
            direction=Vector((0,1,0)) if upright else Vector((0,0,-1))
            point,normal,_,_=tree.ray_cast(origin,direction)
            assert point is not None,(name,x,coord)
            if normal.dot(direction)>0:normal.negate()
            vertices.append(tuple(point+normal*.003))
    for row in range(4):
        for col in range(12):
            i=row*13+col;faces.append((i,i+1,i+14,i+13))
    obj=mesh_object(name,vertices,faces,mat);select(obj)
    thick=obj.modifiers.new('Broad closure thickness','SOLIDIFY');thick.thickness=.003;thick.offset=0
    bpy.ops.object.modifier_apply(modifier=thick.name)
    return obj


def create_high_tops(arm,body):
    blue=material('A blue high-top upper',(.12,.285,.66),.88)
    navy=material('A navy high-top collar',(.026,.049,.106),.90)
    ivory=material('A ivory high-top sole',(.77,.735,.655),.90)
    straps_mat=material('A ivory high-top straps',(.86,.82,.71),.88)
    toe_mat=material('A ivory high-top toe edging',(.86,.82,.71),.88)
    shoes=[]
    for sign in [1,-1]:
        sole=loft('F03 rounded ivory sole',[ring(z,rx,ry,cy) for z,rx,ry,cy in [
            (-.005,.070,.139,-.063),(.002,.078,.147,-.063),
            (.030,.078,.147,-.063),(.038,.074,.143,-.063)]],ivory,True)
        rows=[(.034,.074,.143,-.063),(.051,.074,.141,-.062),
              (.076,.072,.136,-.059),(.095,.067,.112,-.037),
              (.104,.061,.085,-.008),(.118,.061,.074,.010),
              (.130,.060,.070,.010),(.145,.054,.058,.010),
              (.160,.052,.054,.013),(.171,.052,.053,.015),
              (.177,.052,.052,.016),(.184,.052,.052,.017),
              (.185,.052,.052,.017)]
        upper=loft('F03 blue ankle upper',[ring(*row) for row in rows],blue)
        upper.data.materials.append(navy)
        upper.data.materials.append(toe_mat)
        # The collar shares the upper's topology, avoiding overlapping trim
        # meshes and keeping a coherent rounded border after subdivision.
        for face in upper.data.polygons:
            row=face.index//40;sector=face.index%40
            face.material_index=1 if row>=9 else (2 if row<=1 and 12<=sector<=27 else 0)
        select(upper);sub=upper.modifiers.new('Rounded high-top upper','SUBSURF');sub.levels=1
        bpy.ops.object.modifier_apply(modifier=sub.name)
        fit_ankle_upper(upper,arm,body,sign)
        thick=upper.modifiers.new('High-top upper thickness','SOLIDIFY');thick.thickness=.0025;thick.offset=0
        bpy.ops.object.modifier_apply(modifier=thick.name)
        closures=[
            projected_strap(upper,'F03 lower ivory strap',straps_mat,.059,-.112,-.084),
            projected_strap(upper,'F03 middle ivory strap',straps_mat,.052,.116,.138,True),
            projected_strap(upper,'F03 ankle ivory strap',straps_mat,.050,.145,.169,True),
        ]
        parts=[sole,upper,*closures]
        bind_foot_parts(parts,arm,body,sign,ankle_max_z=.240,ankle_weight_mode='triangle')
        shell=join_footwear(parts[:2],'F03 fitted high-top shell')
        for closure in closures:
            for group in list(closure.vertex_groups):closure.vertex_groups.remove(group)
            inherit_detail_weights(closure,shell,arm)
        shoes.append(join_footwear([shell,*closures],'F03 anatomical high-top'))
    return join_footwear(shoes,'F03_high_tops')


def high_top_coverage(body,obj,arm):
    return face_safe_footwear_coverage(body,.181)


if __name__=='__main__':
    build_piece('F03',create_high_tops,high_top_coverage,
                review_target_z=.15,review_ortho_scale=.67)
