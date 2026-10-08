"""Read-only complete-leg B03 contact classification and source-view evidence."""
import argparse
import json
import math
import sys
from collections import Counter
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh, setup_render
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot

SOURCE=Path('assets/avatar/catalog-a/B03/fitting-revisions/independent-keys-repair/B03.blend')
SOURCE_SHA='f6417b0486823a00ca58a29eb21bc3283a505593eb8002cc26883087200517a7'


def bounds(points):
    return [[min(p[axis] for p in points),max(p[axis] for p in points)] for axis in range(3)]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists(),'Preserve earlier diagnosis'
    assert args.output_dir.resolve().is_relative_to(SOURCE.parent.resolve())
    assert digest(SOURCE)==SOURCE_SHA
    tools=local_dependencies(Path('tools/blender/catalog'),[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/name for name in ('blender_cli.py','blender_queue.py')))
    protected={str(p):digest(p) for p in [SOURCE,SOURCE.with_suffix('.glb'),SOURCE.with_name('body-B03.glb'),SOURCE.parent/'repair-report.json',Path('assets/avatar/catalog-a/B03/B03.blend')]}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj=bpy.data.objects['B03_casual_shorts'];body=bpy.data.objects['body_underlayer_male'];arm=bpy.data.objects['Armature_Catalog']
    before=normalized(signature());reset(arm)
    cloth_rest,cloth_faces=world_mesh(obj);body_rest,body_faces=world_mesh(body)
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    body_weights=[{body.vertex_groups[w.group].name:w.weight for w in v.groups} for v in mesh.vertices]
    evaluated.to_mesh_clear()
    assert len(body_weights)==len(body_rest)
    cloth_weights=[{obj.vertex_groups[w.group].name:w.weight for w in v.groups} for v in obj.data.vertices]
    def face_bone(face):
        scores=Counter()
        for i in face:
            scores.update(body_weights[i])
        return scores.most_common(1)[0][0]
    body_roles=[face_bone(face) for face in body_faces]
    keys={key.name:[list(p.co) for p in key.data] for key in obj.data.shape_keys.key_blocks}
    records=[];all_pairs=[]
    baseline=json.loads((SOURCE.parent/'repaired-motion/motion-sweep-4x.json').read_text())
    for motion in ('walk','run'):
        reset(arm);action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
        start,end=map(float,action.frame_range);frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
        for frame in frames:
            bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
            cloth_points,cf=world_mesh(obj);body_points,bf=world_mesh(body)
            assert cf==cloth_faces and bf==body_faces,'Evaluated topology changed'
            cloth_tree=BVHTree.FromPolygons(cloth_points,cf);body_tree=BVHTree.FromPolygons(body_points,bf)
            pairs=cloth_tree.overlap(body_tree)
            expected=next(row['body_pairs']['B03_casual_shorts'] for row in baseline if row['motion']==motion and row['frame']==frame)
            assert len(pairs)==expected,('Baseline reproduction differs',motion,frame,len(pairs),expected)
            group_counts=Counter(body_roles[b] for a,b in pairs)
            materials=Counter(obj.data.materials[obj.data.polygons[a].material_index].name for a,b in pairs)
            row={'motion':motion,'frame':frame,'pairs':len(pairs),'body_bone_pair_counts':dict(group_counts),'material_pair_counts':dict(materials),
                 'corrective_values':{name:obj.data.shape_keys.key_blocks[name].value for name in keys if name!='Basis'}}
            if pairs:
                body_ids={b for a,b in pairs};cloth_ids={a for a,b in pairs}
                row.update({'unique_cloth_faces':len(cloth_ids),'unique_body_faces':len(body_ids),
                    'cloth_rest_bounds':bounds([cloth_rest[i] for a in cloth_ids for i in cf[a]]),
                    'body_contact_rest_bounds':bounds([body_rest[i] for b in body_ids for i in bf[b]]),
                    'cloth_posed_bounds':bounds([cloth_points[i] for a in cloth_ids for i in cf[a]]),
                    'body_contact_posed_bounds':bounds([body_points[i] for b in body_ids for i in bf[b]])})
                if frame in (7.25,8,9,12.75,13):
                    details=[]
                    for a in sorted(cloth_ids):
                        face=cf[a];p=sum((cloth_points[i] for i in face),Vector())/len(face)
                        near,n,b,d=body_tree.find_nearest(p)
                        weights=Counter()
                        for i in face:weights.update(cloth_weights[i])
                        details.append({'cloth_face':a,'material':obj.data.materials[obj.data.polygons[a].material_index].name,
                            'cloth_vertices':list(face),'cloth_rest_center':list(sum((cloth_rest[i] for i in face),Vector())/len(face)),
                            'cloth_posed_center':list(p),'cloth_skin_average':{name:w/len(face) for name,w in weights.items()},
                            'actual_body_faces':[{'face':b,'bone':body_roles[b],'rest_center':list(sum((body_rest[i] for i in bf[b]),Vector())/len(bf[b])),
                                'posed_center':list(sum((body_points[i] for i in bf[b]),Vector())/len(bf[b]))} for ca,b in pairs if ca==a],
                            'nearest_body_face':b,'nearest_body_bone':body_roles[b],'nearest_signed_distance_m':(p-near).dot(n)})
                    row['contact_faces']=details
            records.append(row)
    assert len(records)==163 and sum(r['pairs'] for r in records)==4159 and max(r['pairs'] for r in records)==338
    # Full lower-body source views retain shins and feet, including folded limbs.
    args.output_dir.mkdir(parents=True)
    camera=setup_render();camera.data.ortho_scale=1.18
    reviews=[]
    for motion,frame in [('rest',0),('run',7.25)]:
        reset(arm)
        if motion!='rest':
            action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
        for view,position in [('right',(3,.5,.55)),('back',(0,3,.55))]:
            camera.location=position;camera.rotation_euler=(Vector((0,0,.52))-camera.location).to_track_quat('-Z','Y').to_euler()
            p=args.output_dir/(motion+'-'+str(frame)+'-'+view+'-review.png');bpy.context.scene.render.filepath=str(p.resolve());bpy.ops.render.render(write_still=True);reviews.append(str(p))
    assert normalized(signature())==before,'A source invariant changed during diagnosis'
    assert all(digest(Path(p))==sha for p,sha in protected.items());assert_snapshot(tools)
    report={'status':'read-only diagnosis; no fitted source saved','source':str(SOURCE),'source_sha256':SOURCE_SHA,
        'source_unchanged':True,'protected_hashes':protected,'tool_hashes':tools,'invariants_preserved':list(before),
        'samples':len(records),'max_body_pairs':max(r['pairs'] for r in records),'total_body_pairs':sum(r['pairs'] for r in records),
        'body_role_definition':'Dominant averaged skin bone over actual intersecting evaluated body polygon; complete body includes exposed thighs, calves, feet/toes.',
        'checks':records,'reviews':reviews,'review_width':320,
        'scope':'Source-bound actual polygon contacts across complete163 poses; no projection, target edit, source save/export or fitting acceptance.'}
    (args.output_dir/'complete-leg-contact-diagnosis.json').write_text(json.dumps(report,indent=2)+'\n')
    print('B03_LEG_CONTACT_DIAGNOSIS',json.dumps({k:v for k,v in report.items() if k!='checks'}))


if __name__=='__main__':main()
