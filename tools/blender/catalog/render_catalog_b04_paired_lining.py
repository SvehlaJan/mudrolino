"""Render a rejected in-memory construction for review without saving a model."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0,str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE,SOURCE_SHA
from b04_tool_inventory import local_dependencies,snapshot_files,assert_snapshot
from repair_catalog_b04_corrective_sides import signature,normalized,digest
from build_catalog_t01 import reset,world_mesh,setup_render


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.output_dir.exists() and digest(SOURCE)==SOURCE_SHA
    report_path=SOURCE.parent.parent.parent/'centre-key-repair-v1/paired-lining-probe-v1/paired-lining-screen-report.json'
    probe=json.loads(report_path.read_text());assert probe['status']=='failed' and not probe['source_saved']
    assert_snapshot(probe['input_hashes']);assert_snapshot(probe['tool_hashes'])
    inputs=snapshot_files([SOURCE,report_path])
    tools=local_dependencies(Path(__file__).parent,[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()));arm=bpy.data.objects['Armature_Catalog'];reset(arm)
    obj=bpy.data.objects['B04_ivory_trousers'];before=normalized(signature());expected=normalized(before)
    for row in probe['plan']['changes']:
        i=row['index'];delta=Vector(row['delta']);assert list(obj.data.vertices[i].co)==row['before']
        obj.data.vertices[i].co=row['after'];expected['meshes'][obj.name]['vertices'][i]=list(Vector(row['after']))
        for key in obj.data.shape_keys.key_blocks:
            value=Vector(before['meshes'][obj.name]['keys'][key.name][i])+delta
            key.data[i].co=value;expected['meshes'][obj.name]['keys'][key.name][i]=list(value)
    obj.data.update();assert normalized(signature())==expected
    for item in bpy.data.objects:
        if item.type=='MESH':item.hide_render=item!=obj
    camera=setup_render();args.output_dir.mkdir(parents=True)
    reviews=[]
    for motion,frame in [('rest',0),('run',7.25)]:
        reset(arm)
        if motion!='rest':
            action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
        bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
        points,_=world_mesh(obj)
        target=Vector([(min(p[a] for p in points)+max(p[a] for p in points))/2 for a in range(3)])
        span=max(max(p[a] for p in points)-min(p[a] for p in points) for a in range(3))
        camera.data.ortho_scale=span*1.4
        for view,offset in [('front',Vector((0,-3,.15))),('back',Vector((0,3,.15)))]:
            camera.location=target+offset;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
            path=args.output_dir/(motion+'-'+view+'-review320.png');bpy.context.scene.render.filepath=str(path.resolve());bpy.ops.render.render(write_still=True)
            reviews.append(str(path))
    reset(arm);camera.data.ortho_scale=.20;target=Vector((0,.01,.75));camera.location=target+Vector((0,-1,-3))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    path=args.output_dir/'rest-inseam-underside-review320.png';bpy.context.scene.render.filepath=str(path.resolve());bpy.ops.render.render(write_still=True);reviews.append(str(path))
    assert_snapshot(inputs);assert_snapshot(tools)
    report={'status':'diagnostic review of rejected non-saving construction','source':str(SOURCE),'source_sha256':SOURCE_SHA,
        'input_hashes':inputs,'tool_hashes':tools,'reviews':reviews,'width':320,'source_unchanged':True,'source_saved':False,
        'scope':'77-vertex screened plan reconstructed in memory with exact expected-state proof. Original materials. Garment-only views; no assembled outfit/export/animation/art acceptance. Rest clears whole shell; run remains failed.'}
    (args.output_dir/'paired-lining-review-report.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
