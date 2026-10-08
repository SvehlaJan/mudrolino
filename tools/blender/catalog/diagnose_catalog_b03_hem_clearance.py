"""One non-saving, measured longitudinal hem-shortening counterfactual for B03."""
import json,sys,math
from pathlib import Path
from collections import Counter
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,world_mesh,setup_render
from repair_catalog_b04_corrective_sides import signature,normalized,digest
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
SOURCE=Path('assets/avatar/catalog-a/B03/fitting-revisions/independent-keys-repair/B03.blend')
OUT=SOURCE.parent/'bodyfit-diagnosis-2026-10-07/hem-clearance'
SHA='f6417b0486823a00ca58a29eb21bc3283a505593eb8002cc26883087200517a7'
ANCHOR=.858;MARGIN=.006;CAP=.12
SHELL={'A navy shorts fabric','A navy shorts trim','A orange shorts inside facing'}
DETAIL='A navy shorts pockets and seams'
assert not OUT.exists(),'Preserve previous counterfactual'
assert digest(SOURCE)==SHA
tools=local_dependencies(Path('tools/blender/catalog'),[Path(__file__).name]);tools.update(snapshot_files(Path('tools/avatar')/n for n in ['blender_cli.py','blender_queue.py']))
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
obj=bpy.data.objects['B03_casual_shorts'];body=bpy.data.objects['body_underlayer_male'];arm=bpy.data.objects['Armature_Catalog']
before=normalized(signature());reset(arm)
assert all(not mod.use_deform_preserve_volume for mod in obj.modifiers if mod.type=='ARMATURE'),'Unsupported nonlinear skinning'
rest=[v.co.copy() for v in obj.data.vertices];weights=[{obj.vertex_groups[w.group].name:w.weight for w in v.groups} for v in obj.data.vertices]
points,faces=world_mesh(obj);body_rest,body_faces=world_mesh(body)
hem=min(rest[i].z for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL for i in p.vertices)
fade=[max(0,min(1,(ANCHOR-p.z)/(ANCHOR-hem))) for p in rest]
body_eval=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=body_eval.to_mesh()
body_weights=[{body.vertex_groups[w.group].name:w.weight for w in v.groups} for v in mesh.vertices];body_eval.to_mesh_clear()
def bone(face):
 c=Counter()
 for i in face:c.update(body_weights[i])
 return c.most_common(1)[0][0]
roles=[bone(f) for f in body_faces]
lower={name for name in arm.data.bones.keys() if name=='Hips' or any(x in name for x in ['UpLeg','Leg','Foot','ToeBase'])}
lower_faces=[f for f,role in zip(body_faces,roles) if role in lower]
required=[];unresolved=[];baseline=[]
for motion in ['walk','run']:
 reset(arm);action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
 start,end=map(float,action.frame_range);frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
 for frame in frames:
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  cp,cf=world_mesh(obj);bp,bf=world_mesh(body)
  btree=BVHTree.FromPolygons(bp,bf);pairs=BVHTree.FromPolygons(cp,cf).overlap(btree)
  baseline.append({'motion':motion,'frame':frame,'body_pairs':len(pairs)})
  tree=BVHTree.FromPolygons(bp,lower_faces)
  matrices={name:arm.matrix_world@arm.pose.bones[name].matrix@arm.data.bones[name].matrix_local.inverted()@arm.matrix_world.inverted() for name in arm.data.bones.keys()}
  slopes=[sum(((matrices[name].to_3x3()@Vector((0,0,fade[i])))*w for name,w in ws.items()),Vector()) for i,ws in enumerate(weights)]
  for a in sorted({a for a,b in pairs}):
   ids=cf[a];samples=[[(i,1)] for i in ids]+[[(ids[j],.5),(ids[(j+1)%len(ids)],.5)] for j in range(len(ids))]+[[(i,1/len(ids)) for i in ids]]
   for membership in samples:
    p=sum((cp[i]*w for i,w in membership),Vector());slope=sum((slopes[i]*w for i,w in membership),Vector())
    if slope.length<1e-8:unresolved.append({'motion':motion,'frame':frame,'face':a,'reason':'No allowed hem support'});continue
    # Fixed construction axis, complete lower-body obstacle, one finite probe.
    hit,n,face,d=tree.ray_cast(p+slope*CAP,-slope.normalized(),CAP*slope.length)
    if hit is None:continue
    lift=(CAP*slope.length-d+MARGIN)/slope.length
    if lift>0:
     required.append({'motion':motion,'frame':frame,'cloth_face':a,'required_hem_lift_m':lift,
       'world_slope_m_per_m':slope.length,'ray_exit_world':list(hit),'body_roles':sorted({roles[b] for ca,b in pairs if ca==a}),
       'construction_support':[(i,w,fade[i]) for i,w in membership]})
