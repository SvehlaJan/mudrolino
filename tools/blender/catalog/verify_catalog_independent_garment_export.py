"""Compare one independent garment export against its evaluated native master."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot


def distance(reference, points):
    tree = KDTree(len(reference))
    for i,point in enumerate(reference): tree.insert(point,i)
    tree.balance()
    return max(tree.find(point)[2] for point in points)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend',type=Path,required=True)
    parser.add_argument('--glb',type=Path,required=True)
    parser.add_argument('--garment',required=True)
    parser.add_argument('--report',type=Path,required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.report.exists(), 'Preserve earlier export evidence'
    tools = local_dependencies(Path('tools/blender/catalog'),[Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/name for name in ('blender_cli.py','blender_queue.py')))
    protected = snapshot_files([args.blend,args.glb])
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    arm = bpy.data.objects['Armature_Catalog']; source = bpy.data.objects[args.garment]
    actions = {name:bpy.data.actions[name] for name in ('walk','run')}; reset(arm)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    rigs = [obj for obj in imported if obj.type == 'ARMATURE']; assert len(rigs) == 1
    rig = rigs[0]; rig.animation_data_create()
    candidates = [obj for obj in imported if obj.type == 'MESH' and obj.name.startswith(source.name)]
    assert len(candidates) == 1, ('Expected one independent garment', [obj.name for obj in imported])
    exported = candidates[0]
    assert source.data.shape_keys and exported.data.shape_keys
    for key in exported.data.shape_keys.key_blocks:
        if key.name.startswith('knee_clearance_'): key.driver_remove('value')
    results = []
    # Same 16-pose inventory as the catalog source/export and Three gates.
    for motion,frames in [('rest',[0]),('walk',[.8,1,6.25,13,19.5,25.6]),('run',[.8,1,5,7.25,8,9.5,12.75,15.25,16])]:
        reset(arm); reset(rig)
        if motion != 'rest':
            for target in (arm,rig):
                target.animation_data.action = actions[motion]
                target.animation_data.action_slot = actions[motion].slots[0]
        for frame in frames:
            bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
            values = {key.name:key.value for key in source.data.shape_keys.key_blocks if key.name.startswith('knee_clearance_')}
            for name,value in values.items(): exported.data.shape_keys.key_blocks[name].value = value
            bpy.context.view_layer.update()
            reference,reference_faces = world_mesh(source); points,point_faces = world_mesh(exported)
            reference = [reference[i] for i in sorted({i for face in reference_faces for i in face})]
            points = [points[i] for i in sorted({i for face in point_faces for i in face})]
            assert reference and points
            maximum = max(distance(reference,points),distance(points,reference))
            results.append({'motion':motion,'frame':frame,'max_nearest_vertex_error_m':{source.name:maximum},'corrective_values':{source.name:values}})
    maximum = max(max(row['max_nearest_vertex_error_m'].values()) for row in results)
    assert_snapshot(tools); assert_snapshot(protected)
    result = {'blend':str(args.blend),'blend_sha256':protected[str(args.blend)],'glb':str(args.glb),'glb_sha256':protected[str(args.glb)],
        'frames_per_second':bpy.context.scene.render.fps/bpy.context.scene.render.fps_base,
        'status':'passed' if maximum < .00003 else 'failed','checks':results,'max_error_m':maximum,'threshold_m':.00003,
        'comparison':'Bidirectional rendered-vertex distance under identical native poses and morph weights; loose vertices excluded.',
        'scope':'Independent garment source/export fidelity. Actual Three.js corrective weights and animated fit are separate gates.',
        'tool_hashes':tools,'input_hashes':protected}
    args.report.write_text(json.dumps(result,indent=2)+'\n')
    print('INDEPENDENT_EXPORT',json.dumps({k:v for k,v in result.items() if k not in ('checks','tool_hashes','input_hashes')}),flush=True)
    assert result['status'] == 'passed', maximum


if __name__ == '__main__': main()
