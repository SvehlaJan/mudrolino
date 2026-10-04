"""Blue crew sweatshirt with navy collar, hem and cuffs."""
import sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_top_geometry import create_long_top
from catalog_piece import build_piece,long_top_coverage
from build_catalog_head import material

def create_sweatshirt(arm,body):
    obj=create_long_top(arm,body,'T05_crew_sweatshirt')
    blue=material('A blue sweatshirt fabric',(.12,.285,.66),.88)
    navy=material('A navy sweatshirt ribbing',(.026,.049,.106),.9)
    obj.data.materials.append(blue);obj.data.materials.append(navy)
    planes=[(Vector((0,0,.966)),Vector((0,0,1))),(Vector((0,0,1.407)),Vector((0,0,1)))]
    for side in ['Left','Right']:
        a=arm.data.bones[side+'ForeArm'].head_local;b=arm.data.bones[side+'Hand'].head_local
        planes.append((a.lerp(b,.82),(b-a).normalized()))
    bm=bmesh.new();bm.from_mesh(obj.data)
    for point,normal in planes:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,dist=1e-7)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    for polygon in obj.data.polygons:
        p=sum((obj.data.vertices[i].co for i in polygon.vertices),Vector())/len(polygon.vertices)
        arm_amount=sum(w.weight for i in polygon.vertices for w in obj.data.vertices[i].groups if obj.vertex_groups[w.group].name in ['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand'])/len(polygon.vertices)
        trim=p.z>1.407 or (p.z<.966 and arm_amount<.05)
        for side in ['Left','Right']:
            a=arm.data.bones[side+'ForeArm'].head_local;b=arm.data.bones[side+'Hand'].head_local;axis=b-a
            if abs(p.x)>.24 and (p-a).dot(axis)/axis.length_squared>.82:trim=True
        polygon.material_index=int(trim);polygon.use_smooth=True
    return obj

if __name__=='__main__':build_piece('T05',create_sweatshirt,long_top_coverage)