assert len(baseline)==163 and max(r['body_pairs'] for r in baseline)==338 and sum(r['body_pairs'] for r in baseline)==4159
maximum=max(r['required_hem_lift_m'] for r in required)
# One measured candidate, no parameter grid and no repeated projection/iteration.
lift=min(CAP,maximum)
original_keys={key.name:[p.co.copy() for p in key.data] for key in obj.data.shape_keys.key_blocks}
reset(arm)
for i,f in enumerate(fade):
 obj.data.vertices[i].co.z+=lift*f
 for key in obj.data.shape_keys.key_blocks:key.data[i].co.z+=lift*f
cloth=[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
detail_faces=[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name==DETAIL]
detail_ids=sorted({i for f in detail_faces for i in f})
checks=[]
for motion in ['rest','walk','run']:
 reset(arm)
 if motion=='rest':frames=[0]
 else:
  action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
  start,end=map(float,action.frame_range);frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
 for frame in frames:
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  cp,cf=world_mesh(obj);bp,bf=world_mesh(body);tree=BVHTree.FromPolygons(cp,cloth)
  pairs=BVHTree.FromPolygons(cp,cf).overlap(BVHTree.FromPolygons(bp,bf))
  checks.append({'motion':motion,'frame':frame,'body_pairs':len(pairs),
   'detail_own_shell_pairs':len(tree.overlap(BVHTree.FromPolygons(cp,detail_faces))),
   'max_detail_distance_m':max(tree.find_nearest(cp[i])[3] for i in detail_ids),
   'body_role_pair_counts':dict(Counter(roles[b] for a,b in pairs))})
# Evaluate neutral, independent full Left/Right and combined full target endpoints at rest without altering drivers.
reset(arm);bpy.context.scene.frame_set(0);bpy.context.view_layer.update();bp,bf=world_mesh(body);btree=BVHTree.FromPolygons(bp,bf)
basis=[p.co.copy() for p in obj.data.shape_keys.key_blocks['Basis'].data]
endpoints=[]
for lv,rv in [(0,0),(1,0),(0,1),(1,1)]:
 cp=[obj.matrix_world@(b+(obj.data.shape_keys.key_blocks['knee_clearance_Left'].data[i].co-b)*lv+(obj.data.shape_keys.key_blocks['knee_clearance_Right'].data[i].co-b)*rv) for i,b in enumerate(basis)]
 endpoints.append({'Left':lv,'Right':rv,'body_pairs':len(BVHTree.FromPolygons(cp,faces).overlap(btree))})
OUT.mkdir(parents=True);camera=setup_render();camera.data.ortho_scale=1.18;reviews=[]
for view,pos in [('front',(0,-3,.55)),('back',(0,3,.55)),('right',(3,0,.55))]:
 camera.location=pos;camera.rotation_euler=(Vector((0,0,.52))-camera.location).to_track_quat('-Z','Y').to_euler()
 path=OUT/('counterfactual-rest-'+view+'-review.png');bpy.context.scene.render.filepath=str(path.resolve());bpy.ops.render.render(write_still=True);reviews.append(str(path))
# Restore exact original fields and verify canonical repaired bytes remain unchanged.
for i,p in enumerate(rest):obj.data.vertices[i].co=p
for key in obj.data.shape_keys.key_blocks:
 for point,p in zip(key.data,original_keys[key.name]):point.co=p
assert normalized(signature())==before and digest(SOURCE)==SHA;assert_snapshot(tools)
report={'status':'one measured non-saving construction counterfactual; not a saved or accepted source',
 'source':str(SOURCE),'source_sha256':SHA,'tool_hashes':tools,'source_unchanged':True,'all_recorded_invariants_restored_exactly':True,
 'construction':'Longitudinal shortening below authored leg/pelvis anchor0.858 m; same per-Basis-vertex Z offset added to mesh, Basis and both keys, preserving intended morph deltas. No new controls, weights or topology.',
 'old_hem_m':hem,'proposed_hem_m':hem+lift,'lift_m':lift,'measured_required_lift_m':maximum,'cap_m':CAP,'desired_clearance_m':MARGIN,
 'highest_required_samples':sorted(required,key=lambda r:-r['required_hem_lift_m'])[:20],'unresolved_support':unresolved,
 'checks':checks,'samples':len(checks),'endpoints':endpoints,'max_body_pairs':max(r['body_pairs'] for r in checks),
 'total_body_pairs':sum(r['body_pairs'] for r in checks),'max_detail_distance_m':max(r['max_detail_distance_m'] for r in checks),
 'max_detail_own_shell_pairs':max(r['detail_own_shell_pairs'] for r in checks),'reviews':reviews,'review_width':320,
 'scope':'One fixed-axis full-leg/foot clearance measurement followed by one in-memory candidate. Complete163 body poses plus rest/details/endpoints; no grid, nearest-normal projection, source/model save or export. Native screen results determine whether to propose the construction.'}
(OUT/'hem-clearance-counterfactual.json').write_text(json.dumps(report,indent=2)+'\n')
print('B03_HEM_COUNTERFACTUAL',json.dumps({k:v for k,v in report.items() if k not in ['checks','highest_required_samples','unresolved_support']}))
