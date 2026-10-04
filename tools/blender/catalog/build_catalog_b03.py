"""Navy knee-length shorts with exposed-leg coverage and projected pockets."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog_bottom_geometry import create_bottom_shell
from catalog_bottom_details import add_tailored_details
from catalog_piece import build_piece
from build_catalog_head import material
from catalog_correctives import add_shorts_correctives

def create_shorts(arm,body):
    navy=material('A navy shorts fabric',(.028,.052,.105),.88)
    trim=material('A navy shorts trim',(.038,.066,.122),.90)
    details=material('A navy shorts pockets and seams',(.043,.075,.139),.88)
    orange=material('A orange shorts inside facing',(.92,.25,.055),.88)
    rings=[(.750,.106,.123),(.680,.102,.113),(.605,.099,.107),(.563,.097,.104),(.549,.097,.104),(.540,.098,.105)]
    obj=create_bottom_shell(arm,'B03_casual_shorts',rings,[navy,trim],.966,.553)
    # Folded calves need posterior ease beyond the straight-trouser loft.
    # Add up to 26 mm at the back only, fading into the unchanged pelvis.
    # Keep front hem length and exposed knee/leg coverage unchanged.
    for vertex in obj.data.vertices:
        p=vertex.co;rear=max(0,min(1,(p.y-.025)/.10));leg=max(0,min(1,(.835-p.z)/.10))
        p.y+=.026*rear*rear*leg
    obj.data.materials.append(orange)
    for face in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in face.vertices),obj.data.vertices[0].co*0)/len(face.vertices)
        inward=face.normal.x*center.x+face.normal.y*(center.y-.010)<0
        if center.z>.970 and inward:face.material_index=2
    obj=add_tailored_details(obj,arm,details,details)
    add_shorts_correctives(obj,arm,body)
    return obj

def shorts_coverage(body,obj,arm):
    hem=min(v.co.z for v in obj.data.vertices)
    lower={'Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'}
    # Rear hems roll up during flexion, so keep the underlying thighs visible.
    # Only the permanently concealed pelvis receives a coverage mask.
    indices=[v.index for v in body.data.vertices if .835<v.co.z<.956 and abs(v.co.x)<.28 and sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower)>.5]
    assert indices and all(body.data.vertices[i].co.z>hem+.008 for i in indices)
    # Exposed knees, shins and feet are kept in the original body topology.
    assert not set(indices)&{v.index for v in body.data.vertices if v.co.z<=hem+.008}
    return indices

if __name__=='__main__':build_piece('B03',create_shorts,shorts_coverage)
