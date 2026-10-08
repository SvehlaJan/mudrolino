"""Audit all nonincident garment face pairs, not only detail-to-cloth contact."""
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
from repair_catalog_b04_corrective_sides import digest
from build_catalog_t01 import reset,world_mesh,setup_render
from catalog_gltf_gait_pose import RuntimeGaitPose
from runtime_rest_capture import validate_runtime_rest
from f02_ankle_measurement import schedule


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not (args.output_dir/'full-shell-self-audit.json').exists()
    args.output_dir.mkdir(parents=True,exist_ok=True)
    assert digest(SOURCE)==SOURCE_SHA
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    gaits={m:Path('assets/avatar/catalog-a/foundation')/('catalog-body-'+m+'.glb') for m in ('walk','run')}
    inputs=snapshot_files([SOURCE,SOURCE.with_suffix('.glb'),*gaits.values()])
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj,arm=bpy.data.objects['B04_ivory_trousers'],bpy.data.objects['Armature_Catalog']
    reset(arm)
    faces=[tuple(f.vertices) for f in obj.data.polygons];sets=[set(f) for f in faces]
    rest=[list(v.co) for v in obj.data.vertices]
    materials=[obj.data.materials[f.material_index].name for f in obj.data.polygons]
    adapter=RuntimeGaitPose(SOURCE.with_suffix('.glb'),gaits,arm)
    rest_error=validate_runtime_rest({n:[list(r) for r in m] for n,m in adapter.native_rest.items()},
        {b.name:[list(r) for r in arm.matrix_world@b.matrix_local] for b in arm.data.bones})
    rows=[];all_pairs=set()
    for domain in ('native','runtime-equivalent'):
        for pose in schedule():
            motion,frame=pose['motion'],pose['frame']
            if domain=='runtime-equivalent':adapter.apply(motion,frame,24)
            else:
                reset(arm)
                if motion!='rest':
                    action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
            points,_=world_mesh(obj);tree=BVHTree.FromPolygons(points,faces)
            pairs=sorted((a,b) for a,b in tree.overlap(tree) if a<b and not sets[a]&sets[b])
            all_pairs.update(pairs)
            rows.append({'domain':domain,**pose,'nonincident_pairs':len(pairs),'face_pairs':pairs})
        print('B04_FULL_SHELL_SELF_DOMAIN',domain,len(rows),flush=True)
    assert [(r['domain'],r['motion'],r['frame']) for r in rows]==[(d,p['motion'],p['frame']) for d in ('native','runtime-equivalent') for p in schedule()]
    contact_ids=sorted({i for pair in all_pairs for i in pair});vertices=sorted({v for i in contact_ids for v in faces[i]})
    # Diagnostic-only cutaway of exact contacting rest faces, preserving their
    # coordinates/materials. No scene or model is saved.
    for item in list(bpy.data.objects):
        if item.type=='MESH':item.hide_render=True
    mesh=bpy.data.meshes.new('Contact-face cutaway');mesh.from_pydata(rest,[],[faces[i] for i in contact_ids]);mesh.update()
    cutaway=bpy.data.objects.new('Exact source contact faces',mesh);bpy.context.collection.objects.link(cutaway)
    for m in obj.data.materials:mesh.materials.append(m)
    for face,i in zip(mesh.polygons,contact_ids):face.material_index=obj.data.polygons[i].material_index;face.use_smooth=False
    camera=setup_render()
    target=Vector([(min(rest[i][a] for i in vertices)+max(rest[i][a] for i in vertices))/2 for a in range(3)])
    span=max(max(rest[i][a] for i in vertices)-min(rest[i][a] for i in vertices) for a in range(3))
    camera.data.ortho_scale=span*1.4
    for view,offset in [('rear',Vector((0,3,0))),('underside',Vector((0,-1,-3)))]:
        camera.location=target+offset;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=str((args.output_dir/(view+'-contact-cutaway-review320.png')).resolve());bpy.ops.render.render(write_still=True)
    assert_snapshot(tools);assert_snapshot(inputs)
    report={'status':'failed' if all_pairs else 'passed','source':str(SOURCE),'source_sha256':SOURCE_SHA,'source_unchanged':True,
        'tool_hashes':tools,'input_hashes':inputs,'runtime_rest_matrix_max_error':rest_error,'checks':rows,
        'samples_per_domain':164,'max_nonincident_pairs':max(r['nonincident_pairs'] for r in rows),
        'rest_nonincident_pairs':rows[0]['nonincident_pairs'],'unique_face_pairs':[list(p) for p in sorted(all_pairs)],
        'contact_faces':[{'face':i,'vertices':list(faces[i]),'material':materials[i],'rest_points':[rest[v] for v in faces[i]]} for i in contact_ids],
        'scope':'Full saved garment self-intersection inventory including cloth, cuffs and all details. Shared-index incident faces excluded; no other accepted-contact roles or tolerance exemption. Diagnostic cutaways show exact contacting rest faces, not full outfit art.'}
    (args.output_dir/'full-shell-self-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print('B04_FULL_SHELL_SELF_RESULT',json.dumps({k:report[k] for k in ('status','max_nonincident_pairs','rest_nonincident_pairs')}),flush=True)


if __name__=='__main__':main()
