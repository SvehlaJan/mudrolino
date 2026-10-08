"""No-save F02 offset diagnosis: one geometric variable, unchanged limits/weights."""
import hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh
from catalog_footwear_geometry import foot_rest_transform
from f02_tab_offset_plan import plan_offset
source=Path('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.blend')
sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha=='92ffa5913e4eaec9015b8e414f38b757e032375fc3d1194f4932dffd17a25f0f'
output=Path(__file__).with_name('offset-probe-report.json');assert not output.exists()
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()));arm=bpy.data.objects['Armature_Catalog'];obj=bpy.data.objects['F02_slip_ons'];reset(arm)
keys=obj.data.shape_keys.key_blocks;coordinates={key.name:[list(p.co) for p in key.data] for key in keys}
detail_name='A orange slip-on heel tabs';gores='A dark slip-on elastic gores';names=['A navy slip-on upper','A navy slip-on collar','A ivory slip-on sole']
cloth=[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in names]
faces={name:[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name==name] for name in [detail_name,gores]}
ids={name:sorted({i for face in rows for i in face}) for name,rows in faces.items()}
rear={name:list(foot_rest_transform(arm,sign).to_3x3()@Vector((0,1,0))) for name,sign in [('Left',1),('Right',-1)]}
records=[]
try:
 for offset in [0,.001,.002,.003,.004]:
  proposed=coordinates if offset==0 else plan_offset(coordinates,ids[detail_name],rear,offset)['coordinates']
  reset(arm)
  for key in keys:
   for i in ids[detail_name]:key.data[i].co=proposed[key.name][i]
  for i in ids[detail_name]:obj.data.vertices[i].co=proposed['Basis'][i]
  obj.data.update();bpy.context.view_layer.update();checks=[]
  for motion in ['rest','walk','run']:
   reset(arm)
   if motion=='rest':frames=[0]
   else:
    action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0];start,end=map(float,action.frame_range);frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
   for frame in frames:
    bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update();points,_=world_mesh(obj);tree=BVHTree.FromPolygons(points,cloth)
    checks.append({'motion':motion,'frame':frame,'detail_shell_pairs':{name:len(tree.overlap(BVHTree.FromPolygons(points,rows))) for name,rows in faces.items()},'max_cloth_distance_m':{name:max(tree.find_nearest(points[i])[3] for i in vertices) for name,vertices in ids.items()}})
  maximum=max(value for r in checks for value in r['detail_shell_pairs'].values());distance=max(value for r in checks for value in r['max_cloth_distance_m'].values())
  record={'offset_m':offset,'samples':len(checks),'maximum_pairs':maximum,'max_cloth_distance_m':distance,'passed':maximum==0 and distance<.012,'worst':max(checks,key=lambda r:max(r['detail_shell_pairs'].values())),'checks':checks};records.append(record)
  output.write_text(json.dumps({'source':str(source),'source_sha256':sha,'source_saved':False,'threshold_m':.012,'attachment_roles':None,'records':records},indent=2)+'\n');print('F02_OFFSET_PROBE',json.dumps({k:v for k,v in record.items() if k!='checks'}),flush=True)
finally:
 reset(arm)
 for key in keys:
  for i in ids[detail_name]:key.data[i].co=coordinates[key.name][i]
 for i in ids[detail_name]:obj.data.vertices[i].co=coordinates['Basis'][i]
 obj.data.update();bpy.context.view_layer.update()
 assert all(list(key.data[i].co)==coordinates[key.name][i] for key in keys for i in ids[detail_name])
 assert hashlib.sha256(source.read_bytes()).hexdigest()==sha
