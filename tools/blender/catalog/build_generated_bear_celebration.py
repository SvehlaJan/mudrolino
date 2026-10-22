"""Author a stationary celebration on the approved generated bear's fitted rig."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, export_model, material, world_rotation, write_json
from build_catalog_t01 import setup_render, world_mesh
from prepare_catalog_body import action_curves


def pose(arm, mesh, phase, design):
    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    envelope = math.sin(math.pi * phase) ** 2
    sway = math.sin(2 * math.pi * phase) * math.sin(math.pi * phase)
    for side, sign in [('Left', 1), ('Right', -1)]:
        world_rotation(arm.pose.bones[f'{side}Arm'], (0,1,0),
                       sign * (design['relaxedArmDegrees'] - design['armLiftDegrees'] * envelope
                               + sign * design.get('armAccentDegrees',0)
                               * math.sin(4*math.pi*phase) * envelope))
        world_rotation(arm.pose.bones[f'{side}ForeArm'], (1,0,0),
                       -design['relaxedForearmDegrees'] - design['forearmCurlDegrees'] * envelope)
        forearm = arm.pose.bones[f'{side}ForeArm']
        cheer_axis = forearm.bone.matrix_local.to_3x3().inverted() @ Vector((0,1,0))
        forearm.rotation_quaternion = (Quaternion(cheer_axis.normalized(),
            math.radians(-sign*design.get('forearmCheerDegrees',0)*envelope))
            @ forearm.rotation_quaternion)
        world_rotation(arm.pose.bones[f'{side}Hand'], (0,0,1), sign*design.get('handDegrees',8)*envelope)
        world_rotation(arm.pose.bones[f'{side}UpLeg'], (1,0,0),
                       sign*design.get('thighDegrees',2.5)*sway)
        world_rotation(arm.pose.bones[f'{side}Leg'], (1,0,0),
                       -design.get('kneeDegrees',2)*envelope)
    world_rotation(arm.pose.bones['Spine02'], (0,1,0), design.get('torsoSwayDegrees',3)*sway)
    world_rotation(arm.pose.bones['Head'], (0,1,0), design['headTiltDegrees'] + design.get('headSwayDegrees',2)*sway)
    bpy.context.view_layer.update()
    lowest = min(point.z for point in world_mesh(mesh)[0])
    # Rigging service uses a 0.01 object scale. Convert metre correction through
    # both the armature object and the Hips rest basis instead of assuming units.
    hips = arm.pose.bones['Hips']
    hop = design.get('hopMetres',0) * math.sin(2*math.pi*phase)**2
    hips.location = (hips.bone.matrix_local.to_3x3().inverted()
                     @ arm.matrix_world.to_3x3().inverted() @ Vector((0,0,-lowest+hop)))
    bpy.context.view_layer.update()
    return -lowest+hop


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glb', required=True, type=Path)
    parser.add_argument('--design', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        raise ValueError('Preserve prior motion; choose a new revision directory')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    design = json.loads(args.design.read_text())
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    armatures = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']
    if len(armatures) != 1:
        raise ValueError('Expected one fitted armature')
    arm = armatures[0]
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH'
              and any(mod.type == 'ARMATURE' and mod.object == arm for mod in obj.modifiers)]
    if len(meshes) != 1:
        raise ValueError('Expected the fixed-outfit skinned bear surface')
    mesh = meshes[0]
    mesh.name = 'Bear_fixed_outfit'
    for bone in arm.pose.bones:
        bone.custom_shape = None
    for obj in list(bpy.data.objects):
        if obj not in [arm, mesh] and obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    arm.animation_data_clear()
    arm.animation_data_create()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action, do_unlink=True)
    action = bpy.data.actions.new('celebrate')
    action.use_fake_user = True
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.render.fps_base = 1
    scene.frame_start, scene.frame_end = 0, 42
    floors = []
    for frame in range(43):
        arm.animation_data.action = None
        scene.frame_set(frame)
        phase = frame/42 if frame != 42 else 0
        correction = pose(arm, mesh, phase, design)
        floors.append({'frame':frame, 'hips_correction_m':correction,
                       'floor_m':min(point.z for point in world_mesh(mesh)[0])})
        arm.animation_data.action = action
        if action.slots:
            arm.animation_data.action_slot = action.slots[0]
        for bone in arm.pose.bones:
            bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
        arm.pose.bones['Hips'].keyframe_insert(data_path='location',frame=frame,group='Hips')
    for curve in action_curves(action):
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    arm.animation_data.action = action
    if action.slots:
        arm.animation_data.action_slot = action.slots[0]
    scene.frame_set(0)
    blend = args.output_dir/'celebration.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    glb = args.output_dir/'celebration.glb'
    export_model(glb,arm,[mesh],animation=True)
    # Export precedes review-only studio objects; they never enter runtime bytes.
    camera = setup_render()
    scene.cycles.samples = 24
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.83,.79,.72,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001))
    bpy.context.object.data.materials.append(material('Review floor','#EFE8DB',.9))
    target = Vector((0,0,1.155))
    camera.data.ortho_scale = 2.60
    views = {}
    for label, frame, offset in [('neutral',0,(-2,-5,.35)),('front',0,(0,-5,.28)),
                                  ('side',0,(-5,0,.28)),('back',0,(0,5,.28)),
                                  ('dance-quarter',10,(-2,-5,.35)),
                                  ('dance-middle',21,(-2,-5,.35)),
                                  ('dance-three-quarter',31,(-2,-5,.35))]:
        scene.frame_set(frame)
        camera.location=target+Vector(offset)
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        path=args.output_dir/f'{label}-review.png'
        scene.render.filepath=str(path.resolve())
        bpy.ops.render.render(write_still=True)
        views[label]=str(path)
    write_json(args.output_dir/'celebration-report.json',{
        'stage':'Authored proxy motion; runtime, compression, deformation and art checks pending',
        'input_glb':str(args.glb),'input_sha256':digest(args.glb),
        'builder_sha256':digest(Path(__file__)),'design_sha256':digest(args.design),
        'blend':str(blend),'blend_sha256':digest(blend),'glb':str(glb),'glb_sha256':digest(glb),
        'bone_names':sorted(b.name for b in arm.data.bones),'mesh_names':[mesh.name],
        'animation':'celebrate','duration_seconds':1.4,'fps':30,'keyframes':43,
        'floors':floors,'views':views,'review_width':320,'blender_version':bpy.app.version_string,
        'limitations':['One fused fixed outfit; wardrobe swapping unproven.',
                       'Native keyframes do not establish actual glTF interpolation or skinning.']})
    print(json.dumps({'glb':str(glb),'views':views}))


if __name__=='__main__':
    main()
