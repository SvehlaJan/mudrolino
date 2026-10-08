"""Read-only anatomical cloth/contact diagnosis on the unchanged cuff source."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE, SOURCE_SHA
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import digest
from build_catalog_t01 import reset, world_mesh, setup_render
from cloth_branch_distances import branch_distances
from catalog_gltf_gait_pose import RuntimeGaitPose
from runtime_rest_capture import validate_runtime_rest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists(), 'Preserve prior diagnosis'
    assert digest(SOURCE) == SOURCE_SHA
    prior = SOURCE.parent.parent.parent/'centre-key-repair-v1/full-shell-diagnosis'
    audit_path = prior/'full-shell-self-audit.json'
    layers_path = prior/'cloth-layer-classification-report.json'
    audit = json.loads(audit_path.read_text())
    layers = json.loads(layers_path.read_text())['layers']
    assert audit['source_sha256'] == SOURCE_SHA
    assert_snapshot(audit['tool_hashes']); assert_snapshot(audit['input_hashes'])
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    gaits = {m: Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk','run')}
    inputs = snapshot_files([SOURCE, SOURCE.with_suffix('.glb'), audit_path, layers_path, *gaits.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj, arm = bpy.data.objects['B04_ivory_trousers'], bpy.data.objects['Armature_Catalog']
    reset(arm)
    rest = [list(v.co) for v in obj.data.vertices]
    faces = [tuple(p.vertices) for p in obj.data.polygons]
    face_sets = [set(f) for f in faces]
    branch = {}; distances_by_vertex = {}; inventory = []
    face_layer = {i: l['component'] for l in layers for i in l['faces']}
    for layer in layers:
        ids = layer['vertices']; lookup = {i: j for j, i in enumerate(ids)}
        edges = sorted({tuple(sorted((lookup[a],lookup[b]))) for i in layer['faces']
            for a,b in zip(faces[i], faces[i][1:]+faces[i][:1])})
        seeds = {side: [lookup[i] for i in ids if rest[i][2] < .32 and rest[i][0]*sign > .05]
            for side,sign in [('Left',1),('Right',-1)]}
        distances = branch_distances([rest[i] for i in ids], edges, seeds)
        for i in ids:
            values = {s: distances[s][lookup[i]] for s in seeds}
            delta = values['Left']-values['Right']
            branch[i] = 'seam' if abs(delta)<1e-6 else ('Left' if delta<0 else 'Right')
            distances_by_vertex[i] = values
        inventory.append({'component':layer['component'], 'seed_source_vertices':{s:[ids[j] for j in v] for s,v in seeds.items()},
            'branch_counts':{s:sum(branch[i]==s for i in ids) for s in ('Left','Right','seam')}})

    def face_branch(i):
        values = [distances_by_vertex[v]['Left']-distances_by_vertex[v]['Right'] for v in faces[i]]
        mean = sum(values)/len(values)
        return 'seam' if abs(mean)<1e-6 else ('Left' if mean<0 else 'Right')

    crossed = [{'vertex':i,'branch':side,'rest_xyz':rest[i],'path_distances_m':distances_by_vertex[i],
        'weights':{obj.vertex_groups[w.group].name:w.weight for w in obj.data.vertices[i].groups}}
        for i,side in branch.items() if side!='seam' and rest[i][0]*(1 if side=='Left' else -1)<-1e-6]
    adapter = RuntimeGaitPose(SOURCE.with_suffix('.glb'), gaits, arm)
    rest_error = validate_runtime_rest({n:[list(r) for r in m] for n,m in adapter.native_rest.items()},
        {b.name:[list(r) for r in arm.matrix_world@b.matrix_local] for b in arm.data.bones})
    args.output_dir.mkdir(parents=True)
    rows = []; snapshots = {}; vertex_inventory = {}
    for domain in ('native','runtime-equivalent'):
        for motion,frame in [('rest',0),('run',7.25)]:
            if domain=='runtime-equivalent': adapter.apply(motion,frame,24)
            else:
                reset(arm)
                if motion!='rest':
                    action=bpy.data.actions[motion]; arm.animation_data.action=action; arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
            points,evaluated_faces=world_mesh(obj)
            assert evaluated_faces == faces, 'Evaluated face/index inventory differs'
            tree=BVHTree.FromPolygons(points,faces)
            pairs=sorted((a,b) for a,b in tree.overlap(tree) if a<b and not face_sets[a]&face_sets[b])
            expected=next(r for r in audit['checks'] if r['domain']==domain and r['motion']==motion and r['frame']==frame)
            assert pairs==[tuple(p) for p in expected['face_pairs']], 'Prior contact inventory differs'
            # Independently use the evaluated mesh's actual loop tessellation,
            # rather than silently assuming the BVH polygon triangulation.
            evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles()
            triangles=[tuple(t.vertices) for t in mesh.loop_triangles]
            owners=[t.polygon_index for t in mesh.loop_triangles]; evaluated.to_mesh_clear()
            triangle_tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
            tessellated=sorted({tuple(sorted((owners[a],owners[b]))) for a,b in triangle_tree.overlap(triangle_tree)
                if owners[a]!=owners[b] and not face_sets[owners[a]]&face_sets[owners[b]]})
            cloth_pairs=[(a,b) for a,b in pairs if a in face_layer and b in face_layer]
            counts={}; records=[]
            for a,b in cloth_pairs:
                sides=sorted((face_branch(a),face_branch(b))); key='/'.join(sides)
                counts[key]=counts.get(key,0)+1
                records.append({'faces':[a,b],'branches':[face_branch(a),face_branch(b)],
                    'layers':[face_layer[a],face_layer[b]],'rest_centroids_m':[[sum(rest[v][axis] for v in faces[i])/len(faces[i]) for axis in range(3)] for i in (a,b)],
                    'posed_points_m':[[list(points[v]) for v in faces[i]] for i in (a,b)]})
                for i in (a,b):
                    for v in faces[i]:
                        if v in vertex_inventory:continue
                        vertex=obj.data.vertices[v]
                        vertex_inventory[v]={'vertex':v,'rest_xyz':rest[v],'branch':branch[v],'path_distances_m':distances_by_vertex[v],
                            'weights':{obj.vertex_groups[w.group].name:w.weight for w in vertex.groups},
                            'key_deltas_m':{k.name:list(k.data[v].co-vertex.co) for k in obj.data.shape_keys.key_blocks if k.name!='Basis'}}
            rows.append({'domain':domain,'motion':motion,'frame':frame,'nonincident_pairs':len(pairs),
                'actual_loop_triangle_pairs':len(tessellated),'polygon_only_pairs':[list(p) for p in set(pairs)-set(tessellated)],
                'tessellation_only_pairs':[list(p) for p in set(tessellated)-set(pairs)],
                'cloth_branch_pair_counts':counts,'cloth_pairs':records})
            if domain=='native':snapshots[motion]=(points,cloth_pairs)
            print('B04_BRANCH_POSE',json.dumps({k:rows[-1][k] for k in ('domain','motion','nonincident_pairs','actual_loop_triangle_pairs','cloth_branch_pair_counts')}),flush=True)
    for item in list(bpy.data.objects):
        if item.type=='MESH':item.hide_render=True
    camera=setup_render()
    for motion,(points,pairs) in snapshots.items():
        outward=[i for pair in pairs for i in pair if face_layer[i]==0]
        selected=sorted(set(outward)); selected_vertices={v for i in selected for v in faces[i]}
        mesh=bpy.data.meshes.new('Exact contacting outward cloth '+motion)
        mesh.from_pydata([list(p) for p in points],[],[faces[i] for i in selected]); mesh.update()
        cut=bpy.data.objects.new(mesh.name,mesh); bpy.context.collection.objects.link(cut)
        for name,color in [('Left branch',(.12,.42,.92,1)),('Right branch',(.95,.16,.12,1)),('Seam',(.5,.5,.5,1))]:
            mat=bpy.data.materials.new(name); mat.diffuse_color=color; mesh.materials.append(mat)
        for p,i in zip(mesh.polygons,selected):p.material_index={'Left':0,'Right':1,'seam':2}[face_branch(i)]
        target=Vector([(min(points[i][a] for i in selected_vertices)+max(points[i][a] for i in selected_vertices))/2 for a in range(3)])
        camera.data.ortho_scale=max(max(points[i][a] for i in selected_vertices)-min(points[i][a] for i in selected_vertices) for a in range(3))*1.4
        for name,offset in [('front-oblique',Vector((2,-3,.2))),('underside',Vector((0,-1,-3)))]:
            camera.location=target+offset;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
            bpy.context.scene.render.filepath=str((args.output_dir/(motion+'-'+name+'-review320.png')).resolve()); bpy.ops.render.render(write_still=True)
        cut.hide_render=True
    assert_snapshot(inputs); assert_snapshot(tools)
    report={'status':'read-only diagnosis; source clearance still failed','source':str(SOURCE),'source_sha256':SOURCE_SHA,
        'source_unchanged':True,'input_hashes':inputs,'tool_hashes':tools,'runtime_rest_matrix_max_error':rest_error,
        'layer_branch_inventory':inventory,'vertices_across_rest_midline':crossed,'contact_vertices':list(vertex_inventory.values()),'checks':rows,
        'scope':'Two diagnostic poses in both domains, not dense fitting proof. Anatomical branch comes from physical edge paths to explicit lower-leg seeds, including cloth vertices across X=0. Exact source contact sets reproduced and actual evaluated loop tessellation compared. No mesh/key/skin/source save or accepted-contact exemption.'}
    (args.output_dir/'cloth-branch-diagnosis-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('B04_BRANCH_RESULT',json.dumps({'crossed_vertices':len(crossed),'checks':len(rows)}),flush=True)


if __name__=='__main__':main()
