"""Screen only the 41 inherited Right coordinates, preserving the cuff baseline."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE, SOURCE_SHA
from b04_centre_key_plan import plan_centre_repair
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from repair_catalog_b04_left_patch_attachment import SHELL, DETAILS
from build_catalog_t01 import reset, world_mesh
from catalog_gltf_gait_pose import RuntimeGaitPose
from f02_ankle_measurement import schedule

ROOT = SOURCE.parent.parent.parent/'centre-key-repair-v1'
INSPECTION = ROOT/'inspection/complete-key-inventory.json'
OBJECT = 'B04_ivory_trousers'


def apply_plan(obj, plan, repaired):
    key = obj.data.shape_keys.key_blocks['knee_clearance_Right']
    for row in plan['changes']:
        key.data[row['vertex']].co = row['after' if repaired else 'before']
    obj.data.update()


def expected_signature(before, plan):
    expected = normalized(before)
    for row in plan['changes']:
        expected['meshes'][OBJECT]['keys']['knee_clearance_Right'][row['vertex']] = row['after']
    return expected


def screen(obj, arm, body, shoes, gaits, changed):
    faces = [tuple(f.vertices) for f in obj.data.polygons]
    face_sets = [set(f) for f in faces]
    affected = {i for i, ids in enumerate(face_sets) if ids & changed}
    cloth = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
    details = {name: [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == name] for name in DETAILS}
    ids = {name: {v for face in fs for v in face} for name,fs in details.items()}
    adapter = RuntimeGaitPose(SOURCE.with_suffix('.glb'),gaits,arm)
    rows=[]
    for domain in ('native','runtime-equivalent'):
        for pose in schedule():
            motion,frame=pose['motion'],pose['frame']
            if domain=='runtime-equivalent': adapter.apply(motion,frame,24)
            else:
                reset(arm)
                if motion!='rest':
                    action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
            points,_=world_mesh(obj);tree=BVHTree.FromPolygons(points,faces);shell=BVHTree.FromPolygons(points,cloth)
            bp,bf=world_mesh(body)
            self_pairs=[(a,b) for a,b in tree.overlap(tree) if a<b and (a in affected or b in affected) and not face_sets[a]&face_sets[b]]
            shoe_counts={}
            for name,shoe in shoes.items():
                sp,sf=world_mesh(shoe);shoe_counts[name]=len(tree.overlap(BVHTree.FromPolygons(sp,sf)))
            rows.append({'domain':domain,**pose,'visible_body_pairs':len(tree.overlap(BVHTree.FromPolygons(bp,bf))),
                'shoe_layer_pairs':shoe_counts,'changed_face_self_pairs':len(self_pairs),
                'self_contact_faces':[{'a':a,'b':b,'a_vertices':list(faces[a]),'b_vertices':list(faces[b]),
                    'a_points':[list(points[i]) for i in faces[a]],'b_points':[list(points[i]) for i in faces[b]]} for a,b in self_pairs],
                'detail_shell_pairs':{name:len(shell.overlap(BVHTree.FromPolygons(points,fs))) for name,fs in details.items()},
                'max_cloth_distance_m':{name:max(shell.find_nearest(points[i])[3] for i in vertices) for name,vertices in ids.items()}})
        print('B04_CENTRE_SCREEN_DOMAIN',domain,len(rows),flush=True)
    assert [(r['domain'],r['motion'],r['frame']) for r in rows]==[(d,p['motion'],p['frame']) for d in ('native','runtime-equivalent') for p in schedule()]
    maxima={'body':max(r['visible_body_pairs'] for r in rows),'shoe':max(v for r in rows for v in r['shoe_layer_pairs'].values()),
        'changed_face_self':max(r['changed_face_self_pairs'] for r in rows),'detail_own_shell':max(v for r in rows for v in r['detail_shell_pairs'].values()),
        'detail_distance_m':max(v for r in rows for v in r['max_cloth_distance_m'].values())}
    passed=all(maxima[k]==0 for k in ('body','shoe','changed_face_self','detail_own_shell')) and maxima['detail_distance_m']<.012
    return {'status':'passed' if passed else 'failed','checks':rows,'maxima':maxima,'affected_faces':sorted(affected),
        'samples_per_domain':164,'domains':['native','runtime-equivalent'],'threshold_m':.012,
        'scope':'Complete cheap screen of body, F01/F03, unchanged details and nonincident intersections involving every face touched by the key repair. Fixed original coverage; saved-source outfit/export/actual-Three proof still required.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--save',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert args.output_dir.resolve().is_relative_to(ROOT.resolve()) and not (args.output_dir/'screen-report.json').exists()
    args.output_dir.mkdir(parents=True,exist_ok=True)
    assert digest(SOURCE)==SOURCE_SHA
    inventory=json.loads(INSPECTION.read_text());assert inventory['source_sha256']==SOURCE_SHA
    assert_snapshot(inventory['tool_hashes'])
    values=inventory['points'];plan=plan_centre_repair(values['Basis'],values['knee_clearance_Left'],values['knee_clearance_Right'],41)
    assert abs(plan['max_removed_delta_m']-.02597175829559052)<1e-10
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    shoes_paths={id:Path('assets/avatar/catalog-a')/id/(id+'.blend') for id in ('F01','F03')}
    gaits={m:Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk','run')}
    protected=snapshot_files([SOURCE,SOURCE.with_suffix('.glb'),SOURCE.with_name('body-B04.glb'),INSPECTION,*shoes_paths.values(),*gaits.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj,arm,body=[bpy.data.objects[n] for n in (OBJECT,'Armature_Catalog','body_underlayer_male')]
    reset(arm);before=normalized(signature())
    assert before['meshes'][OBJECT]['keys']==values
    apply_plan(obj,plan,True)
    assert normalized(signature())==expected_signature(before,plan),'Unexpected field changed'
    apply_plan(obj,plan,False)
    shoes={}
    for id,path in shoes_paths.items():
        name={'F01':'F01_strap_sneakers','F03':'F03_high_tops'}[id]
        with bpy.data.libraries.load(str(path.resolve()),link=False) as (src,dst):dst.objects=[name]
        shoe=dst.objects[0];bpy.context.collection.objects.link(shoe)
        source_arm=next(m.object for m in shoe.modifiers if m.type=='ARMATURE')
        assert all(max(abs(source_arm.data.bones[n].matrix_local[i][j]-arm.data.bones[n].matrix_local[i][j]) for i in range(4) for j in range(4))<1e-6 for n in before['rig'])
        for mod in shoe.modifiers:
            if mod.type=='ARMATURE':mod.object=arm
        world=shoe.matrix_world.copy();shoe.parent=arm;shoe.matrix_world=world;shoes[id]=shoe
    results={}
    for variant,repaired in [('baseline',False),('centre-repaired',True)]:
        apply_plan(obj,plan,repaired)
        results[variant]=screen(obj,arm,body,shoes,gaits,{r['vertex'] for r in plan['changes']})
        print('B04_CENTRE_VARIANT',variant,json.dumps(results[variant]['maxima']),flush=True)
    assert_snapshot(tools);assert_snapshot(protected)
    report={'status':'passed' if all(r['status']=='passed' for r in results.values()) else 'failed',
        'source':str(SOURCE),'source_sha256':SOURCE_SHA,'source_saved':False,'blender':bpy.app.version_string,
        'plan':plan,'tool_hashes':tools,'input_hashes':protected,'unchanged_invariant_groups':list(before),
        'changes_are_right_key_only':True,'side_exclusion_m':0,'results':results,
        'scope':'Baseline versus one bounded Right-key repair; complete screen, no art/pocket/export acceptance.'}
    report_path=args.output_dir/'screen-report.json';report_path.write_text(json.dumps(report,indent=2)+'\n')
    if args.save and report['status']=='passed':
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()));reset(bpy.data.objects['Armature_Catalog'])
        obj=bpy.data.objects[OBJECT];apply_plan(obj,plan,True)
        assert normalized(signature())==expected_signature(before,plan)
        assert_snapshot(tools);assert_snapshot(protected)
        bpy.context.preferences.filepaths.save_version=0
        candidate=args.output_dir/'B04.blend';bpy.ops.wm.save_as_mainfile(filepath=str(candidate.resolve()))
        assert_snapshot(tools);assert_snapshot(protected)
        report.update({'source_saved':True,'candidate':str(candidate),'candidate_sha256':digest(candidate)})
        report_path.write_text(json.dumps(report,indent=2)+'\n')
    print('B04_CENTRE_REPAIR_RESULT',json.dumps({k:v for k,v in report.items() if k not in ('results','plan','tool_hashes','input_hashes')}),flush=True)


if __name__=='__main__':main()
