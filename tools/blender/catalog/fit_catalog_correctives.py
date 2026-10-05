"""Project corrective targets out of measured animated body/garment contacts."""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh,bvh

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--mesh',required=True);p.add_argument('--shoe-source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--report',type=Path,required=True);p.add_argument('--iterations',type=int,default=6)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()));bpy.context.preferences.filepaths.save_version=0
assert a.iterations>0
assert a.output.resolve()!=a.blend.resolve(),'Fitting studies must not replace their source master'
arm=bpy.data.objects['Armature_Catalog'];cloth=bpy.data.objects[a.mesh];body=bpy.data.objects['body_underlayer_male'];reset(arm)
before=set(bpy.data.objects)
with bpy.data.libraries.load(str(a.shoe_source.resolve()),link=False) as (source,data):data.objects=['F01_strap_sneakers']
proto=data.objects[0];mesh=proto.data.copy();mesh.transform(proto.matrix_world);shoe=bpy.data.objects.new('Fit_sneaker_obstacle',mesh);bpy.context.collection.objects.link(shoe)
assert [g.name for g in shoe.vertex_groups]==[g.name for g in proto.vertex_groups]
skin=shoe.modifiers.new('Fit shared rig','ARMATURE');skin.object=arm;shoe.parent=arm;shoe.matrix_world=Matrix.Identity(4)
for obj in list(bpy.data.objects):
 if obj not in before and obj!=shoe:bpy.data.objects.remove(obj,do_unlink=True)
keys=cloth.data.shape_keys.key_blocks
adjacency=[set() for _ in cloth.data.vertices]
for edge in cloth.data.edges:
 i,j=edge.vertices;adjacency[i].add(j);adjacency[j].add(i)
poses=[]
for motion in ['walk','run']:
 action=bpy.data.actions[motion];start,end=map(float,action.frame_range)
 frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
 poses.extend((motion,frame) for frame in frames)
history=[]
key_names=['knee_clearance_Left','knee_clearance_Right']
initial={name:[point.co.copy() for point in keys[name].data] for name in key_names}
best_snapshot=initial;best_metrics=None;best_iteration=None;stopped_reason='iteration limit'

def skin_matrix(vertex):
    result=Matrix(((0,0,0,0),)*4)
    for w in vertex.groups:
        name=cloth.vertex_groups[w.group].name
        result+=(arm.matrix_world@arm.pose.bones[name].matrix@arm.data.bones[name].matrix_local.inverted()@arm.matrix_world.inverted())*w.weight
    return result.to_3x3()

for iteration in range(a.iterations+1):
    corrections={name:{} for name in ['knee_clearance_Left','knee_clearance_Right']};max_body=0;max_shoe=0;sum_pairs=0;unresolved=0
    for motion,frame in poses:
        reset(arm);action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
        points,faces=world_mesh(cloth);tree=bvh(cloth)[0]
        for opponent in [body,shoe]:
            obstacle=bvh(opponent)[0];pairs=tree.overlap(obstacle);sum_pairs+=len(pairs)
            if opponent==body:max_body=max(max_body,len(pairs))
            else:max_shoe=max(max_shoe,len(pairs))
            face_ids=sorted({i for i,_ in pairs})
            for face_id in face_ids:
                ids=faces[face_id];samples=[points[i] for i in ids]
                samples += [(points[ids[i]]+points[ids[(i+1)%len(ids)]])*.5 for i in range(len(ids))]
                samples.append(sum((points[i] for i in ids),Vector())/len(ids))
                displacement=Vector()
                for point in samples:
                    nearest,normal,_,distance=obstacle.find_nearest(point)
                    signed=(point-nearest).dot(normal)
                    if distance<.06 and signed<.003:
                        proposal=normal*(.004-signed)
                        if proposal.length>displacement.length:displacement=proposal
                if not displacement.length:
                    unresolved+=1;continue
                for index in ids:
                    vertex=cloth.data.vertices[index];side='Left' if vertex.co.x>=0 else 'Right';name='knee_clearance_'+side;value=keys[name].value
                    # Keep the reference cage and pelvis/detail construction.
                    if value<.2 or vertex.co.z>.88:unresolved+=1;continue
                    delta=skin_matrix(vertex).inverted()@displacement/value
                    if delta.length>.025:delta*=.025/delta.length
                    previous=corrections[name].get(index)
                    if previous is None or previous.length<delta.length:corrections[name][index]=delta
    entry={'iteration':iteration,'max_body_pairs':max_body,'max_shoe_pairs':max_shoe,'total_pairs':sum_pairs,'unresolved_samples':unresolved,'corrected_vertices':{n:len(v) for n,v in corrections.items()}}
    history.append(entry);print('FIT_ITERATION',json.dumps(entry),flush=True)
    metrics={'max_body_pairs':max_body,'max_shoe_pairs':max_shoe,'total_pairs':sum_pairs}
    if best_metrics is not None and (sum_pairs>=best_metrics['total_pairs'] or max_body>best_metrics['max_body_pairs'] or max_shoe>best_metrics['max_shoe_pairs']):
        entry['rejected']=True
        for name,points in best_snapshot.items():
            for point,co in zip(keys[name].data,points):point.co=co
        stopped_reason='contact regression; restored last measured best target'
        print('FIT_REJECTED',json.dumps({'iteration':iteration,'restored_iteration':best_iteration,'saved_metrics':best_metrics}),flush=True)
        break
    best_metrics=metrics;best_iteration=iteration
    best_snapshot={name:[point.co.copy() for point in keys[name].data] for name in key_names}
    if not sum_pairs:
        stopped_reason='sampled contacts cleared; separate proof still required'
        break
    # Every saved target must have a complete sweep. Never save the final
    # unevaluated proposal merely because the requested iterations ran out.
    if iteration==a.iterations:break
    for name,deltas in corrections.items():
        if not deltas:continue
        # Spread the same correction gently to adjacent cloth vertices so
        # crossed faces move together rather than forming isolated spikes.
        spread=dict(deltas)
        for index,delta in deltas.items():
            for neighbor in adjacency[index]:
                if neighbor in deltas or cloth.data.vertices[neighbor].co.z>.88:continue
                proposed=delta*.35;old=spread.get(neighbor)
                if old is None or old.length<proposed.length:spread[neighbor]=proposed
        for index,delta in spread.items():keys[name].data[index].co+=delta
reset(arm);bpy.data.objects.remove(shoe,do_unlink=True);bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(a.output.resolve()))
a.report.write_text(json.dumps({'source':str(a.blend),'source_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),'shoe_source':str(a.shoe_source),'shoe_sha256':hashlib.sha256(a.shoe_source.read_bytes()).hexdigest(),'output':str(a.output),'output_sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'poses':len(poses),'margin_m':.004,'iterations':history,'saved_iteration':best_iteration,'saved_metrics':best_metrics,'stopped_reason':stopped_reason,'max_saved_target_change_m':max((point.co-co).length for name in key_names for point,co in zip(keys[name].data,initial[name])),'status':'study; independent/combined proof and visual review required'},indent=2)+'\n')
