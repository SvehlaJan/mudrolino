"""Report exact material/rest/posed regions for a body or garment contact."""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh,bvh

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True)
p.add_argument('--mesh',required=True);p.add_argument('--obstacle',required=True)
p.add_argument('--motion',choices=['rest','walk','run'],default='rest')
p.add_argument('--frame',type=float,default=0);p.add_argument('--report',type=Path,required=True)
p.add_argument('--mesh-material',action='append',default=[])
p.add_argument('--obstacle-material',action='append',default=[])
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()))
arm=bpy.data.objects['Armature_Catalog'];reset(arm)
if a.motion!='rest':
    action=bpy.data.actions[a.motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
bpy.context.scene.frame_set(math.floor(a.frame),subframe=a.frame-math.floor(a.frame));bpy.context.view_layer.update()
cloth=bpy.data.objects[a.mesh];opponent=bpy.data.objects[a.obstacle]
from mathutils.bvhtree import BVHTree
def role_mesh(obj,names):
    points,faces=world_mesh(obj);indices=list(range(len(faces)))
    if names:
        assert all(m.type=='ARMATURE' for m in obj.modifiers),'Material diagnostics need stable evaluated topology'
        assert set(names)<={m.name for m in obj.data.materials}
        assert len(faces)==len(obj.data.polygons)
        indices=[i for i in indices if obj.data.materials[obj.data.polygons[i].material_index].name in names]
        faces=[faces[i] for i in indices]
        assert faces
    return points,faces,indices
points,faces,source_faces=role_mesh(cloth,a.mesh_material)
other_points,other_faces,_=role_mesh(opponent,a.obstacle_material)
tree=BVHTree.FromPolygons(points,faces);other_tree=BVHTree.FromPolygons(other_points,other_faces);pairs=tree.overlap(other_tree)
def bounds(points,ids):
    return [[min(points[i][k] for i in ids),max(points[i][k] for i in ids)] for k in range(3)] if ids else []
cloth_ids={i for face,_ in pairs for i in faces[face]};other_ids={i for _,face in pairs for i in other_faces[face]}
materials={};samples=[]
for face in sorted({i for i,_ in pairs}):
    material=cloth.data.materials[cloth.data.polygons[source_faces[face]].material_index].name
    materials[material]=materials.get(material,0)+1
    center=sum((points[i] for i in faces[face]),Vector())/len(faces[face])
    point,normal,_,distance=other_tree.find_nearest(center)
    if len(samples)<20:samples.append({'material':material,'world_center':list(center),'rest_center':list(sum((cloth.data.vertices[i].co for i in faces[face]),Vector())/len(faces[face])),'nearest_obstacle':list(point),'normal':list(normal),'signed_surface_distance':(center-point).dot(normal)})
report={'source':str(a.blend),'source_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),'motion':a.motion,'frame':a.frame,'cloth':a.mesh,'obstacle':a.obstacle,'pairs':len(pairs),'contact_material_faces':materials,'cloth_rest_xyz':bounds([v.co for v in cloth.data.vertices],cloth_ids),'cloth_posed_xyz':bounds(points,cloth_ids),'obstacle_posed_xyz':bounds(other_points,other_ids),'samples':samples,'note':'Nearest normals can face the inside of thick hollow garments; inspect the surface role before projecting targets.'}
a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n');print('CONTACT_DIAGNOSIS',json.dumps(report))
