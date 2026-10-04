"""Render an exact diagnostic pose, including zero-contact regression cases."""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset,setup_render,bvh

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True)
p.add_argument('--motion',choices=['rest','walk','run'],default='rest')
p.add_argument('--frame',type=float,default=0);p.add_argument('--garments',required=True)
p.add_argument('--target-z',type=float,default=.92);p.add_argument('--ortho-scale',type=float,default=2.10)
p.add_argument('--output-dir',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()))
arm=bpy.data.objects['Armature_Catalog'];reset(arm)
if a.motion!='rest':
    action=bpy.data.actions[a.motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
bpy.context.scene.frame_set(math.floor(a.frame),subframe=a.frame-math.floor(a.frame));bpy.context.view_layer.update()
garments=[bpy.data.objects[name] for name in a.garments.split(',')]
trees=[bvh(obj)[0] for obj in garments]
body=[bvh(bpy.data.objects[name])[0] for name in ['body_underlayer_male','H01_head']]
contacts={'body_pairs':{obj.name:sum(len(tree.overlap(obstacle)) for obstacle in body) for obj,tree in zip(garments,trees)},
          'layer_pairs':{garments[i].name+'/'+garments[j].name:len(trees[i].overlap(trees[j])) for i in range(len(trees)) for j in range(i+1,len(trees))}}
camera=setup_render();camera.data.ortho_scale=a.ortho_scale
assert bpy.context.scene.render.resolution_x<=320
a.output_dir.mkdir(parents=True,exist_ok=True);files=[]
for label,position in [('front',(0,-3,a.target_z+.1)),('back',(0,3,a.target_z+.1)),('side',(3,0,a.target_z+.1))]:
    camera.location=position;camera.rotation_euler=(Vector((0,0,a.target_z))-camera.location).to_track_quat('-Z','Y').to_euler()
    file=a.output_dir/(label+'-review.png');bpy.context.scene.render.filepath=str(file.resolve())
    bpy.ops.render.render(write_still=True);files.append(str(file))
keys={obj.name:{key.name:key.value for key in obj.data.shape_keys.key_blocks if key.name.startswith('knee_clearance_')} for obj in garments if obj.data.shape_keys}
report={'blend':str(a.blend),'blend_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),
        'motion':a.motion,'frame':a.frame,'contacts':contacts,'corrective_values':keys,
        'reviews':files,'review_width':bpy.context.scene.render.resolution_x}
(a.output_dir/'pose-review.json').write_text(json.dumps(report,indent=2)+'\n')
print('EXACT_POSE_REVIEW',json.dumps(report))
