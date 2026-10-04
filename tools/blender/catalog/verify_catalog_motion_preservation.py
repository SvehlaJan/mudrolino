import bpy,sys,json
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from prepare_catalog_body import action_curves
bpy.ops.wm.open_mainfile(filepath=str((Path.cwd()/'assets/avatar/catalog-a/foundation/catalog-body.blend').resolve()))
def values(curve):return [(list(p.co),list(p.handle_left),list(p.handle_right),p.interpolation) for p in curve.keyframe_points]
report={}
for name in ['walk','run']:
 original={ (c.data_path,c.array_index):c for c in action_curves(bpy.data.actions[name+'_source'])}
 current={ (c.data_path,c.array_index):c for c in action_curves(bpy.data.actions[name])};assert set(current)==set(original)
 changed=[];preserved=0
 for key,curve in original.items():
  if values(curve)!=values(current[key]):changed.append(key)
  else:preserved+=1
 allowed=['LeftArm','RightArm']+(['LeftLeg','RightLeg'] if name=='run' else [])
 assert len(changed)==len(allowed)*4 and all(k[0] in [f'pose.bones["{bone}"].rotation_quaternion' for bone in allowed] for k in changed),changed
 delta=max(abs(x-y) for x,y in zip(bpy.data.actions[name].frame_range,bpy.data.actions[name+'_source'].frame_range));assert delta<.00001,delta
 report[name]={'unchanged_curves':preserved,'modified_curves':changed,'frame_range':list(bpy.data.actions[name].frame_range),'max_endpoint_delta_frames':delta}
print('MOTION_PRESERVATION',json.dumps(report));(Path.cwd()/'assets/avatar/catalog-a/foundation/motion-preservation-report.json').write_text(json.dumps(report,indent=2))
