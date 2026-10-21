"""Author a short stationary, bone-only celebration on an isolated bear source."""
import argparse
import gzip
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, export_model, render_reviews, world_rotation, write_json
from build_catalog_head_style_study import motion_signature, rig_signature
from build_catalog_t01 import reset
from build_catalog_t01 import world_mesh
from prepare_catalog_body import action_curves


def activate(arm, action):
    arm.animation_data_create()
    arm.animation_data.action = action
    if action.slots:
        arm.animation_data.action_slot = action.slots[0]


def pose(arm, phase, relaxed, ground_z, motion):
    envelope = math.sin(math.pi * phase) ** 2
    sway = math.sin(2 * math.pi * phase) * math.sin(math.pi * phase)
    for bone in arm.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    for side, sign in [('Left', 1), ('Right', -1)]:
        lift = motion.get('armLiftDegrees', 12) * envelope * (.85 + sign * .15 * math.sin(2 * math.pi * phase))
        world_rotation(arm.pose.bones[f'{side}Arm'], (0, 1, 0), sign * (relaxed - lift))
        world_rotation(arm.pose.bones[f'{side}ForeArm'], (1, 0, 0), -motion.get('forearmDegrees', 7) * envelope)
        world_rotation(arm.pose.bones[f'{side}UpLeg'], (1, 0, 0), sign * motion.get('legDegrees', 1.2) * sway)
        world_rotation(arm.pose.bones[f'{side}Leg'], (1, 0, 0), -sign * motion.get('kneeDegrees', .6) * sway)
    world_rotation(arm.pose.bones['Spine02'], (0, 1, 0), motion.get('torsoDegrees', 2) * sway)
    world_rotation(arm.pose.bones['Head'], (0, 1, 0), motion.get('headDegrees', 1.5) * sway)
    hips = arm.pose.bones['Hips']
    inverse = hips.bone.matrix_local.to_3x3().inverted()
    hips.location = inverse @ Vector((0, 0, motion.get('bobMetres', .006) * math.sin(2 * math.pi * phase) ** 2))
    bpy.context.view_layer.update()
    shoe_points, _ = world_mesh(bpy.data.objects['F01_strap_sneakers_outfit'])
    lowest = min(point.z for point in shoe_points)
    correction = max(0, ground_z - lowest)
    hips.location += inverse @ Vector((0, 0, correction))
    bpy.context.view_layer.update()
    return correction


def main():
    started = time.monotonic()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--duration', type=float, default=1.4)
    parser.add_argument('--fps', type=int, default=30)
    parser.add_argument('--design', type=Path, default=Path('assets/avatar/catalog-a/companions/bear-v1/bear-design.json'))
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    destination = args.output_dir / 'outfit.blend'
    if destination.resolve() == args.blend.resolve():
        raise RuntimeError('Preserve the construction source; choose a separate output directory')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    design = json.loads(args.design.read_text())
    source_hash = digest(args.blend)
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    rig_before, gait_before = rig_signature(arm), motion_signature()
    assert 'celebrate' not in bpy.data.actions, 'Use a construction source without a previous dance'
    action = bpy.data.actions.new('celebrate')
    action.use_fake_user = True
    scene = bpy.context.scene
    scene.render.fps, scene.render.fps_base = args.fps, 1
    scene.frame_start, scene.frame_end = 0, round(args.duration * args.fps)
    corrections = []
    for frame in range(scene.frame_end + 1):
        reset(arm)
        scene.frame_set(frame)
        phase = frame / scene.frame_end if frame != scene.frame_end else 0
        correction = pose(arm, phase, design['relaxedArmDegrees'], design['groundZ'], design.get('celebration', {}))
        corrections.append(correction)
        # Evaluate authored transforms with no active action. Otherwise updating
        # the depsgraph samples the preceding keys and overwrites the new pose.
        activate(arm, action)
        for bone in arm.pose.bones:
            bone.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=bone.name)
        arm.pose.bones['Hips'].keyframe_insert(data_path='location', frame=frame, group='Hips')
    for curve in action_curves(action):
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    activate(arm, action)
    scene.frame_set(0)
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    assert rig_signature(arm) == rig_before
    assert motion_signature() == gait_before
    bpy.ops.wm.save_as_mainfile(filepath=str(destination.resolve()))
    glb = args.output_dir / 'outfit.glb'
    export_model(glb, arm, meshes, animation=True)
    report = {'source': str(args.blend), 'source_sha256': source_hash,
              'blend_sha256': digest(destination), 'glb_sha256': digest(glb),
              'builder_sha256': digest(Path(__file__)),
              'helper_sha256': digest(Path(__file__).with_name('bear_companion_common.py')),
              'design_sha256': digest(args.design), 'blender_version': bpy.app.version_string,
              'rig_sha256': rig_before, 'gaits_sha256': gait_before,
              'animation': 'celebrate', 'fps': args.fps, 'frames': [0, scene.frame_end],
              'duration_seconds': args.duration, 'keyframe_samples': scene.frame_end + 1,
              'maximum_floor_correction_m': max(corrections),
              'bytes': glb.stat().st_size, 'gzip_bytes': len(gzip.compress(glb.read_bytes(), mtime=0)),
              'status': 'authored motion; clearance/export/runtime/art acceptance pending'}
    if args.render:
        report['reviews'] = render_reviews(args.output_dir)
        scene.frame_set(round(scene.frame_end * .42))
        report['mid_dance_review'] = render_reviews(args.output_dir, views=[('dance', (-2.2, -5, .15))], still=False)
    report['elapsed_seconds'] = time.monotonic() - started
    write_json(args.output_dir / 'celebration-report.json', report)
    assert digest(args.blend) == source_hash
    print(json.dumps({'report': str(args.output_dir / 'celebration-report.json'),
                      'seconds': report['elapsed_seconds'], 'gzip_bytes': report['gzip_bytes']}))


if __name__ == '__main__':
    main()
