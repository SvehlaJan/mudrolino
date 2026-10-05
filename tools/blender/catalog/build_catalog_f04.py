"""Palette-A orange Chelsea-style ankle boots with navy side gores."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_head import material
from build_catalog_t01 import select
from catalog_bottom_details import mesh_object
from catalog_footwear_geometry import loft,ring,bind_foot_parts,join_footwear,fit_ankle_upper,face_safe_footwear_coverage,add_soft_heel_tab_correctives,fit_fold_to_posed_shell
from catalog_piece import build_piece,inherit_detail_weights

def heel_loop(upper,mat):
    tree=BVHTree.FromPolygons([v.co for v in upper.data.vertices],
                             [tuple(p.vertices) for p in upper.data.polygons])
    vertices=[];faces=[]
    # A small fabric loop has two attached ends and a rounded free bend;
    # it is not a solid standing block or a recolored sneaker closure.
    rows=[(.166,.0015),(.177,.002),(.190,.006),(.200,.008),
          (.203,.010),(.201,.014),(.190,.015),(.177,.012),(.167,.010)]
    for z,offset in rows:
        for x in [-.006,0,.006]:
            point,normal,_,_=tree.ray_cast(Vector((x,.30,min(z,.184))),Vector((0,-1,0)))
            assert point is not None,(x,z)
            if normal.y<0:normal.negate()
            point+=normal*offset;point.z=z;vertices.append(tuple(point))
    for row in range(len(rows)-1):
        for col in range(2):
            i=row*3+col;faces.append((i,i+1,i+4,i+3))
    obj=mesh_object('F04 rounded orange pull loop',vertices,faces,mat)
    select(obj);thick=obj.modifiers.new('Soft loop thickness','SOLIDIFY');thick.thickness=.0015;thick.offset=0
    bpy.ops.object.modifier_apply(modifier=thick.name)
    anchor=obj.data.attributes.new('F04_loop_attachment','BOOLEAN','POINT')
    # Only the two terminal rows are sewn ends; the intervening rising
    # ribbon remains free even where it lies below the fold hinge.
    for vertex,item in zip(obj.data.vertices,anchor.data):item.value=vertex.co.z<=.168
    return obj

def create_ankle_boots(arm,body):
    orange=material('A orange ankle-boot upper',(.92,.25,.055),.88)
    navy=material('A navy ankle-boot elastic gores',(.026,.049,.106),.94)
    ivory=material('A ivory ankle-boot sole',(.77,.735,.655),.90)
    tabs=material('A orange ankle-boot heel loops',(.92,.25,.055),.90)
    shoes=[]
    for sign in [1,-1]:
        sole=loft('F04 rounded ivory sole',[ring(z,rx,ry,cy) for z,rx,ry,cy in [
            (-.005,.070,.139,-.063),(.002,.078,.147,-.063),
            (.030,.078,.147,-.063),(.038,.074,.143,-.063)]],ivory,True)
        rows=[(.034,.074,.143,-.063),(.051,.074,.141,-.062),
              (.076,.072,.136,-.059),(.095,.067,.112,-.037),
              (.104,.061,.085,-.008),(.118,.061,.074,.010),
              (.130,.060,.070,.010),(.145,.054,.058,.010),
              (.160,.052,.054,.013),(.171,.052,.053,.015),
              (.177,.052,.052,.016),(.184,.052,.052,.017),
              (.185,.052,.052,.017)]
        upper=loft('F04 continuous orange upper',[ring(*row) for row in rows],orange)
        upper.data.materials.append(navy)
        for face in upper.data.polygons:
            row=face.index//40;sector=face.index%40
            # ring() starts at the rear (+Y), so side panels center on
            # sectors 10/30 (+X/-X), not 0/20 (rear/front).
            side_panel=6<=sector<=13 or 26<=sector<=33
            rounded_bottom=8<=sector<=11 or 28<=sector<=31
            face.material_index=int((row>=6 and side_panel) or (row==5 and rounded_bottom))
        select(upper);sub=upper.modifiers.new('Rounded boot upper','SUBSURF');sub.levels=1
        bpy.ops.object.modifier_apply(modifier=sub.name)
        fit_ankle_upper(upper,arm,body,sign)
        thick=upper.modifiers.new('Boot upper thickness','SOLIDIFY');thick.thickness=.0025;thick.offset=0
        bpy.ops.object.modifier_apply(modifier=thick.name)
        tab=heel_loop(upper,tabs)
        parts=[sole,upper,tab]
        bind_foot_parts(parts,arm,body,sign,ankle_max_z=.240,ankle_weight_mode='triangle')
        shell=join_footwear(parts[:2],'F04 fitted boot shell')
        for group in list(tab.vertex_groups):tab.vertex_groups.remove(group)
        inherit_detail_weights(tab,shell,arm)
        shoes.append(join_footwear([shell,tab],'F04 anatomical ankle boot'))
    obj=join_footwear(shoes,'F04_ankle_boots')
    add_soft_heel_tab_correctives(obj,arm,tabs.name,base_z=.177)
    fit_fold_to_posed_shell(obj,arm,tabs.name,'F04_loop_attachment')
    return obj

def boot_coverage(body,obj,arm):return face_safe_footwear_coverage(body,.181)

if __name__=='__main__':
    build_piece('F04',create_ankle_boots,boot_coverage,
                review_target_z=.15,review_ortho_scale=.67)
