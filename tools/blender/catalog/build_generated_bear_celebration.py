"""Author the stationary multi-clip companion animation suite on the approved generated bear's fitted rig."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_accessories import create_studio_accessories, set_active_studio_accessory
from bear_companion_common import (
    add_world_rotation,
    digest,
    export_model,
    material,
    rotate_local,
    rotate_world,
    world_rotation,
    write_json,
)
from build_catalog_t01 import setup_render, world_mesh
from prepare_catalog_body import action_curves


def plateau_envelope(phase, ramp=0.15):
    if phase <= 0.0 or phase >= 1.0:
        return 0.0
    if phase < ramp:
        u = phase / ramp
        return math.sin(0.5 * math.pi * u) ** 1.6
    if phase > 1.0 - ramp:
        u = (1.0 - phase) / ramp
        return math.sin(0.5 * math.pi * u) ** 1.6
    return 1.0


def reset_pose(arm):
    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()


def apply_floor_and_hop(arm, mesh, hop_m):
    bpy.context.view_layer.update()
    lowest = min(point.z for point in world_mesh(mesh)[0])
    # Rigging service uses a 0.01 object scale. Convert metre correction through
    # both the armature object and the Hips rest basis instead of assuming units.
    hips = arm.pose.bones['Hips']
    hips.location = (
        hips.bone.matrix_local.to_3x3().inverted()
        @ arm.matrix_world.to_3x3().inverted()
        @ Vector((0, 0, -lowest + hop_m))
    )
    bpy.context.view_layer.update()
    return -lowest + hop_m


def pose_celebrate(arm, mesh, phase, design):
    reset_pose(arm)
    s = math.sin(math.pi * phase)
    env = s ** 1.6
    cheer = (s ** 1.45) * (1.0 + 0.40 * (1.0 - s))
    transit = (s ** 1.55) * ((1.0 - s) ** 1.3) * 1.65

    sway = math.sin(2 * math.pi * phase) * env
    nod = math.sin(4 * math.pi * phase) * env
    wave = math.sin(6 * math.pi * phase) * env
    bounce = (math.sin(2 * math.pi * phase) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (0, 1, 0), 1.5 * sway)
    rotate_world(arm, 'Spine02', (1, 0, 0), 2.0 * bounce)
    rotate_world(arm, 'Spine01', (0, 1, 0), 1.0 * sway)
    rotate_world(arm, 'Spine', (0, 1, 0), 1.0 * sway)
    rotate_world(arm, 'Spine', (1, 0, 0), -2.0 * cheer)

    rotate_world(arm, 'Head', (0, 1, 0), 3.5 * sway + 2.0 * wave)
    rotate_world(arm, 'Head', (1, 0, 0), -3.0 * cheer + 4.5 * nod)
    rotate_world(arm, 'Head', (0, 0, 1), 3.5 * sway)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 9.5 * cheer)
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * 6.0 * transit)

        arm_lift = 82.5 * cheer + 1.5 * bounce
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - arm_lift))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (21.0 * cheer + 34.0 * transit))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), 12.0 * cheer - 12.0 * transit)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm + 6.0 * cheer - 14.0 * transit)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (38.0 * cheer + 20.0 * transit + 2.5 * sign * wave))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (12.0 * cheer + 16.0 * transit))

        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * 8.0 * cheer + 13.0 * wave)
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * 10.0 * cheer)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_wave(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.16)
    if 0.08 <= phase <= 0.92:
        wave_u = (phase - 0.08) / 0.84
        w_win = plateau_envelope(wave_u, ramp=0.10)
        raw_w = math.sin(10 * math.pi * wave_u)
        shaped_w = raw_w * (0.82 + 0.18 * (raw_w ** 2))
        wave_osc = shaped_w * w_win * env
    else:
        wave_osc = 0.0

    sway = math.sin(4 * math.pi * phase) * env
    nod = math.sin(6 * math.pi * phase) * env
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (0, 1, 0), -4 * env + 2.5 * sway)
    rotate_world(arm, 'Spine01', (0, 1, 0), -2 * env + 1.5 * sway)
    rotate_world(arm, 'Head', (0, 1, 0), 3 * env + 2.5 * wave_osc)
    rotate_world(arm, 'Head', (1, 0, 0), 4 * env + 2.5 * nod)
    rotate_world(arm, 'Head', (0, 0, 1), 5 * env)

    rotate_world(arm, 'LeftShoulder', (0, 1, 0), -3 * env)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - (4 - 2.5 * sway) * env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -6 * env)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 8 * env)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), -6 * env)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 10 * env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 10 * env)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + 64 * env + 5 * wave_osc)
    rotate_world(arm, 'RightArm', (0, 0, 1), 30 * env)
    rotate_local(arm, 'RightArm', (0, 1, 0), 6 * env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - 36 * env)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), 12 * env)
    rotate_local(arm, 'RightForeArm', (0, 1, 0), 14 * env)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -12 * env)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), 14 * wave_osc)

    rotate_world(arm, 'RightHand', (1, 0, 0), -14 * env)
    rotate_local(arm, 'RightHand', (0, 1, 0), -8 * env)
    rotate_world(arm, 'RightHand', (0, 1, 0), 12 * wave_osc)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_clap(arm, mesh, phase, design):
    reset_pose(arm)
    lift = plateau_envelope(phase, ramp=0.135)
    if 0.135 <= phase <= 0.865:
        clap_u = (phase - 0.135) / 0.73
        s_clap = math.sin(5 * math.pi * clap_u) ** 2
        clap_pulse = (s_clap ** 1.15) * lift
    else:
        clap_pulse = 0.0

    bounce = clap_pulse
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), 3.5 * bounce)
    rotate_world(arm, 'Head', (1, 0, 0), -3.5 * clap_pulse + 3 * lift)
    rotate_world(arm, 'Head', (0, 1, 0), 3.5 * math.sin(4 * math.pi * phase) * lift)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (12 * lift + 6 * clap_pulse))

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 17 * lift))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -23 * lift)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (36 * lift + 15 * clap_pulse))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 22 * lift)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (36 * lift + 22 * clap_pulse))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (12 * lift + 2 * clap_pulse))

        rotate_world(arm, f'{side}Hand', (0, 0, 1), -sign * (-20 * lift + 8 * clap_pulse))
        rotate_world(arm, f'{side}Hand', (0, 1, 0), sign * (30 * lift + 8 * clap_pulse))

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_jump(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    if 0.0 < phase < 0.17:
        w_crouch = math.sin(0.5 * math.pi * (phase / 0.17)) ** 1.5
    elif 0.17 <= phase < 0.29:
        w_crouch = math.sin(0.5 * math.pi * ((0.29 - phase) / 0.12)) ** 1.5
    else:
        w_crouch = 0.0

    if 0.25 <= phase <= 0.69:
        air_u = (phase - 0.25) / 0.44
        w_air = math.sin(math.pi * air_u) ** 1.4
        hop = 0.215 * (math.sin(math.pi * air_u) ** 1.45)
    else:
        w_air = 0.0
        hop = 0.0

    if 0.65 < phase < 0.79:
        w_land = math.sin(0.5 * math.pi * ((phase - 0.65) / 0.14)) ** 1.5
    elif 0.79 <= phase < 1.0:
        w_land = math.sin(0.5 * math.pi * ((1.0 - phase) / 0.21)) ** 1.6
    else:
        w_land = 0.0

    if 0.22 < phase < 0.47:
        u_up = (phase - 0.22) / 0.25
        w_arm_up = math.sin(0.5 * math.pi * u_up) ** 1.55
    elif 0.47 <= phase < 0.88:
        u_down = (0.88 - phase) / 0.41
        w_arm_up = math.sin(0.5 * math.pi * u_down) ** 1.65
    else:
        w_arm_up = 0.0

    rotate_world(arm, 'Spine02', (1, 0, 0), 11.0 * w_crouch - 5.0 * w_air + 7.0 * w_land)
    rotate_world(arm, 'Spine01', (1, 0, 0), 5.0 * w_crouch - 3.0 * w_air + 3.5 * w_land)
    rotate_world(arm, 'Spine', (1, 0, 0), 4.0 * w_crouch - 2.0 * w_air + 2.5 * w_land)
    rotate_world(arm, 'Head', (1, 0, 0), 8.0 * w_crouch - 6.0 * w_air + 5.0 * w_land)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (10.0 * w_arm_up))

        arm_abduct = relaxed_arm - 10.0 * w_crouch - 62.0 * w_arm_up
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * arm_abduct)
        rotate_world(arm, f'{side}Arm', (1, 0, 0), 36.0 * w_crouch - 10.0 * w_arm_up)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), sign * (10.0 * w_crouch - 6.0 * w_arm_up))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm + 14.0 * w_crouch - 12.0 * w_arm_up)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (8.0 * w_crouch + 12.0 * w_arm_up))

        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * (-10.0 * w_crouch + 14.0 * w_arm_up))

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), -sign * (5.0 * w_crouch + 13.0 * w_air + 4.0 * w_land))
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -34.0 * w_crouch - 26.0 * w_air - 22.0 * w_land)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 52.0 * w_crouch + 44.0 * w_air + 36.0 * w_land)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -20.0 * w_crouch + 12.0 * w_air - 14.0 * w_land)

    return apply_floor_and_hop(arm, mesh, hop)


def pose_finale(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.15)
    raw_wave = math.sin(8 * math.pi * phase)
    wave = raw_wave * (0.84 + 0.16 * (raw_wave ** 2))
    beat = wave * env
    left_up = ((1.0 + wave) * 0.5) * env
    right_up = ((1.0 - wave) * 0.5) * env
    left_step = (max(0.0, wave) ** 1.35) * env
    right_step = (max(0.0, -wave) ** 1.35) * env
    pulse = (math.sin(8 * math.pi * phase) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Hips', (0, 1, 0), -12.0 * beat)
    rotate_world(arm, 'Hips', (0, 0, 1), 15.0 * beat)

    rotate_world(arm, 'Spine02', (0, 1, 0), 5.0 * beat)
    rotate_world(arm, 'Spine02', (0, 0, 1), -6.0 * beat)
    rotate_world(arm, 'Spine02', (1, 0, 0), -3.0 * pulse)

    rotate_world(arm, 'Spine01', (0, 1, 0), 4.5 * beat)
    rotate_world(arm, 'Spine01', (0, 0, 1), -6.0 * beat)

    rotate_world(arm, 'Spine', (0, 1, 0), 4.5 * beat)
    rotate_world(arm, 'Spine', (0, 0, 1), -5.0 * beat)
    rotate_world(arm, 'Spine', (1, 0, 0), -2.0 * pulse)

    for side, sign, high, low in [
        ('Left', 1, left_up, right_up),
        ('Right', -1, right_up, left_up),
    ]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (7.0 * high - 5.0 * low))

        arm_lift = 68.0 * high + 8.0 * low
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - arm_lift))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (10.0 * high + 14.0 * low))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -8.0 * high + 10.0 * low)

        rotate_world(
            arm,
            f'{side}ForeArm',
            (1, 0, 0),
            -relaxed_forearm - 10.0 * high - 32.0 * low,
        )
        rotate_world(
            arm,
            f'{side}ForeArm',
            (0, 1, 0),
            -sign * (46.0 * high - 14.0 * low),
        )
        rotate_world(
            arm,
            f'{side}ForeArm',
            (0, 0, 1),
            -sign * (6.0 * high + 38.0 * low),
        )

        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * (16.0 * high - 12.0 * low))
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * high - 10.0 * low)

    for side, sign, lift, planted in [
        ('Left', 1, left_step, right_step),
        ('Right', -1, right_step, left_step),
    ]:
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 10.0 * beat - sign * (11.0 * lift + 4.0 * planted))
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -11.0 * beat)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -32.0 * lift - 6.0 * pulse)

        rotate_world(arm, f'{side}Leg', (1, 0, 0), 42.0 * lift + 10.0 * pulse)

        rotate_world(arm, f'{side}Foot', (1, 0, 0), -12.0 * lift - 5.0 * pulse)
        rotate_world(arm, f'{side}Foot', (0, 1, 0), -4.0 * beat)

    rotate_world(arm, 'neck', (0, 1, 0), 4.0 * beat)
    rotate_world(arm, 'neck', (0, 0, 1), -5.0 * beat)
    rotate_world(arm, 'Head', (0, 1, 0), 7.0 * beat)
    rotate_world(arm, 'Head', (0, 0, 1), -10.0 * beat)
    rotate_world(arm, 'Head', (1, 0, 0), -8.0 * pulse + 4.0 * env)

    hop = 0.09 * (math.sin(8 * math.pi * phase) ** 2) * env
    return apply_floor_and_hop(arm, mesh, hop)


def pose_idle(arm, mesh, phase, design):
    reset_pose(arm)
    env = math.sin(math.pi * phase) ** 1.5
    breath = math.sin(2 * math.pi * phase) * env
    nod = (math.sin(4 * math.pi * phase) ** 2) * env
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    for side, sign in [('Left', 1), ('Right', -1)]:
        world_rotation(arm.pose.bones[f'{side}Arm'], (0, 1, 0), sign * (relaxed_arm - 5 * env))
        add_world_rotation(arm.pose.bones[f'{side}Arm'], (0, 0, 1), -sign * 10 * env)
        world_rotation(arm.pose.bones[f'{side}ForeArm'], (1, 0, 0), -relaxed_forearm)
        add_world_rotation(arm.pose.bones[f'{side}ForeArm'], (0, 1, 0), -sign * 28 * env)
        add_world_rotation(arm.pose.bones[f'{side}ForeArm'], (0, 0, 1), -sign * 14 * env)
        world_rotation(arm.pose.bones[f'{side}Hand'], (0, 0, 1), sign * 10 * env)
        world_rotation(arm.pose.bones[f'{side}UpLeg'], (1, 0, 0), sign * 3 * breath)
        world_rotation(arm.pose.bones[f'{side}Leg'], (1, 0, 0), -4 * nod)

    world_rotation(arm.pose.bones['Spine02'], (0, 1, 0), 4 * breath)
    add_world_rotation(arm.pose.bones['Spine02'], (1, 0, 0), 3 * nod)
    world_rotation(arm.pose.bones['Head'], (1, 0, 0), 9 * nod)
    add_world_rotation(arm.pose.bones['Head'], (0, 1, 0), 6 * breath)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_search(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.195)
    if 0.15 <= phase <= 0.85:
        scan_u = (phase - 0.15) / 0.70
        scan_win = plateau_envelope(scan_u, ramp=0.15)
        scan = math.sin(4 * math.pi * scan_u) * scan_win * env
    else:
        scan = 0.0
    nod = math.sin(4 * math.pi * phase) * env
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), 5.0 * env)
    rotate_world(arm, 'Spine02', (0, 0, 1), 8.0 * scan)
    rotate_world(arm, 'Spine01', (1, 0, 0), 3.0 * env)
    rotate_world(arm, 'Spine01', (0, 0, 1), 4.0 * scan)

    rotate_world(arm, 'Head', (0, 0, 1), 20.0 * scan)
    rotate_world(arm, 'Head', (1, 0, 0), -2.5 * env + 1.5 * nod)
    rotate_world(arm, 'Head', (0, 1, 0), -2.0 * scan)

    rotate_world(arm, 'LeftShoulder', (0, 1, 0), -3.0 * env)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - 12.0 * env - 2.0 * scan)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -10.0 * env - 3.0 * scan)
    rotate_world(arm, 'LeftArm', (1, 0, 0), 5.0 * env)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 14.0 * env)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), -8.0 * env)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 4.0 * env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 24.0 * env + 2.0 * scan)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + 22.0 * env + 2.0 * scan)
    rotate_world(arm, 'RightArm', (0, 0, 1), 42.0 * env + 4.0 * scan)
    rotate_world(arm, 'RightArm', (1, 0, 0), -26.0 * env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - 32.0 * env)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 16.0 * env + 12.0 * scan)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -10.0 * env)

    rotate_world(arm, 'RightHand', (0, 1, 0), 10.0 * env)
    rotate_world(arm, 'RightHand', (0, 0, 1), 6.0 * scan)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_think(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.17)
    if phase <= 0.46:
        s_aha = 0.0
    elif phase < 0.64:
        u_tr = (phase - 0.46) / 0.18
        s_aha = math.sin(0.5 * math.pi * u_tr) ** 1.6
    else:
        s_aha = 1.0

    w_think = env * (1.0 - s_aha)
    w_aha = env * s_aha

    if 0.12 <= phase <= 0.52:
        think_u = (phase - 0.12) / 0.40
        t_win = plateau_envelope(think_u, ramp=0.14)
        tap = (math.sin(3 * math.pi * think_u) ** 2) * t_win * w_think
    else:
        tap = 0.0

    if 0.58 <= phase <= 0.88:
        aha_u = (phase - 0.58) / 0.30
        a_win = plateau_envelope(aha_u, ramp=0.18)
        aha_nod = math.sin(4 * math.pi * aha_u) * a_win * w_aha
    else:
        aha_nod = 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), -4.0 * w_aha)
    rotate_world(arm, 'Spine02', (0, 1, 0), 2.5 * w_think)
    rotate_world(arm, 'Spine01', (1, 0, 0), -2.0 * w_aha)

    rotate_world(arm, 'Head', (0, 1, 0), 16.0 * w_think)
    rotate_world(arm, 'Head', (1, 0, 0), 8.0 * w_think + 1.5 * tap - 6.0 * w_aha + 5.5 * aha_nod)
    rotate_world(arm, 'Head', (0, 0, 1), 4.0 * w_think)

    rotate_world(arm, 'LeftShoulder', (0, 1, 0), -2.0 * w_think - 5.0 * w_aha)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - 4.0 * w_think - 16.0 * w_aha)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -6.0 * w_think - 10.0 * w_aha)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 8.0 * w_think - 16.0 * w_aha)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), -5.0 * w_think - 8.0 * w_aha)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 4.0 * w_think + 14.0 * w_aha)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 24.0 * w_think + 4.0 * w_aha)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + 26.0 * w_think + (68.0 + 3.0 * aha_nod) * w_aha)
    rotate_world(arm, 'RightArm', (0, 0, 1), 54.0 * w_think + 6.0 * w_aha)
    rotate_world(arm, 'RightArm', (1, 0, 0), -18.0 * w_think - 12.0 * w_aha)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - (24.0 + 6.0 * tap) * w_think - (28.0 + 4.0 * aha_nod) * w_aha)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), (50.0 + 6.0 * tap) * w_think - 4.0 * w_aha)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -6.0 * w_think + 28.0 * w_aha)

    rotate_world(arm, 'RightHand', (0, 1, 0), (6.0 + 10.0 * tap) * w_think + 18.0 * w_aha)
    rotate_world(arm, 'RightHand', (0, 0, 1), (-24.0 + 6.0 * tap) * w_think)
    rotate_world(arm, 'RightHand', (1, 0, 0), (-24.0 - 6.0 * tap) * w_think - 10.0 * w_aha)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_listen(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.19)
    if 0.18 <= phase <= 0.82:
        listen_u = (phase - 0.18) / 0.64
        l_win = plateau_envelope(listen_u, ramp=0.14)
        nod = (math.sin(3 * math.pi * listen_u) ** 2) * l_win * env
    else:
        nod = 0.0
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), 7.0 * env + 2.5 * nod)
    rotate_world(arm, 'Spine01', (1, 0, 0), 3.5 * env + 1.0 * nod)
    rotate_world(arm, 'Spine02', (0, 0, 1), 8.0 * env)
    rotate_world(arm, 'Spine01', (0, 0, 1), 4.0 * env)

    rotate_world(arm, 'Head', (0, 0, 1), 20.0 * env)
    rotate_world(arm, 'Head', (0, 1, 0), 10.0 * env)
    rotate_world(arm, 'Head', (1, 0, 0), -3.0 * env + 8.5 * nod)

    rotate_world(arm, 'LeftShoulder', (0, 1, 0), 2.0 * env)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - 2.0 * env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -6.0 * env)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 8.0 * env)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), -6.0 * env)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 16.0 * env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 12.0 * env)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + 79.5 * env - 6.2 * nod)
    rotate_world(arm, 'RightArm', (0, 0, 1), 18.0 * env + 4.5 * nod)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.5 * nod)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - 42.5 * env + 7.2 * nod)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), 38.5 * env - 4.5 * nod)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 10.0 * env)

    rotate_world(arm, 'RightHand', (1, 0, 0), -12.0 * env)
    rotate_world(arm, 'RightHand', (0, 1, 0), 14.0 * env)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_encourage(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.16)
    if 0.16 <= phase <= 0.84:
        u = (phase - 0.16) / 0.68
        pump = (math.sin(3 * math.pi * u) ** 2) * env
    else:
        pump = 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), 2.5 * env + 3.5 * pump)
    rotate_world(arm, 'Spine01', (1, 0, 0), 1.5 * env + 2.5 * pump)
    rotate_world(arm, 'Head', (1, 0, 0), 1.0 * env + 12.0 * pump)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (4.0 * env + 6.0 * pump))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (8.0 * env + 2.0 * pump))

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 12.0 * env - 8.0 * pump))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -32.0 * env - 27.0 * pump)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (22.0 * env + 4.0 * pump))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 33.0 * env - 10.0 * pump)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (32.0 * env + 4.0 * pump))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (6.0 * env + 2.0 * pump))

        rotate_world(arm, f'{side}Hand', (1, 0, 0), -6.0 * env - 8.0 * pump)
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * 8.0 * env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_shrug(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.16)
    if 0.16 <= phase <= 0.84:
        u = (phase - 0.16) / 0.68
        shrug_pulse = (math.sin(2 * math.pi * u) ** 2) * env
    else:
        shrug_pulse = 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), -2.0 * env)
    rotate_world(arm, 'Spine02', (0, 1, 0), -1.5 * env - 1.5 * shrug_pulse)

    rotate_world(arm, 'Head', (0, 1, 0), 6.0 * env + 4.0 * shrug_pulse)
    rotate_world(arm, 'Head', (1, 0, 0), 3.0 * env + 3.0 * shrug_pulse)
    rotate_world(arm, 'Head', (0, 0, 1), -3.0 * env)

    for side, sign in [('Left', 1), ('Right', -1)]:
        base_sh = 5.0 if side == 'Left' else 7.0
        pulse_sh = 6.0 if side == 'Left' else 9.0
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (base_sh * env + pulse_sh * shrug_pulse))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * 5.0 * env)

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 21.0 * env - 4.0 * shrug_pulse))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -14.0 * env - 2.0 * shrug_pulse)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 32.0 * env - 9.5 * shrug_pulse)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (8.0 * env + 2.0 * shrug_pulse))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (18.0 * env + 4.0 * shrug_pulse))
        rotate_local(arm, f'{side}ForeArm', (0, 1, 0), -sign * 40.0 * env)

        rotate_world(arm, f'{side}Hand', (1, 0, 0), -8.0 * env - 6.0 * shrug_pulse)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * 8.0 * env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_flex(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.22)
    if 0.16 <= phase <= 0.84:
        u = (phase - 0.16) / 0.68
        pulse = (math.sin(3 * math.pi * u) ** 2) * env
    else:
        pulse = 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine02', (1, 0, 0), -8.0 * env - 2.0 * pulse)
    rotate_world(arm, 'Spine01', (1, 0, 0), -5.0 * env - 1.5 * pulse)
    rotate_world(arm, 'Head', (1, 0, 0), -2.0 * env + 7.0 * pulse)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (8.0 * env + 1.5 * pulse))
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 58.0 * env - 3.5 * pulse))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * 4.0 * env)
        rotate_local(arm, f'{side}Arm', (0, 1, 0), sign * 62.0 * env)

        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (46.0 * env + 15.0 * pulse))
        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 12.0 * env)

        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * (10.0 * env + 8.0 * pulse))
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_bow(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.20)
    bow_u = max(0.0, min(1.0, (phase - 0.06) / 0.88))
    bow_env = plateau_envelope(bow_u, ramp=0.24)
    sweep_u = max(0.0, min(1.0, (phase - 0.14) / 0.72))
    sweep = math.sin(2 * math.pi * sweep_u) * plateau_envelope(sweep_u, ramp=0.18) * env
    flourish = math.sin(2 * math.pi * phase) * env

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Spine', (1, 0, 0), 14.0 * bow_env)
    rotate_world(arm, 'Spine01', (1, 0, 0), 16.0 * bow_env)
    rotate_world(arm, 'Spine02', (1, 0, 0), 18.0 * bow_env)
    rotate_world(arm, 'Spine02', (0, 0, 1), -4.0 * bow_env - 3.0 * sweep)
    rotate_world(arm, 'Head', (1, 0, 0), 16.0 * bow_env)
    rotate_world(arm, 'Head', (0, 1, 0), 3.0 * flourish)

    rotate_world(arm, 'LeftUpLeg', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'RightUpLeg', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'LeftLeg', (1, 0, 0), -8.0 * bow_env)
    rotate_world(arm, 'RightLeg', (1, 0, 0), -8.0 * bow_env)

    rotate_world(arm, 'RightShoulder', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'RightShoulder', (0, 1, 0), (6.0 + 4.0 * sweep) * env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), (8.0 + 6.0 * sweep) * env)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + (38.0 + 12.0 * sweep) * env)
    rotate_world(arm, 'RightArm', (0, 0, 1), (18.0 + 12.0 * sweep) * env)
    rotate_world(arm, 'RightArm', (1, 0, 0), (-14.0 - 8.0 * bow_env - 10.0 * sweep) * env)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - (22.0 + 8.0 * sweep) * env)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), (16.0 + 12.0 * sweep) * env)
    rotate_world(arm, 'RightHand', (0, 0, 1), (-10.0 - 10.0 * sweep) * env)
    rotate_world(arm, 'RightHand', (1, 0, 0), -8.0 * env + 8.0 * flourish)

    rotate_world(arm, 'LeftShoulder', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'LeftShoulder', (0, 0, 1), -8.0 * bow_env)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - (6.0 - 2.0 * sweep) * bow_env)
    rotate_world(arm, 'LeftArm', (1, 0, 0), -24.0 * bow_env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -32.0 * bow_env)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 26.0 * bow_env)
    rotate_world(arm, 'LeftForeArm', (0, 0, 1), -58.0 * bow_env)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), 12.0 * bow_env)
    rotate_world(arm, 'LeftHand', (0, 1, 0), (12.0 + 4.0 * flourish) * bow_env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_march(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.14)
    raw_m = math.sin(6 * math.pi * phase)
    m_wave = raw_m * (0.84 + 0.16 * (raw_m ** 2)) * env
    step_pulse = (raw_m ** 2) * env

    left_lift = (max(0.0, raw_m) ** 1.35) * env
    right_lift = (max(0.0, -raw_m) ** 1.35) * env

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Hips', (0, 0, 1), -5.0 * m_wave)
    rotate_world(arm, 'Spine', (0, 0, 1), 2.0 * m_wave)
    rotate_world(arm, 'Spine01', (0, 0, 1), 3.0 * m_wave)
    rotate_world(arm, 'Spine02', (0, 0, 1), 4.0 * m_wave)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.5 * step_pulse)
    rotate_world(arm, 'Head', (0, 1, 0), 5.0 * m_wave)
    rotate_world(arm, 'Head', (1, 0, 0), -4.0 * step_pulse + 2.0 * env)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 8.0 * env + 4.0 * m_wave)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm + 38.0 * env + 18.0 * m_wave)
    rotate_world(arm, 'RightArm', (0, 0, 1), 24.0 * env - 12.0 * m_wave)
    rotate_world(arm, 'RightArm', (1, 0, 0), -20.0 * env + 8.0 * m_wave)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm - 38.0 * env + 6.0 * m_wave)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), 20.0 * env + 24.0 * m_wave)
    rotate_world(arm, 'RightHand', (0, 1, 0), 14.0 * m_wave)
    rotate_world(arm, 'RightHand', (1, 0, 0), -10.0 * env + 6.0 * m_wave)

    rotate_world(arm, 'LeftShoulder', (0, 0, 1), -4.0 * env - 6.0 * m_wave)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - 14.0 * env)
    rotate_world(arm, 'LeftArm', (1, 0, 0), -28.0 * m_wave - 6.0 * env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -10.0 * env - 8.0 * m_wave)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 26.0 * env - 14.0 * m_wave)
    rotate_world(arm, 'LeftForeArm', (0, 0, 1), -12.0 * env)
    rotate_world(arm, 'LeftHand', (1, 0, 0), -8.0 * m_wave)

    for side, sign, lift in [
        ('Left', 1, left_lift),
        ('Right', -1, right_lift),
    ]:
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), -sign * 6.0 * lift)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -36.0 * lift)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 48.0 * lift)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -14.0 * lift)

    hop = 0.03 * step_pulse
    return apply_floor_and_hop(arm, mesh, hop)


def pose_wiggle(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.16)
    raw_w = math.sin(8 * math.pi * phase)
    w = raw_w * (0.82 + 0.18 * (raw_w ** 2)) * env
    pulse = (raw_w ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    rotate_world(arm, 'Hips', (0, 1, 0), -14.0 * w)
    rotate_world(arm, 'Hips', (0, 0, 1), 16.0 * w)

    rotate_world(arm, 'Spine', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine', (0, 0, 1), -6.0 * w)
    rotate_world(arm, 'Spine01', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine01', (0, 0, 1), -6.0 * w)
    rotate_world(arm, 'Spine02', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine02', (0, 0, 1), -6.0 * w)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.5 * pulse)

    rotate_world(arm, 'neck', (0, 1, 0), 3.0 * w)
    rotate_world(arm, 'Head', (0, 1, 0), 6.0 * w)
    rotate_world(arm, 'Head', (0, 0, 1), -8.0 * w)
    rotate_world(arm, 'Head', (1, 0, 0), -4.0 * pulse + 3.0 * env)

    for side, sign in [('Left', 1), ('Right', -1)]:
        shake = sign * w
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 8.0 * env)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 42.0 * env) + 6.0 * w)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * 22.0 * env)
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -22.0 * env + 6.0 * shake)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 42.0 * env + 8.0 * shake)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * 16.0 * env)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * 18.0 * env + 8.0 * w)

        rotate_world(arm, f'{side}Hand', (1, 0, 0), 10.0 * shake)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), 8.0 * w)

        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 9.0 * w)
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -10.0 * w)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.0 * pulse)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 6.0 * pulse)
        rotate_world(arm, f'{side}Foot', (0, 1, 0), -3.0 * w)

    return apply_floor_and_hop(arm, mesh, 0.0)


def smooth_step(u):
    if u <= 0.0:
        return 0.0
    if u >= 1.0:
        return 1.0
    return 0.5 - 0.5 * math.cos(math.pi * u)


def pose_peekaboo(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    if 0.0 < phase < 0.22:
        w_hide = smooth_step(phase / 0.22)
    elif 0.22 <= phase <= 0.34:
        w_hide = 1.0
    elif 0.34 < phase < 0.56:
        w_hide = smooth_step((0.56 - phase) / 0.22)
    else:
        w_hide = 0.0

    if 0.34 < phase < 0.56:
        w_peek = 1.0 - w_hide
    elif 0.56 <= phase <= 0.78:
        w_peek = 1.0
    elif 0.78 < phase < 1.0:
        w_peek = smooth_step((1.0 - phase) / 0.22)
    else:
        w_peek = 0.0

    if 0.14 <= phase <= 0.44:
        hide_u = (phase - 0.14) / 0.2655
        hide_win = plateau_envelope((phase - 0.14) / 0.30, ramp=0.25)
        hide_sway = math.sin(2.0 * math.pi * hide_u) * hide_win * w_hide
    else:
        hide_sway = 0.0

    if 0.50 <= phase <= 0.86:
        peek_u = (phase - 0.50) / 0.36
        peek_win = plateau_envelope(peek_u, ramp=0.22)
        peek_nod = (math.sin(2.0 * math.pi * peek_u) ** 2) * peek_win * w_peek
        peek_tilt = math.sin(2.0 * math.pi * peek_u) * peek_win * w_peek
    else:
        peek_nod = 0.0
        peek_tilt = 0.0

    rotate_world(arm, 'Spine01', (1, 0, 0), -3.2 * w_hide + 2.0 * w_peek)
    rotate_world(arm, 'Spine02', (1, 0, 0), -4.8 * w_hide + 4.0 * w_peek)

    rotate_world(arm, 'Head', (1, 0, 0), 12.0 * w_hide - 6.0 * w_peek + 7.0 * peek_nod)
    rotate_world(arm, 'Head', (0, 1, 0), 5.0 * peek_tilt)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (-2.0 * w_hide + 4.0 * w_peek))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (26.0 * w_hide - 4.0 * w_peek))

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 60.0 * w_hide - 66.0 * w_peek))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (46.0 * w_hide + 2.0 * w_peek))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -30.0 * w_hide - 8.0 * w_peek)

        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (28.0 * w_hide - 6.0 * w_peek))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (28.0 * w_hide + 6.0 * w_peek))
        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 18.0 * w_hide - 14.0 * w_peek)

        rotate_world(arm, f'{side}Hand', (0, 0, 1), -sign * (18.0 * w_hide - 12.0 * w_peek))
        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * (10.0 * w_hide - 8.0 * w_peek))

    if hide_sway != 0.0:
        rotate_world(arm, 'Spine02', (0, 0, 1), 8.0 * hide_sway)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_stretch(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 16)
    relaxed_forearm = design.get('relaxedForearmDegrees', 6)

    if 0.0 < phase < 0.22:
        w_stretch = smooth_step(phase / 0.22)
    elif 0.22 <= phase <= 0.52:
        w_stretch = 1.0
    elif 0.52 < phase < 0.68:
        w_stretch = smooth_step((0.68 - phase) / 0.16)
    else:
        w_stretch = 0.0

    if 0.52 < phase < 0.68:
        w_release = 1.0 - w_stretch
    elif 0.68 <= phase <= 0.74:
        w_release = 1.0
    elif 0.74 < phase < 1.0:
        w_release = smooth_step((1.0 - phase) / 0.26)
    else:
        w_release = 0.0

    if 0.14 <= phase <= 0.56:
        sway_u = (phase - 0.14) / 0.42
        sway_win = plateau_envelope(sway_u, ramp=0.22)
        sway = math.sin(2.0 * math.pi * sway_u) * sway_win * w_stretch
    else:
        sway = 0.0

    if 0.56 <= phase <= 0.88:
        sigh_u = (phase - 0.56) / 0.32
        sigh_nod = (math.sin(math.pi * sigh_u) ** 1.5) * w_release
    else:
        sigh_nod = 0.0

    rotate_world(arm, 'Spine', (1, 0, 0), -4.0 * w_stretch + 2.0 * sigh_nod)
    rotate_world(arm, 'Spine01', (1, 0, 0), -6.0 * w_stretch + 3.0 * sigh_nod)
    rotate_world(arm, 'Spine02', (1, 0, 0), -10.0 * w_stretch + 5.0 * sigh_nod)

    rotate_world(arm, 'Head', (1, 0, 0), -14.0 * w_stretch + 8.0 * sigh_nod)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (9.0 * w_stretch + 5.0 * w_release))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (-6.0 * w_release))

        arm_lift = 81.0 * w_stretch + 54.0 * w_release
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - arm_lift))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (18.0 * w_stretch + 4.0 * w_release))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), 12.0 * w_stretch - 6.0 * w_release)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm + 4.0 * w_stretch - 10.0 * w_release)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), -sign * (32.0 * w_stretch + 6.0 * w_release))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (10.0 * w_stretch - 6.0 * w_release))

        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * (6.0 * w_stretch - 8.0 * w_release))
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -8.0 * w_stretch - 4.0 * w_release)

    if sway != 0.0:
        rotate_world(arm, 'Spine01', (0, 1, 0), 0.8 * sway)
        rotate_world(arm, 'Spine02', (0, 1, 0), 1.7 * sway)

    return apply_floor_and_hop(arm, mesh, 0.0)


CLIP_BUILDERS = [
    ('celebrate', 42, pose_celebrate),
    ('wave', 66, pose_wave),
    ('clap', 66, pose_clap),
    ('jump', 42, pose_jump),
    ('finale', 84, pose_finale),
    ('idle', 42, pose_idle),
    ('search', 66, pose_search),
    ('think', 66, pose_think),
    ('listen', 60, pose_listen),
    ('encourage', 54, pose_encourage),
    ('shrug', 54, pose_shrug),
    ('flex', 60, pose_flex),
    ('bow', 60, pose_bow),
    ('march', 72, pose_march),
    ('wiggle', 60, pose_wiggle),
    ('peekaboo', 66, pose_peekaboo),
    ('stretch', 66, pose_stretch),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glb', required=True, type=Path)
    parser.add_argument('--design', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
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
    meshes = [
        obj for obj in bpy.data.objects
        if obj.type == 'MESH' and any(mod.type == 'ARMATURE' and mod.object == arm for mod in obj.modifiers)
    ]
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

    scene = bpy.context.scene
    scene.render.fps = 30
    scene.render.fps_base = 1

    actions_by_name = {}
    clip_summaries = []
    celebrate_floors = []

    for clip_name, end_frame, pose_fn in CLIP_BUILDERS:
        action = bpy.data.actions.new(clip_name)
        action.use_fake_user = True
        actions_by_name[clip_name] = action
        floors = []
        for frame in range(end_frame + 1):
            arm.animation_data.action = None
            scene.frame_set(frame)
            phase = frame / end_frame if frame != end_frame else 0
            correction = pose_fn(arm, mesh, phase, design)
            floors.append({
                'frame': frame,
                'hips_correction_m': correction,
                'floor_m': min(point.z for point in world_mesh(mesh)[0]),
            })
            arm.animation_data.action = action
            if hasattr(arm.animation_data, 'action_slot') and action.slots:
                arm.animation_data.action_slot = action.slots[0]
            for bone in arm.pose.bones:
                bone.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=bone.name)
            arm.pose.bones['Hips'].keyframe_insert(data_path='location', frame=frame, group='Hips')
        for curve in action_curves(action):
            for key in curve.keyframe_points:
                key.interpolation = 'LINEAR'
        track = arm.animation_data.nla_tracks.new()
        track.name = clip_name
        strip = track.strips.new(clip_name, 0, action)
        strip.name = clip_name
        track.mute = True
        if clip_name == 'celebrate':
            celebrate_floors = floors
        clip_summaries.append({
            'name': clip_name,
            'duration_seconds': round(end_frame / 30.0, 2),
            'keyframes': end_frame + 1,
            'min_floor_m': min(row['floor_m'] for row in floors),
            'max_floor_m': max(row['floor_m'] for row in floors),
        })

    celebrate_action = actions_by_name['celebrate']
    arm.animation_data.action = celebrate_action
    if hasattr(arm.animation_data, 'action_slot') and celebrate_action.slots:
        arm.animation_data.action_slot = celebrate_action.slots[0]
    scene.frame_start, scene.frame_end = 0, 42
    scene.frame_set(0)
    blend = args.output_dir / 'celebration.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    glb = args.output_dir / 'celebration.glb'
    export_model(glb, arm, [mesh], animation=True, animation_mode='ACTIONS')
    # Export precedes review-only studio objects; they never enter runtime bytes.
    studio_props = create_studio_accessories(arm)
    camera = setup_render()
    scene.cycles.samples = 24
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.83, .79, .72, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .75
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.001))
    bpy.context.object.data.materials.append(material('Review floor', '#EFE8DB', .9))
    target = Vector((0, 0, 1.155))
    camera.data.ortho_scale = 2.60
    views = {}
    review_shots = [
        ('neutral', 'celebrate', 0, (-2, -5, .35)),
        ('front', 'celebrate', 0, (0, -5, .28)),
        ('side', 'celebrate', 0, (-5, 0, .28)),
        ('back', 'celebrate', 0, (0, 5, .28)),
        ('dance-quarter', 'celebrate', 10, (-2, -5, .35)),
        ('dance-middle', 'celebrate', 21, (-2, -5, .35)),
        ('dance-three-quarter', 'celebrate', 31, (-2, -5, .35)),
        ('wave-peak', 'wave', 31, (-2, -5, .35)),
        ('clap-peak', 'clap', 33, (-2, -5, .35)),
        ('jump-peak', 'jump', 20, (-2, -5, .35)),
        ('finale-peak', 'finale', 26, (-2, -5, .35)),
        ('idle-peak', 'idle', 21, (-2, -5, .35)),
        ('search-peak', 'search', 33, (-2, -5, .35)),
        ('think-peak', 'think', 48, (-2, -5, .35)),
        ('listen-peak', 'listen', 27, (-2, -5, .35)),
        ('encourage-peak', 'encourage', 27, (-2, -5, .35)),
        ('shrug-peak', 'shrug', 18, (-2, -5, .35)),
        ('flex-peak', 'flex', 30, (-2, -5, .35)),
        ('bow-peak', 'bow', 22, (-2, -5, .35)),
        ('march-peak', 'march', 18, (-2, -5, .35)),
        ('wiggle-peak', 'wiggle', 26, (-2, -5, .35)),
        ('peekaboo-peak', 'peekaboo', 18, (-2, -5, .35)),
        ('stretch-peak', 'stretch', 27, (-2, -5, .35)),
    ]
    for label, clip_name, frame, offset in review_shots:
        set_active_studio_accessory(studio_props, clip_name)
        act = actions_by_name[clip_name]
        arm.animation_data.action = act
        if hasattr(arm.animation_data, 'action_slot') and act.slots:
            arm.animation_data.action_slot = act.slots[0]
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        camera.location = target + Vector(offset)
        camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
        path = args.output_dir / f'{label}-review.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        views[label] = str(path)
    set_active_studio_accessory(studio_props, None)

    arm.animation_data.action = celebrate_action
    if hasattr(arm.animation_data, 'action_slot') and celebrate_action.slots:
        arm.animation_data.action_slot = celebrate_action.slots[0]
    scene.frame_set(0)

    write_json(args.output_dir / 'celebration-report.json', {
        'stage': 'Authored multi-clip proxy motion; runtime, compression, deformation and art checks pending',
        'input_glb': str(args.glb),
        'input_sha256': digest(args.glb),
        'builder_sha256': digest(Path(__file__)),
        'design_sha256': digest(args.design),
        'blend': str(blend),
        'blend_sha256': digest(blend),
        'glb': str(glb),
        'glb_sha256': digest(glb),
        'bone_names': sorted(b.name for b in arm.data.bones),
        'mesh_names': [mesh.name],
        'animation': 'celebrate',
        'duration_seconds': 1.4,
        'fps': 30,
        'keyframes': 43,
        'animations': clip_summaries,
        'floors': celebrate_floors,
        'views': views,
        'review_width': 320,
        'blender_version': bpy.app.version_string,
        'limitations': [
            'One fused fixed outfit; wardrobe swapping unproven.',
            'Native keyframes do not establish actual glTF interpolation or skinning.',
        ],
    })
    print(json.dumps({'glb': str(glb), 'animations': [c['name'] for c in clip_summaries], 'views': views}))


if __name__ == '__main__':
    main()
