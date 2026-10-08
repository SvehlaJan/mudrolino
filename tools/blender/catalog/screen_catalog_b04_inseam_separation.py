"""Screen one inner-panel proposal without saving a native/exported candidate."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0,str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE,SOURCE_SHA
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
from repair_catalog_b04_corrective_sides import signature,normalized,digest
from repair_catalog_b04_left_patch_attachment import SHELL,DETAILS
from build_catalog_t01 import reset,world_mesh
from cloth_branch_distances import branch_distances
from b04_inseam_separation_plan import plan_inseam
from catalog_gltf_gait_pose import RuntimeGaitPose
from runtime_rest_capture import validate_runtime_rest
from f02_ankle_measurement import schedule

OBJECT='B04_ivory_trousers'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists() and digest(SOURCE)==SOURCE_SHA
    root=SOURCE.parent.parent.parent/'centre-key-repair-v1'
    diagnostic=root/'cloth-branch-diagnosis-v1/cloth-branch-diagnosis-report.json'
    previous=json.loads(diagnostic.read_text());assert_snapshot(previous['input_hashes']);assert_snapshot(previous['tool_hashes'])
    layers_path=root/'full-shell-diagnosis/cloth-layer-classification-report.json'
    layers=json.loads(layers_path.read_text())['layers']
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    gaits={m:Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk','run')}
    shoe_paths={id:Path('assets/avatar/catalog-a')/id/(id+'.blend') for id in ('F01','F03')}
    inputs=snapshot_files([SOURCE,SOURCE.with_suffix('.glb'),SOURCE.with_name('body-B04.glb'),diagnostic,layers_path,*gaits.values(),*shoe_paths.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj,arm,body=[bpy.data.objects[n] for n in (OBJECT,'Armature_Catalog','body_underlayer_male')]
    reset(arm);before=normalized(signature());rest=[list(v.co) for v in obj.data.vertices]
    faces=[tuple(p.vertices) for p in obj.data.polygons];face_sets=[set(f) for f in faces]
    inventory=[]
    for layer in layers:
        ids=layer['vertices'];lookup={i:j for j,i in enumerate(ids)}
        edges=sorted({tuple(sorted((lookup[a],lookup[b]))) for i in layer['faces'] for a,b in zip(faces[i],faces[i][1:]+faces[i][:1])})
        seeds={side:[lookup[i] for i in ids if rest[i][2]<.32 and rest[i][0]*sign>.05] for side,sign in [('Left',1),('Right',-1)]}
        distances=branch_distances([rest[i] for i in ids],edges,seeds)
        inventory.extend({'index':i,'point':rest[i],'layer':layer['component'],
            'path_delta':distances['Left'][lookup[i]]-distances['Right'][lookup[i]]} for i in ids)
    plan=plan_inseam(inventory);assert plan['changes']
    expected=normalized(before)
    for row in plan['changes']:
        i=row['index'];delta=Vector(row['delta']);obj.data.vertices[i].co=row['after']
        expected['meshes'][OBJECT]['vertices'][i]=list(Vector(row['after']))
        for key in obj.data.shape_keys.key_blocks:
            value=Vector(before['meshes'][OBJECT]['keys'][key.name][i])+delta
            key.data[i].co=value;expected['meshes'][OBJECT]['keys'][key.name][i]=list(value)
    obj.data.update();assert normalized(signature())==expected,'Unplanned source field changed'
    for row in plan['changes']:
        i=row['index'];obj.data.vertices[i].co=before['meshes'][OBJECT]['vertices'][i]
        for key in obj.data.shape_keys.key_blocks:key.data[i].co=before['meshes'][OBJECT]['keys'][key.name][i]
    obj.data.update();assert normalized(signature())==before
    shoes={}
    for id,path in shoe_paths.items():
        name={'F01':'F01_strap_sneakers','F03':'F03_high_tops'}[id]
        with bpy.data.libraries.load(str(path.resolve()),link=False) as (src,dst):dst.objects=[name]
        shoe=dst.objects[0];bpy.context.collection.objects.link(shoe)
        source_arm=next(m.object for m in shoe.modifiers if m.type=='ARMATURE')
        assert all(max(abs(source_arm.data.bones[n].matrix_local[i][j]-arm.data.bones[n].matrix_local[i][j]) for i in range(4) for j in range(4))<1e-6 for n in before['rig'])
        for mod in shoe.modifiers:
            if mod.type=='ARMATURE':mod.object=arm
        world=shoe.matrix_world.copy();shoe.parent=arm;shoe.matrix_world=world;shoes[id]=shoe
    results={}
    args.output_dir.mkdir(parents=True)
    for variant in ('baseline','separated-inseams'):
        source=before if variant=='baseline' else expected
        for row in plan['changes']:
            i=row['index'];obj.data.vertices[i].co=source['meshes'][OBJECT]['vertices'][i]
            for key in obj.data.shape_keys.key_blocks:key.data[i].co=source['meshes'][OBJECT]['keys'][key.name][i]
        obj.data.update();reset(arm)
        adapter=RuntimeGaitPose(SOURCE.with_suffix('.glb'),gaits,arm)
        rest_error=validate_runtime_rest({n:[list(r) for r in m] for n,m in adapter.native_rest.items()},
            {b.name:[list(r) for r in arm.matrix_world@b.matrix_local] for b in arm.data.bones})
        cloth=[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in SHELL]
        details={name:[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name==name] for name in DETAILS}
        detail_ids={name:{i for f in fs for i in f} for name,fs in details.items()}
        rows=[]
        for domain in ('native','runtime-equivalent'):
            for pose in schedule():
                motion,frame=pose['motion'],pose['frame']
                if domain=='runtime-equivalent':adapter.apply(motion,frame,24)
                else:
                    reset(arm)
                    if motion!='rest':
                        action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                    bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
                points,eval_faces=world_mesh(obj);assert eval_faces==faces
                evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
                triangles=[tuple(t.vertices) for t in mesh.loop_triangles];owners=[t.polygon_index for t in mesh.loop_triangles]
                evaluated.to_mesh_clear()
                tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
                pairs=sorted({tuple(sorted((owners[a],owners[b]))) for a,b in tree.overlap(tree)
                    if owners[a]!=owners[b] and not face_sets[owners[a]]&face_sets[owners[b]]})
                shell=BVHTree.FromPolygons(points,cloth)
                bp,bf=world_mesh(body)
                shoe_counts={}
                for id,shoe in shoes.items():
                    sp,sf=world_mesh(shoe);shoe_counts[id]=len(tree.overlap(BVHTree.FromPolygons(sp,sf)))
                row={'domain':domain,**pose,'full_self_face_pairs':len(pairs),'face_pairs':pairs,
                    'body_triangle_polygon_pairs':len(tree.overlap(BVHTree.FromPolygons(bp,bf))), 'shoe_triangle_polygon_pairs':shoe_counts,
                    'detail_own_shell':{name:len(shell.overlap(BVHTree.FromPolygons(points,fs))) for name,fs in details.items()},
                    'detail_distance_m':max(shell.find_nearest(points[i])[3] for ids in detail_ids.values() for i in ids)}
                rows.append(row)
            print('B04_INSEAM_DOMAIN',variant,domain,len(rows),flush=True)
        assert [(r['domain'],r['motion'],r['frame']) for r in rows]==[(d,p['motion'],p['frame']) for d in ('native','runtime-equivalent') for p in schedule()]
        maxima={'full_self':max(r['full_self_face_pairs'] for r in rows),'body':max(r['body_triangle_polygon_pairs'] for r in rows),
            'shoe':max(v for r in rows for v in r['shoe_triangle_polygon_pairs'].values()),
            'detail':max(v for r in rows for v in r['detail_own_shell'].values()),'detail_distance_m':max(r['detail_distance_m'] for r in rows)}
        passed=all(maxima[k]==0 for k in ('full_self','body','shoe','detail')) and maxima['detail_distance_m']<.012
        results[variant]={'status':'passed' if passed else 'failed','runtime_rest_matrix_max_error':rest_error,'maxima':maxima,'checks':rows,
            'samples_per_domain':164,'self_geometry':'Actual evaluated mesh loop triangles mapped to source polygon identities; shared-index incident faces excluded only.'}
        print('B04_INSEAM_VARIANT',variant,json.dumps(maxima),flush=True)
    assert_snapshot(inputs);assert_snapshot(tools)
    report={'status':results['separated-inseams']['status'],'source_saved':False,'source_unchanged':True,'source':str(SOURCE),
        'source_sha256':SOURCE_SHA,'input_hashes':inputs,'tool_hashes':tools,'plan':plan,'unchanged_invariant_groups':list(before),
        'results':results,'scope':'One non-saving inner-thigh X separation hypothesis and matched baseline, full native/equivalent domains; original body, skin, topology, cuffs, detail geometry, key deltas and gaits retained. No centre-key correction, export or art acceptance.'}
    (args.output_dir/'inseam-separation-screen-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('B04_INSEAM_RESULT',json.dumps({'status':report['status'],'changed_vertices':len(plan['changes']),'source_saved':False}),flush=True)


if __name__=='__main__':main()
