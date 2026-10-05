"""Ivory/navy raglan tee: bisected material boundaries on the fitted shell."""
import sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_tee_geometry import create_tee
from build_catalog_head import material
from catalog_piece import build_piece,short_top_coverage

def create_raglan(arm,body):
    ivory=material('A ivory raglan fabric',(.82,.76,.64),.86)
    navy=material('A navy raglan sleeves',(.025,.047,.100),.86)
    trim=material('A ivory raglan hems',(.74,.68,.57),.88)
    obj=create_tee(arm,body,panel_materials=[ivory,navy,trim]);obj.name='T03_raglan_tee';obj.data.name='T03 raglan panel surface'
    # Cut the real surface along the diagonal seams, so material boundaries
    # follow edges rather than a face-center stair-step approximation.
    seam=.083+.65*1.414
    bm=bmesh.new();bm.from_mesh(obj.data)
    for point,normal in [((seam,0,0),(1,0,.65)),((-seam,0,0),(-1,0,.65)),((0,0,1.411),(0,0,1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=point,plane_no=normal,clear_inner=False,clear_outer=False)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    for p in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        sleeve=p.material_index==1
        raglan=abs(center.x)+.65*center.z>seam+1e-7
        p.material_index=1 if sleeve or raglan or center.z>1.411 else 2 if center.z<.944 else 0
        p.use_smooth=True
    return obj

if __name__=='__main__':build_piece('T03',create_raglan,short_top_coverage)
