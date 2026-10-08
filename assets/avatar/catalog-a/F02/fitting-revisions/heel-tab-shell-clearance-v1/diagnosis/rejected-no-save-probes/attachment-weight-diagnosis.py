"""Read-only F02 exact rest-anchor triangle and posed attachment transport diagnosis."""
import hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh
source=Path('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.blend');sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha=='92ffa5913e4eaec9015b8e414f38b757e032375fc3d1194f4932dffd17a25f0f'
output=Path(__file__).with_name('attachment-weight-diagnosis.json');assert not output.exists()
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()));arm=bpy.data.objects['Armature_Catalog'];obj=bpy.data.objects['F02_slip_ons'];reset(arm)
names={'A navy slip-on upper','A navy slip-on collar','A ivory slip-on sole'};tab='A orange slip-on heel tabs'
obj.data.calc_loop_triangles();triangles=[tuple(t.vertices) for t in obj.data.loop_triangles if obj.data.materials[obj.data.polygons[t.polygon_index].material_index].name in names]
points=[p.co.copy() for p in obj.data.shape_keys.key_blocks['Basis'].data];tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
ids=sorted({i for p in obj.data.polygons if obj.data.materials[p.material_index].name==tab for i in p.vertices});anchors={}
for i in ids:
 hit,normal,face,distance=tree.find_nearest(points[i]);vertices=triangles[face];a,b,c=[points[x] for x in vertices]
 factors=list(barycentric_transform(hit,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))));weights={}
 for v,factor in zip(vertices,factors):
  for w in obj.data.vertices[v].groups:weights[w.group]=weights.get(w.group,0)+factor*w.weight
 actual={w.group:w.weight for w in obj.data.vertices[i].groups};diff=max(abs(actual.get(g,0)-weights.get(g,0)) for g in set(actual)|set(weights))
 anchors[i]={'shell_vertices':vertices,'factors':factors,'rest_distance_m':distance,'max_weight_difference':diff,'tab_weights':{obj.vertex_groups[g].name:w for g,w in actual.items()},'shell_weights':{obj.vertex_groups[g].name:w for g,w in weights.items()}}
records=[]
for frame in [0,2.5,4.75,7.25,12.25,12.75,15.25]:
 reset(arm)
 if frame:action=bpy.data.actions['run'];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update();posed,_=world_mesh(obj)
 samples=[]
 for i,anchor in anchors.items():
  target=sum((posed[v]*factor for v,factor in zip(anchor['shell_vertices'],anchor['factors'])),Vector());delta=posed[i]-target
  samples.append({'index':i,'side':'Left' if points[i].x>0 else 'Right','tab_to_followed_triangle_m':delta.length,'delta_world_m':list(delta)})
 records.append({'frame':frame,'corrective_values':{key.name:key.value for key in obj.data.shape_keys.key_blocks if key.name!='Basis'},'samples':samples})
output.write_text(json.dumps({'source':str(source),'source_sha256':sha,'source_saved':False,'anchors':anchors,'records':records},indent=2)+'\n');assert hashlib.sha256(source.read_bytes()).hexdigest()==sha
print('F02_ATTACHMENT_WEIGHTS',json.dumps({'max_weight_difference':max(v['max_weight_difference'] for v in anchors.values()),'max_posed_attachment_distance_m':max(v['tab_to_followed_triangle_m'] for r in records for v in r['samples'])}))
