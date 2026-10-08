"""Separate moving cloth contacts from the fixed body's folded-pose anatomy."""
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
from inspect_catalog_b04_pockets import SOURCE,SOURCE_SHA
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
from repair_catalog_b04_corrective_sides import signature,normalized,digest
from build_catalog_t01 import reset,world_mesh
from cloth_branch_distances import branch_distances
from catalog_gltf_gait_pose import RuntimeGaitPose
from runtime_rest_capture import validate_runtime_rest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists() and digest(SOURCE)==SOURCE_SHA
    root=SOURCE.parent.parent.parent/'centre-key-repair-v1'
    probe_path=root/'paired-lining-probe-v1/paired-lining-screen-report.json'
    layer_path=root/'full-shell-diagnosis/cloth-layer-classification-report.json'
    probe=json.loads(probe_path.read_text());assert_snapshot(probe['input_hashes']);assert_snapshot(probe['tool_hashes'])
    layers=json.loads(layer_path.read_text())['layers']
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    gaits={m:Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk','run')}
    inputs=snapshot_files([SOURCE,SOURCE.with_suffix('.glb'),probe_path,layer_path,*gaits.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()));arm=bpy.data.objects['Armature_Catalog'];reset(arm)
    obj=bpy.data.objects['B04_ivory_trousers'];body=bpy.data.objects['body_underlayer_male']
    before=normalized(signature());expected=normalized(before)
    for row in probe['plan']['changes']:
        i=row['index'];delta=Vector(row['delta']);assert list(obj.data.vertices[i].co)==row['before']
        obj.data.vertices[i].co=row['after'];expected['meshes'][obj.name]['vertices'][i]=list(Vector(row['after']))
        for key in obj.data.shape_keys.key_blocks:
            value=Vector(before['meshes'][obj.name]['keys'][key.name][i])+delta
            key.data[i].co=value;expected['meshes'][obj.name]['keys'][key.name][i]=list(value)
    obj.data.update();assert normalized(signature())==expected
    rest=[list(v.co) for v in obj.data.vertices];faces=[tuple(p.vertices) for p in obj.data.polygons];face_sets=[set(f) for f in faces]
    materials=[obj.data.materials[p.material_index].name for p in obj.data.polygons]
    face_layer={i:l['component'] for l in layers for i in l['faces']};path_delta={}
    for layer in layers:
        ids=layer['vertices'];lookup={i:j for j,i in enumerate(ids)}
        edges=sorted({tuple(sorted((lookup[a],lookup[b]))) for i in layer['faces'] for a,b in zip(faces[i],faces[i][1:]+faces[i][:1])})
        seeds={s:[lookup[i] for i in ids if rest[i][2]<.32 and rest[i][0]*sign>.05] for s,sign in [('Left',1),('Right',-1)]}
        distances=branch_distances([rest[i] for i in ids],edges,seeds)
        path_delta.update({i:distances['Left'][lookup[i]]-distances['Right'][lookup[i]] for i in ids})
    def classify(i):
        if i not in face_layer:return 'detail/trim'
        delta=sum(path_delta[v] for v in faces[i])/len(faces[i])
        return 'seam' if abs(delta)<.005 else ('Left' if delta<0 else 'Right')
    masks=[(m,m.show_viewport) for m in body.modifiers if m.type=='MASK']
    assert masks, 'Expected original body coverage modifier'
    reset(arm);adapter=RuntimeGaitPose(SOURCE.with_suffix('.glb'),gaits,arm)
    rest_error=validate_runtime_rest({n:[list(r) for r in m] for n,m in adapter.native_rest.items()},
        {b.name:[list(r) for r in arm.matrix_world@b.matrix_local] for b in arm.data.bones})
    args.output_dir.mkdir(parents=True);rows=[];contact_faces={}
    poses=[('rest',0),('walk',.8),('walk',7.25),('run',.8),('run',7.25),('run',16.75)]
    for domain in ('native','runtime-equivalent'):
        for motion,frame in poses:
            if domain=='runtime-equivalent':adapter.apply(motion,frame,24)
            else:
                reset(arm)
                if motion!='rest':
                    action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
            points,eval_faces=world_mesh(obj);assert eval_faces==faces
            evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
            triangles=[tuple(t.vertices) for t in mesh.loop_triangles];owners=[t.polygon_index for t in mesh.loop_triangles];evaluated.to_mesh_clear()
            tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
            pairs=sorted({tuple(sorted((owners[a],owners[b]))) for a,b in tree.overlap(tree)
                if owners[a]!=owners[b] and not face_sets[owners[a]]&face_sets[owners[b]]})
            previous=next(r for r in probe['results']['paired-lining']['checks'] if r['domain']==domain and r['motion']==motion and r['frame']==frame)
            assert pairs==[tuple(p) for p in previous['face_pairs']], 'Screened cloth contact inventory differs'
            try:
                for mask,_ in masks:mask.show_viewport=False
                bpy.context.view_layer.update()
                full_points,full_faces=world_mesh(body)
                assert len(full_points)==len(body.data.vertices), 'Full body index inventory changed'
                full_sets=[set(f) for f in full_faces];full_tree=BVHTree.FromPolygons(full_points,full_faces)
                full_self=sorted((a,b) for a,b in full_tree.overlap(full_tree) if a<b and not full_sets[a]&full_sets[b])
                # Report covered-body contacts as anatomy context, never as a
                # replacement for the actual visible-body fitting criterion.
                body_count=len(tree.overlap(full_tree))
                ids=sorted({v for pair in pairs for i in pair for v in faces[i]})
                samples=[]
                for v in ids:
                    point,normal,nearest,distance=full_tree.find_nearest(points[v])
                    samples.append({'vertex':v,'rest_xyz':rest[v],'posed_xyz':list(points[v]),
                        'full_body_distance_m':distance,'signed_body_distance_m':(points[v]-point).dot(normal),
                        'body_face':nearest,'weights':{obj.vertex_groups[w.group].name:w.weight for w in obj.data.vertices[v].groups}})
            finally:
                for mask,enabled in masks:mask.show_viewport=enabled
                bpy.context.view_layer.update()
            counts=Counter('/'.join(sorted((classify(a),classify(b)))) for a,b in pairs)
            separated=[]
            for a,b in pairs:
                za=sum(rest[v][2] for v in faces[a])/len(faces[a]);zb=sum(rest[v][2] for v in faces[b])/len(faces[b])
                if abs(za-zb)>.15:separated.append([a,b])
                for i in (a,b):
                    contact_faces[i]={'face':i,'vertices':list(faces[i]),'material':materials[i],
                        'layer':face_layer.get(i),'branch':classify(i),'rest_points':[rest[v] for v in faces[i]]}
            row={'domain':domain,'motion':motion,'frame':frame,'cloth_self_face_pairs':len(pairs),'face_pairs':pairs,
                'branch_pair_counts':dict(counts),'distant_rest_height_pairs':separated,'full_body_polygon_self_pairs':len(full_self),
                'full_body_self_faces':[{'faces':[a,b],'rest_bounds_m':[[[min(body.data.vertices[i].co[c] for i in full_faces[f]),max(body.data.vertices[i].co[c] for i in full_faces[f])] for c in range(3)] for f in (a,b)]} for a,b in full_self],
                'cloth_full_body_triangle_polygon_pairs':body_count,'contact_vertex_body_samples':samples,
                'corrective_values':{k.name:k.value for k in obj.data.shape_keys.key_blocks if k.name!='Basis'}}
            rows.append(row)
            print('B04_FOLD_DIAGNOSIS',json.dumps({k:row[k] for k in ('domain','motion','frame','cloth_self_face_pairs','branch_pair_counts','full_body_polygon_self_pairs','cloth_full_body_triangle_polygon_pairs','corrective_values')}),flush=True)
    assert_snapshot(inputs);assert_snapshot(tools)
    report={'status':'read-only moving-fold diagnosis','source':str(SOURCE),'source_sha256':SOURCE_SHA,'source_unchanged':True,
        'input_hashes':inputs,'tool_hashes':tools,'runtime_rest_matrix_max_error':rest_error,'checks':rows,
        'contact_faces':list(contact_faces.values()),'body_masks_restored':True,
        'scope':'Six diagnostic poses per domain on the exact rejected paired-lining plan. Actual cloth triangles reproduce the screened contact sets. Full original body with coverage masks temporarily disabled is anatomical context; its polygon self inventory and covered-body contacts are not fitting acceptance criteria. No body, rig, gait, mask, skin or source save.'}
    (args.output_dir/'paired-fold-diagnosis-report.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
