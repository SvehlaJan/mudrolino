import sys,json,argparse,math,hashlib
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh,bvh
parser=argparse.ArgumentParser(description='Sweep every integer walk/run frame; render worst contacts from three views.')
parser.add_argument('--blend',type=Path,required=True)
parser.add_argument('--garment',required=True,help='Comma-separated garment object names')
parser.add_argument('--body',default='body_underlayer_male',help='Comma-separated body/head mesh names')
parser.add_argument('--substeps',type=int,default=1)
parser.add_argument('--target-z',type=float,default=1.12)
parser.add_argument('--ortho-scale',type=float)
parser.add_argument('--require-clear',action='store_true',help='Exit with a failure if any sampled body/layer contacts remain')
parser.add_argument('--output-dir',type=Path,required=True)
parser.add_argument('--review-dir',type=Path,required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.output_dir.mkdir(parents=True,exist_ok=True);args.review_dir.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
arm=bpy.data.objects['Armature_Catalog'];bodies=[bpy.data.objects[name] for name in args.body.split(',')];garments=[bpy.data.objects[name] for name in args.garment.split(',')]
results=[]
for motion in ('walk','run'):
 action=bpy.data.actions[motion]
 reset(arm);arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
 if args.substeps==1:
  frames=list(range(1,int(action.frame_range[1])+1))
 else:
  start,end=map(float,action.frame_range)
  frames=sorted({round(start,5),round(end,5)}|{i/args.substeps for i in range(math.ceil(start*args.substeps),math.floor(end*args.substeps)+1)})
 for frame in frames:
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  body_trees=[bvh(o)[0] for o in bodies];trees=[bvh(o)[0] for o in garments]
  per_body_pairs=[[bt.overlap(tree) for tree in trees] for bt in body_trees]
  body_pairs=[[pair for per_body in per_body_pairs for pair in per_body[i]] for i in range(len(garments))];pairs=[pair for group in body_pairs for pair in group]
  layer_counts={f'{garments[a].name}/{garments[b].name}':len(trees[a].overlap(trees[b])) for a in range(len(trees)) for b in range(a+1,len(trees))}
  points=[]
  for body,groups in zip(bodies,per_body_pairs):
   vertices,faces=world_mesh(body)
   points.extend(sum((vertices[i] for i in faces[a]),Vector())/len(faces[a]) for group in groups for a,b in group)
  record={'motion':motion,'frame':frame,'triangle_pairs':len(pairs),'body_pairs':{o.name:len(p) for o,p in zip(garments,body_pairs)},'garment_layer_pairs':layer_counts}
  if points:record['intersection_region_xyz']=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
  results.append(record)
 worst=max([r for r in results if r['motion']==motion],key=lambda r:r['triangle_pairs']+sum(r['garment_layer_pairs'].values()))
 frame=worst['frame'];bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame))
 for label,pos in [('front',(0,-3,1.2)),('back',(0,3,1.2)),('side',(3,0,1.2))]:
  camera=bpy.context.scene.camera;camera.location=pos
  if args.ortho_scale:camera.data.ortho_scale=args.ortho_scale
  camera.rotation_euler=(Vector((0,0,args.target_z))-camera.location).to_track_quat('-Z','Y').to_euler()
  bpy.context.scene.render.filepath=str(args.review_dir/f'{motion}-worst-{label}-review.png');bpy.ops.render.render(write_still=True)
out=args.output_dir/('motion-sweep.json' if args.substeps==1 else f'motion-sweep-{args.substeps}x.json');out.write_text(json.dumps(results,indent=2));print('SWEEP_WORST',json.dumps(sorted(results,key=lambda r:r['triangle_pairs']+sum(r['garment_layer_pairs'].values()),reverse=True)[:5]))
metadata={'blend':str(args.blend),'blend_sha256':hashlib.sha256(args.blend.read_bytes()).hexdigest(),'blender':bpy.app.version_string,'body_meshes':[o.name for o in bodies],'garment_meshes':[o.name for o in garments],'samples':len(results),'substeps':args.substeps,'max_body_pairs':max(r['triangle_pairs'] for r in results),'max_layer_pairs':max(sum(r['garment_layer_pairs'].values()) for r in results),'review_width':bpy.context.scene.render.resolution_x}
out.with_name(out.stem+'-metadata.json').write_text(json.dumps(metadata,indent=2));print('SWEEP_METADATA',json.dumps(metadata))
if args.require_clear:assert metadata['max_body_pairs']==0 and metadata['max_layer_pairs']==0,metadata
