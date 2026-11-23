"""Author the 24-clip living companion animation suite on the approved generated bear's fitted rig."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_accessories import create_studio_accessories, set_active_studio_accessory
from bear_companion_common import (
    decimate_and_normalize_skin,
    digest,
    export_model,
    material,
    rotate_local,
    rotate_world,
    write_json,
)
from build_catalog_t01 import setup_render, world_mesh
from prepare_catalog_body import action_curves


def smooth5(u):
    u = max(0.0, min(1.0, u))
    return u * u * u * (10.0 + u * (-15.0 + 6.0 * u))


def plateau_envelope(phase, ramp=0.16):
    if phase <= 0.0 or phase >= 1.0:
        return 0.0
    if phase < ramp:
        return smooth5(phase / ramp)
    if phase > 1.0 - ramp:
        return smooth5((1.0 - phase) / ramp)
    return 1.0


def phase_lag(phase, lag, loop=False):
    if loop:
        return (phase - lag) % 1.0
    if phase <= lag:
        return 0.0
    if lag <= -1.0:
        return 1.0
    return max(0.0, min(1.0, (phase - lag) / max(1e-4, 1.0 - max(0.0, lag))))


def window_bell(phase, start, end, ramp=0.28):
    if phase <= start or phase >= end or end <= start:
        return 0.0
    u = (phase - start) / (end - start)
    if u < ramp:
        return smooth5(u / ramp)
    if u > 1.0 - ramp:
        return smooth5((1.0 - u) / ramp)
    return 1.0


def _feather_box_weight(val, inner_lo, inner_hi, outer_lo, outer_hi):
    if val <= outer_lo or val >= outer_hi:
        return 0.0
    if inner_lo <= val <= inner_hi:
        return 1.0
    if val < inner_lo:
        u = (val - outer_lo) / (inner_lo - outer_lo)
        return 0.5 - 0.5 * math.cos(math.pi * u)
    u = (outer_hi - val) / (outer_hi - inner_hi)
    return 0.5 - 0.5 * math.cos(math.pi * u)


def _replace_packed_image(mat, old_img, new_arr):
    w, h = old_img.size
    orig_name = old_img.name
    cs = old_img.colorspace_settings.name
    nodes = [
        node for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image == old_img
    ]
    new_img = bpy.data.images.new(name=f'{orig_name}_tmp', width=w, height=h, alpha=True)
    new_img.colorspace_settings.name = cs
    new_img.pixels.foreach_set(np.clip(new_arr, 0.0, 1.0).astype(np.float32).ravel())
    new_img.update()
    new_img.pack()
    for node in nodes:
        node.image = new_img
    bpy.data.images.remove(old_img)
    new_img.name = orig_name
    return new_img


def clean_sculpted_eyebrows(mesh, arm):
    """Flatten Meshy's sculpted eyebrow ridges with a per-side quadric surface and inpaint texture maps."""
    to_head = (arm.matrix_world @ arm.data.bones['Head'].matrix_local).inverted() @ mesh.matrix_world
    from_head = to_head.inverted()

    vert_stats = {}
    for side_name, sign in [('left', 1.0), ('right', -1.0)]:
        fit_pts = []
        for v in mesh.data.vertices:
            p = to_head @ v.co
            ax = sign * p.x
            if p.z > 23.0 and 4.5 <= ax <= 34.0 and 41.8 <= p.y <= 64.5:
                in_bump = (8.8 <= ax <= 30.2) and (44.0 <= p.y <= 59.2)
                if not in_bump:
                    fit_pts.append((p.x, p.y, p.z))
        arr_p = np.asarray(fit_pts, dtype=np.float64)
        design_m = np.column_stack([
            np.ones(len(arr_p)),
            arr_p[:, 0],
            arr_p[:, 1],
            arr_p[:, 0] ** 2,
            arr_p[:, 0] * arr_p[:, 1],
            arr_p[:, 1] ** 2,
        ])
        coef, *_ = np.linalg.lstsq(design_m, arr_p[:, 2], rcond=None)
        max_delta = 0.0
        moved = 0
        for v in mesh.data.vertices:
            p = to_head @ v.co
            ax = sign * p.x
            if p.z > 24.5 and 7.8 <= ax <= 31.5 and 43.0 <= p.y <= 60.2:
                wx = _feather_box_weight(ax, 9.8, 28.8, 7.8, 31.5)
                wy = _feather_box_weight(p.y, 44.8, 58.2, 43.0, 60.2)
                w = wx * wy
                if w > 0.0:
                    z_fit = float(
                        coef[0]
                        + coef[1] * p.x
                        + coef[2] * p.y
                        + coef[3] * p.x * p.x
                        + coef[4] * p.x * p.y
                        + coef[5] * p.y * p.y
                    )
                    new_z = (1.0 - w) * p.z + w * z_fit
                    max_delta = max(max_delta, abs(p.z - new_z))
                    v.co = from_head @ Vector((p.x, p.y, new_z))
                    moved += 1
        vert_stats[side_name] = {'fit_pts': len(fit_pts), 'moved': moved, 'max_delta_cm': round(max_delta, 3)}
    mesh.data.update()

    mat = mesh.data.materials[0]
    tex_imgs = [node.image for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image]
    img_color = next(
        im for im in tex_imgs if 'normal' not in im.name.lower() and 'metallic' not in im.name.lower()
    )
    img_norm = next(im for im in tex_imgs if 'normal' in im.name.lower())
    img_mr = next(im for im in tex_imgs if 'metallic' in im.name.lower())

    w, h = img_color.size
    carr = np.array(img_color.pixels[:], dtype=np.float32).reshape((h, w, 4))

    mesh.data.calc_loop_triangles()
    uv_layer = mesh.data.uv_layers.active.data
    brow_zone = np.zeros((h, w), dtype=bool)
    clean_forehead = np.zeros((h, w), dtype=bool)
    for tri in mesh.data.loop_triangles:
        pts = [to_head @ mesh.data.vertices[mesh.data.loops[li].vertex_index].co for li in tri.loops]
        if (
            max(p.z for p in pts) < 23.5
            or max(p.y for p in pts) < 41.8
            or min(p.y for p in pts) > 62.5
            or min(abs(p.x) for p in pts) > 33.0
        ):
            continue
        uvs = [uv_layer[li].uv for li in tri.loops]
        u0, v0 = uvs[0].x, uvs[0].y
        pxs = [(uv.x - round(uv.x - u0)) * w for uv in uvs]
        pys = [(uv.y - round(uv.y - v0)) * h for uv in uvs]
        x0 = max(0, int(math.floor(min(pxs))) - 1)
        x1 = min(w - 1, int(math.ceil(max(pxs))) + 1)
        y0 = max(0, int(math.floor(min(pys))) - 1)
        y1 = min(h - 1, int(math.ceil(max(pys))) + 1)
        denom = (pys[1] - pys[2]) * (pxs[0] - pxs[2]) + (pxs[2] - pxs[1]) * (pys[0] - pys[2])
        if x1 < x0 or y1 < y0 or abs(denom) < 1e-6:
            continue
        gy, gx = np.mgrid[y0 : y1 + 1, x0 : x1 + 1]
        w0 = ((pys[1] - pys[2]) * (gx + 0.5 - pxs[2]) + (pxs[2] - pxs[1]) * (gy + 0.5 - pys[2])) / denom
        w1 = ((pys[2] - pys[0]) * (gx + 0.5 - pxs[2]) + (pxs[0] - pxs[2]) * (gy + 0.5 - pys[2])) / denom
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        hx = w0 * pts[0].x + w1 * pts[1].x + w2 * pts[2].x
        hy = w0 * pts[0].y + w1 * pts[1].y + w2 * pts[2].y
        hz = w0 * pts[0].z + w1 * pts[1].z + w2 * pts[2].z
        brow_zone[y0 : y1 + 1, x0 : x1 + 1] |= (
            inside & (np.abs(hx) >= 7.8) & (np.abs(hx) <= 32.0) & (hy >= 43.8) & (hy <= 60.8) & (hz >= 24.0)
        )
        clean_forehead[y0 : y1 + 1, x0 : x1 + 1] |= (
            inside & (np.abs(hx) >= 5.0) & (np.abs(hx) <= 33.8) & (hy >= 41.8) & (hy <= 63.0) & (hz >= 23.0)
        )

    lum = 0.2126 * carr[:, :, 0] + 0.7152 * carr[:, :, 1] + 0.0722 * carr[:, :, 2]
    mask = brow_zone & (lum < 0.514)
    for _ in range(13):
        dil = mask.copy()
        dil[1:, :] |= mask[:-1, :]
        dil[:-1, :] |= mask[1:, :]
        dil[:, 1:] |= mask[:, :-1]
        dil[:, :-1] |= mask[:, 1:]
        mask = dil & clean_forehead

    valid_ref = clean_forehead & (~mask) & (lum >= 0.495)
    med_rgb = np.median(carr[valid_ref, :3], axis=0)
    out_rgb = carr[:, :, :3].copy()
    out_rgb[mask] = med_rgb
    for _ in range(55):
        nb_sum = np.zeros_like(out_rgb)
        nb_cnt = np.zeros((h, w, 1), dtype=np.float32)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            ys_dst = slice(max(0, dy), h + min(0, dy))
            ys_src = slice(max(0, -dy), h - max(0, dy))
            xs_dst = slice(max(0, dx), w + min(0, dx))
            xs_src = slice(max(0, -dx), w - max(0, dx))
            w_n = clean_forehead[ys_src, xs_src].astype(np.float32)[..., None]
            nb_sum[ys_dst, xs_dst] += out_rgb[ys_src, xs_src] * w_n
            nb_cnt[ys_dst, xs_dst] += w_n
        upd = mask & (nb_cnt[:, :, 0] > 0)
        out_rgb[upd] = nb_sum[upd] / nb_cnt[upd]
    carr[:, :, :3] = out_rgb
    _replace_packed_image(mat, img_color, carr)

    # Normal map -> flatten a slightly wider halo so no residual ridge bevel casts shadow
    norm_mask = mask.copy()
    for _ in range(4):
        dil = norm_mask.copy()
        dil[1:, :] |= norm_mask[:-1, :]
        dil[:-1, :] |= norm_mask[1:, :]
        dil[:, 1:] |= norm_mask[:, :-1]
        dil[:, :-1] |= norm_mask[:, 1:]
        norm_mask = dil & clean_forehead

    nw, nh = img_norm.size
    narr = np.array(img_norm.pixels[:], dtype=np.float32).reshape((nh, nw, 4))
    n_weight = np.where(norm_mask, 1.0, 0.0).astype(np.float32)
    if (nw, nh) != (w, h):
        sy = max(1, nh // h)
        sx = max(1, nw // w)
        n_weight = np.repeat(np.repeat(n_weight, sy, axis=0), sx, axis=1)[:nh, :nw]
    inner = n_weight.copy()
    for _ in range(3):
        er = inner.copy()
        er[1:, :] = np.minimum(er[1:, :], inner[:-1, :])
        er[:-1, :] = np.minimum(er[:-1, :], inner[1:, :])
        er[:, 1:] = np.minimum(er[:, 1:], inner[:, :-1])
        er[:, :-1] = np.minimum(er[:, :-1], inner[:, 1:])
        inner = er
    feather = np.clip(0.5 * n_weight + 0.5 * inner, 0.0, 1.0)[..., None]
    narr[:, :, :3] = (1.0 - feather) * narr[:, :, :3] + feather * np.array([0.5, 0.5, 1.0], dtype=np.float32)
    _replace_packed_image(mat, img_norm, narr)

    mr_w, mr_h = img_mr.size
    marr = np.array(img_mr.pixels[:], dtype=np.float32).reshape((mr_h, mr_w, 4))
    sy = max(1, mr_h // h)
    sx = max(1, mr_w // w)
    mr_mask = np.repeat(np.repeat(norm_mask, sy, axis=0), sx, axis=1)[:mr_h, :mr_w]
    mr_clean = np.repeat(np.repeat(clean_forehead & (~norm_mask), sy, axis=0), sx, axis=1)[:mr_h, :mr_w]
    mr_med = np.median(marr[mr_clean, :3], axis=0)
    marr[mr_mask, :3] = mr_med
    _replace_packed_image(mat, img_mr, marr)

    return {'vertices': vert_stats, 'cleaned_texels': int(mask.sum())}


def reset_pose(arm):
    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()


def apply_floor_and_hop(arm, mesh, hop_m):
    bpy.context.view_layer.update()
    lowest = min(point.z for point in world_mesh(mesh)[0])
    hips = arm.pose.bones['Hips']
    hips.location = (
        hips.bone.matrix_local.to_3x3().inverted()
        @ arm.matrix_world.to_3x3().inverted()
        @ Vector((0, 0, -lowest + hop_m))
    )
    bpy.context.view_layer.update()
    return -lowest + hop_m


def apply_natural_stance(arm, design, weight=1.0):
    if weight <= 0.0:
        return
    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 1.6 * weight)
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -sign * 1.4 * weight)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.0 * weight)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 7.0 * weight)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -3.0 * weight)


def apply_relaxed_arm(
    arm,
    side,
    sign,
    design,
    weight=1.0,
    shoulder_lift=0.0,
    drop_offset=0.0,
    fwd_offset=0.0,
    inward_offset=0.0,
    forearm_flex_offset=0.0,
    forearm_drop_offset=0.0,
    forearm_inward_offset=0.0,
    hand_z_offset=0.0,
):
    if weight <= 0.0:
        return
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)
    if shoulder_lift:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * shoulder_lift * weight)
    rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm + drop_offset) * weight)
    rotate_world(arm, f'{side}Arm', (1, 0, 0), (-4.0 + fwd_offset) * weight)
    rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 + inward_offset) * weight)
    rotate_world(arm, f'{side}ForeArm', (1, 0, 0), (-relaxed_forearm + forearm_flex_offset) * weight)
    rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop + forearm_drop_offset) * weight)
    rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 + forearm_inward_offset) * weight)
    if hand_z_offset:
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * hand_z_offset * weight)


def add_grounded_bounce(arm, bounce_amt, sway_amt=0.0):
    if bounce_amt != 0.0 or sway_amt != 0.0:
        rotate_world(arm, 'Hips', (0, 1, 0), -2.4 * sway_amt)
        rotate_world(arm, 'Hips', (0, 0, 1), 3.0 * sway_amt)
        rotate_world(arm, 'Hips', (1, 0, 0), 1.6 * bounce_amt)
        for side, sign in [('Left', 1), ('Right', -1)]:
            side_flex = 2.0 * max(0.0, sign * sway_amt)
            rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 1.6 * sway_amt)
            rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -2.2 * sway_amt)
            rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.5 * bounce_amt - side_flex)
            rotate_world(arm, f'{side}Leg', (1, 0, 0), 8.2 * bounce_amt + 1.6 * side_flex)
            rotate_world(arm, f'{side}Foot', (1, 0, 0), -3.7 * bounce_amt - 0.6 * side_flex)


def pose_celebrate(arm, mesh, phase, design):
    reset_pose(arm)
    core_p = phase
    limb_p = phase_lag(phase, 0.05)
    head_p = phase_lag(phase, 0.07)

    s_core = math.sin(math.pi * core_p) ** 2
    s_limb = math.sin(math.pi * limb_p) ** 2
    env = plateau_envelope(phase, ramp=0.18)

    cheer = s_limb * (1.0 + 0.25 * (1.0 - s_limb))
    w_cheer = max(0.0, min(1.0, cheer))
    rest = 1.0 - w_cheer
    sway = math.sin(2 * math.pi * core_p) * env
    nod = math.sin(4 * math.pi * head_p) * (math.sin(math.pi * head_p) ** 2)
    wave = math.sin(4 * math.pi * limb_p) * s_limb
    bounce = (math.sin(2 * math.pi * core_p) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, bounce, sway)

    rotate_world(arm, 'Spine02', (0, 1, 0), 1.8 * sway)
    rotate_world(arm, 'Spine02', (1, 0, 0), 2.2 * bounce - 1.5 * s_core)
    rotate_world(arm, 'Spine01', (0, 1, 0), 1.2 * sway)
    rotate_world(arm, 'Spine', (0, 1, 0), 1.0 * sway)
    rotate_world(arm, 'Spine', (1, 0, 0), -2.5 * s_core)

    rotate_world(arm, 'Head', (0, 1, 0), 3.5 * sway + 2.0 * wave)
    rotate_world(arm, 'Head', (1, 0, 0), -4.0 * s_core + 4.5 * nod)
    rotate_world(arm, 'Head', (0, 0, 1), 4.0 * sway)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 9.0 * cheer)
        arm_lift = min(79.5, 79.0 * cheer + 1.5 * bounce)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - arm_lift))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 22.0 * cheer))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest + 10.0 * cheer)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + 4.0 * cheer)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest - 36.0 * cheer - 2.5 * sign * wave))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest + 14.0 * cheer))

        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * 7.0 * cheer + 11.0 * wave)
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * 10.0 * cheer)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_wave(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.22)
    limb_p = phase_lag(phase, 0.05)
    head_p = phase_lag(phase, 0.07)

    if 0.12 <= limb_p <= 0.88:
        wave_u = (limb_p - 0.12) / 0.76
        w_win = plateau_envelope(wave_u, ramp=0.18)
        wave_osc = math.sin(6 * math.pi * wave_u) * w_win
    else:
        wave_osc = 0.0

    sway = math.sin(2 * math.pi * phase) * env
    bounce = (math.sin(2 * math.pi * phase) ** 2) * env
    nod = math.sin(4 * math.pi * head_p) * plateau_envelope(head_p, ramp=0.18)
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.5 * bounce, sway)

    rotate_world(arm, 'Spine02', (0, 1, 0), -4.5 * env + 2.4 * sway)
    rotate_world(arm, 'Spine01', (0, 1, 0), -2.5 * env + 1.5 * sway)
    rotate_world(arm, 'Head', (0, 1, 0), 3.5 * env + 2.8 * wave_osc)
    rotate_world(arm, 'Head', (1, 0, 0), 3.5 * env + 2.5 * nod)
    rotate_world(arm, 'Head', (0, 0, 1), 6.0 * env)

    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=1.2 * env,
        drop_offset=-1.5 * env + 1.5 * sway,
        fwd_offset=-2.0 * env,
        inward_offset=2.0 * env,
        forearm_flex_offset=-5.0 * env,
        forearm_drop_offset=-2.0 * env,
    )

    raise_env = plateau_envelope(limb_p, ramp=0.24)
    rest_r = 1.0 - raise_env
    rotate_world(arm, 'RightShoulder', (0, 1, 0), 9.0 * raise_env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 10.0 * raise_env)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 62.0) * raise_env + 4.5 * wave_osc)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 28.0 * raise_env)
    rotate_local(arm, 'RightArm', (0, 1, 0), 6.0 * raise_env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-relaxed_forearm - 48.0) * raise_env)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r + 12.0 * raise_env + 13.0 * wave_osc)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r)
    rotate_local(arm, 'RightForeArm', (0, 1, 0), 14.0 * raise_env)

    rotate_world(arm, 'RightHand', (1, 0, 0), -14.0 * raise_env)
    rotate_local(arm, 'RightHand', (0, 1, 0), -8.0 * raise_env)
    rotate_world(arm, 'RightHand', (0, 1, 0), 11.0 * wave_osc)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_clap(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.17)
    limb_p = phase_lag(phase, 0.05)
    lift = plateau_envelope(limb_p, ramp=0.17)
    rest = 1.0 - lift

    if 0.14 <= limb_p <= 0.86:
        clap_u = (limb_p - 0.14) / 0.72
        clap_pulse = (math.sin(3 * math.pi * clap_u) ** 2) * lift
    else:
        clap_pulse = 0.0

    core_bounce = (math.sin(3 * math.pi * phase) ** 2) * env
    sway = math.sin(2 * math.pi * phase) * env
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.85 * core_bounce, 0.7 * sway)

    rotate_world(arm, 'Spine02', (1, 0, 0), 3.8 * core_bounce)
    rotate_world(arm, 'Spine01', (1, 0, 0), 2.0 * core_bounce)
    rotate_world(arm, 'Head', (1, 0, 0), -3.5 * clap_pulse + 3.0 * lift)
    rotate_world(arm, 'Head', (0, 1, 0), 3.5 * math.sin(4 * math.pi * phase) * lift)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (12.0 * lift + 5.0 * clap_pulse))
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm * rest + (relaxed_arm - 17.0) * lift))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 23.0 * lift)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 36.0 * lift + 14.0 * clap_pulse))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 16.0) * lift)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest + 36.0 * lift + 21.0 * clap_pulse))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest + 12.0 * lift + 2.0 * clap_pulse))

        rotate_world(arm, f'{side}Hand', (0, 0, 1), -sign * (-20.0 * lift + 8.0 * clap_pulse))
        rotate_world(arm, f'{side}Hand', (0, 1, 0), sign * (30.0 * lift + 8.0 * clap_pulse))

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_jump(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    w_crouch = window_bell(phase, 0.0, 0.34, ramp=0.45)
    if 0.20 <= phase <= 0.74:
        air_u = (phase - 0.20) / 0.54
        w_air = math.sin(math.pi * air_u) ** 2
        hop = 0.215 * w_air
    else:
        w_air = 0.0
        hop = 0.0
    w_land = window_bell(phase, 0.62, 1.0, ramp=0.45)
    arm_p = phase_lag(phase, 0.04)
    w_arm_up = window_bell(arm_p, 0.18, 0.90, ramp=0.38)
    rest_arm = 1.0 - w_arm_up

    apply_natural_stance(arm, design, weight=1.0)
    rotate_world(arm, 'Spine02', (1, 0, 0), 10.0 * w_crouch - 5.0 * w_air + 7.0 * w_land)
    rotate_world(arm, 'Spine01', (1, 0, 0), 4.5 * w_crouch - 3.0 * w_air + 3.0 * w_land)
    rotate_world(arm, 'Spine', (1, 0, 0), 3.5 * w_crouch - 2.0 * w_air + 2.5 * w_land)
    rotate_world(arm, 'Head', (1, 0, 0), 7.5 * w_crouch - 5.5 * w_air + 4.5 * w_land)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 10.0 * w_arm_up)
        arm_abduct = relaxed_arm - 4.0 * w_crouch - 3.0 * w_land - 62.0 * w_arm_up
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * arm_abduct)
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest_arm + 26.0 * w_crouch - 10.0 * w_arm_up + 12.0 * w_land)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest_arm) + sign * (8.0 * w_crouch - 6.0 * w_arm_up))

        rotate_world(
            arm,
            f'{side}ForeArm',
            (1, 0, 0),
            -relaxed_forearm * rest_arm - 8.0 * w_crouch - 12.0 * w_arm_up - 10.0 * w_land,
        )
        rotate_world(
            arm,
            f'{side}ForeArm',
            (0, 1, 0),
            sign * (relaxed_forearm_drop * rest_arm - 3.0 * w_crouch - 12.0 * w_arm_up),
        )
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest_arm))
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * (-10.0 * w_crouch + 14.0 * w_arm_up))

        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), -sign * (4.0 * w_crouch + 11.0 * w_air + 3.5 * w_land))
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -28.0 * w_crouch - 22.0 * w_air - 20.0 * w_land)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 42.0 * w_crouch + 36.0 * w_air + 32.0 * w_land)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -14.0 * w_crouch + 10.0 * w_air - 12.0 * w_land)

    return apply_floor_and_hop(arm, mesh, hop)


def pose_finale(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.16)
    limb_p = phase_lag(phase, 0.04)
    limb_env = plateau_envelope(limb_p, ramp=0.16)

    beat_core = math.sin(6 * math.pi * phase) * env
    beat_limb = math.sin(6 * math.pi * limb_p) * limb_env
    left_up = ((1.0 + math.sin(6 * math.pi * limb_p)) * 0.5) * limb_env
    right_up = ((1.0 - math.sin(6 * math.pi * limb_p)) * 0.5) * limb_env
    left_step = (max(0.0, math.sin(6 * math.pi * phase)) ** 1.6) * env
    right_step = (max(0.0, -math.sin(6 * math.pi * phase)) ** 1.6) * env
    pulse = (math.sin(6 * math.pi * phase) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    rotate_world(arm, 'Hips', (0, 1, 0), -11.0 * beat_core)
    rotate_world(arm, 'Hips', (0, 0, 1), 14.0 * beat_core)

    rotate_world(arm, 'Spine02', (0, 1, 0), 5.0 * beat_core)
    rotate_world(arm, 'Spine02', (0, 0, 1), -6.0 * beat_core)
    rotate_world(arm, 'Spine02', (1, 0, 0), -3.0 * pulse)
    rotate_world(arm, 'Spine01', (0, 1, 0), 4.0 * beat_core)
    rotate_world(arm, 'Spine01', (0, 0, 1), -5.5 * beat_core)
    rotate_world(arm, 'Spine', (0, 1, 0), 4.0 * beat_core)
    rotate_world(arm, 'Spine', (0, 0, 1), -4.5 * beat_core)

    for side, sign, high, low in [
        ('Left', 1, left_up, right_up),
        ('Right', -1, right_up, left_up),
    ]:
        rest_arm = 1.0 - limb_env
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (7.0 * high - 1.5 * low))
        arm_lift = 68.0 * high + 2.0 * low
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - arm_lift))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest_arm + 12.0 * high + 6.0 * low))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest_arm - 10.0 * high - 8.0 * low)

        rotate_world(
            arm,
            f'{side}ForeArm',
            (1, 0, 0),
            -relaxed_forearm * rest_arm - 10.0 * high - 28.0 * low,
        )
        rotate_world(
            arm,
            f'{side}ForeArm',
            (0, 1, 0),
            sign * (relaxed_forearm_drop * (1.0 - high) - 42.0 * high + 2.0 * low),
        )
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest_arm + 8.0 * high + 16.0 * low))

        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * (14.0 * high - 6.0 * low))
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * high - 6.0 * low)

    for side, sign, lift, planted in [
        ('Left', 1, left_step, right_step),
        ('Right', -1, right_step, left_step),
    ]:
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 9.0 * beat_core - sign * (10.0 * lift + 4.0 * planted))
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -10.0 * beat_core)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -30.0 * lift - 6.0 * pulse)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 40.0 * lift + 10.0 * pulse)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -12.0 * lift - 4.0 * pulse)

    rotate_world(arm, 'neck', (0, 1, 0), 3.5 * beat_limb)
    rotate_world(arm, 'neck', (0, 0, 1), -4.5 * beat_limb)
    rotate_world(arm, 'Head', (0, 1, 0), 6.5 * beat_limb)
    rotate_world(arm, 'Head', (0, 0, 1), -9.0 * beat_limb)
    rotate_world(arm, 'Head', (1, 0, 0), -7.5 * pulse + 3.5 * env)

    hop = 0.085 * pulse
    return apply_floor_and_hop(arm, mesh, hop)


def pose_idle(arm, mesh, phase, design):
    reset_pose(arm)
    # Continuous C^infinity loop with warm standing stance & arms hanging naturally close to sides
    p_arm = phase_lag(phase, 0.06, loop=True)
    p_head = phase_lag(phase, 0.09, loop=True)

    sway = math.sin(2.0 * math.pi * phase)
    inhale = 0.5 * (1.0 - math.cos(2.0 * math.pi * phase))
    arm_inhale = 0.5 * (1.0 - math.cos(2.0 * math.pi * p_arm))
    arm_sway = math.sin(2.0 * math.pi * p_arm)
    curiosity = math.sin(2.0 * math.pi * p_head)
    nod = 0.5 * (1.0 - math.cos(4.0 * math.pi * p_head))
    knee_bob = 0.5 * (1.0 - math.cos(4.0 * math.pi * phase))

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.45 * knee_bob, 0.9 * sway)

    rotate_world(arm, 'Spine02', (0, 1, 0), 3.6 * sway)
    rotate_world(arm, 'Spine02', (1, 0, 0), -3.2 * inhale)
    rotate_world(arm, 'Spine01', (0, 1, 0), 2.4 * sway)
    rotate_world(arm, 'Spine01', (1, 0, 0), -2.2 * inhale)
    rotate_world(arm, 'Spine', (0, 1, 0), 1.6 * sway)
    rotate_world(arm, 'Spine', (1, 0, 0), -1.6 * inhale)

    rotate_world(arm, 'Head', (0, 1, 0), 7.5 * curiosity)
    rotate_world(arm, 'Head', (0, 0, 1), -6.5 * curiosity)
    rotate_world(arm, 'Head', (1, 0, 0), -3.0 * inhale + 5.2 * nod)

    for side, sign in [('Left', 1), ('Right', -1)]:
        apply_relaxed_arm(
            arm,
            side,
            sign,
            design,
            weight=1.0,
            shoulder_lift=2.5 * arm_inhale,
            drop_offset=-2.5 - 1.5 * arm_inhale - 1.5 * max(0.0, sign * arm_sway),
            fwd_offset=-3.0 - 2.0 * arm_inhale + 2.5 * sign * arm_sway,
            inward_offset=0.0,
            forearm_flex_offset=-4.5 * arm_inhale + 2.0 * sign * arm_sway,
            forearm_drop_offset=-2.5 - 1.5 * arm_inhale,
            forearm_inward_offset=0.0,
            hand_z_offset=4.0 * arm_inhale,
        )

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_idle_breathe(arm, mesh, phase, design):
    reset_pose(arm)
    # Default living idle played after one-shots finish: soft stance + breathing + gentle curiosity
    p_arm = phase_lag(phase, 0.06, loop=True)
    p_head = phase_lag(phase, 0.10, loop=True)

    sway = math.sin(2.0 * math.pi * phase)
    inhale = 0.5 * (1.0 - math.cos(2.0 * math.pi * phase))
    arm_inhale = 0.5 * (1.0 - math.cos(2.0 * math.pi * p_arm))
    arm_sway = math.sin(2.0 * math.pi * p_arm)
    head_look = math.sin(2.0 * math.pi * p_head)
    head_nod = 0.5 * (1.0 - math.cos(4.0 * math.pi * p_head))
    knee_pulse = 0.5 * (1.0 - math.cos(4.0 * math.pi * phase))

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.35 * knee_pulse, 0.75 * sway)

    rotate_world(arm, 'Spine02', (0, 1, 0), 3.0 * sway)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.8 * inhale)
    rotate_world(arm, 'Spine01', (0, 1, 0), 2.0 * sway)
    rotate_world(arm, 'Spine01', (1, 0, 0), -2.0 * inhale)
    rotate_world(arm, 'Spine', (0, 1, 0), 1.4 * sway)
    rotate_world(arm, 'Spine', (1, 0, 0), -1.4 * inhale)

    rotate_world(arm, 'Head', (0, 1, 0), 6.2 * head_look)
    rotate_world(arm, 'Head', (0, 0, 1), -7.0 * head_look)
    rotate_world(arm, 'Head', (1, 0, 0), -2.8 * inhale + 4.4 * head_nod)

    for side, sign in [('Left', 1), ('Right', -1)]:
        apply_relaxed_arm(
            arm,
            side,
            sign,
            design,
            weight=1.0,
            shoulder_lift=2.0 * arm_inhale,
            drop_offset=-2.5 - 1.2 * arm_inhale - 1.2 * max(0.0, sign * arm_sway),
            fwd_offset=-3.0 - 1.8 * arm_inhale + 2.2 * sign * arm_sway,
            inward_offset=0.0,
            forearm_flex_offset=-3.8 * arm_inhale + 1.5 * sign * arm_sway,
            forearm_drop_offset=-2.5 - 1.5 * arm_inhale,
            forearm_inward_offset=0.0,
            hand_z_offset=3.2 * arm_inhale,
        )

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_search(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.19)
    scan_p = phase_lag(phase, 0.05)
    scan_env = plateau_envelope(scan_p, ramp=0.19)
    rest_r = 1.0 - scan_env

    if 0.14 <= scan_p <= 0.86:
        scan_u = (scan_p - 0.14) / 0.72
        scan_win = plateau_envelope(scan_u, ramp=0.18)
        scan = math.sin(4 * math.pi * scan_u) * scan_win * scan_env
    else:
        scan = 0.0
    torso_scan = math.sin(4 * math.pi * phase) * env if 0.10 <= phase <= 0.85 else 0.0
    nod = math.sin(4 * math.pi * scan_p) * scan_env
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.45 * abs(torso_scan), 0.7 * torso_scan)

    rotate_world(arm, 'Spine02', (1, 0, 0), 5.0 * env)
    rotate_world(arm, 'Spine02', (0, 0, 1), 8.0 * scan)
    rotate_world(arm, 'Spine01', (1, 0, 0), 3.0 * env)
    rotate_world(arm, 'Spine01', (0, 0, 1), 4.0 * scan)

    rotate_world(arm, 'Head', (0, 0, 1), 20.0 * scan)
    rotate_world(arm, 'Head', (1, 0, 0), -2.5 * env + 1.5 * nod)
    rotate_world(arm, 'Head', (0, 1, 0), -2.0 * scan)

    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=1.2 * env,
        drop_offset=-2.0 * env - 1.5 * scan,
        fwd_offset=6.0 * env,
        inward_offset=3.0 * env + 2.0 * scan,
        forearm_flex_offset=-6.0 * env,
        forearm_drop_offset=-2.0 * env,
    )

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 4.0 * scan_env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 24.0 * scan_env + 2.0 * scan)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 22.0) * scan_env + 2.0 * scan)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 42.0 * scan_env + 4.0 * scan)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r - 26.0 * scan_env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-relaxed_forearm - 32.0) * scan_env)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r + 16.0 * scan_env + 12.0 * scan)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r - 10.0 * scan_env)

    rotate_world(arm, 'RightHand', (0, 1, 0), 10.0 * scan_env)
    rotate_world(arm, 'RightHand', (0, 0, 1), 6.0 * scan)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_think(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.18)
    s_aha = smooth5((phase - 0.38) / 0.28) if phase > 0.38 else 0.0

    w_think = env * (1.0 - s_aha)
    w_aha = env * s_aha
    rest_r = max(0.0, 1.0 - w_think - w_aha)

    limb_p = phase_lag(phase, 0.04)
    tap = window_bell(limb_p, 0.14, 0.52, ramp=0.22) * (math.sin(3 * math.pi * ((limb_p - 0.14) / 0.38)) ** 2) * w_think if 0.14 <= limb_p <= 0.52 else 0.0
    aha_nod = window_bell(limb_p, 0.64, 0.94, ramp=0.25) * math.sin(4 * math.pi * ((limb_p - 0.64) / 0.30)) * w_aha if 0.64 <= limb_p <= 0.94 else 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.55 * w_aha, 0.9 * w_think - 0.6 * w_aha)

    rotate_world(arm, 'Spine02', (1, 0, 0), -4.0 * w_aha)
    rotate_world(arm, 'Spine02', (0, 1, 0), 3.0 * w_think)
    rotate_world(arm, 'Spine01', (1, 0, 0), -2.0 * w_aha)

    rotate_world(arm, 'Head', (0, 1, 0), 16.0 * w_think)
    rotate_world(arm, 'Head', (1, 0, 0), 8.0 * w_think + 1.5 * tap - 6.0 * w_aha + 5.0 * aha_nod)
    rotate_world(arm, 'Head', (0, 0, 1), 4.0 * w_think)

    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=1.5 * w_think + 2.5 * w_aha,
        drop_offset=-2.0 * w_think - 2.5 * w_aha,
        fwd_offset=-2.0 * w_think - 4.0 * w_aha,
        inward_offset=2.0 * w_think + 4.0 * w_aha,
        forearm_flex_offset=-4.0 * w_think - 8.0 * w_aha,
        forearm_drop_offset=-2.0 * w_think - 3.0 * w_aha,
    )

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 4.0 * w_think + 12.0 * w_aha)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 24.0 * w_think + 4.0 * w_aha)

    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 26.0) * w_think + (-relaxed_arm + 68.0 + 3.0 * aha_nod) * w_aha)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 54.0 * w_think + 6.0 * w_aha)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r - 18.0 * w_think - 12.0 * w_aha)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-30.0 - 6.0 * tap) * w_think + (-34.0 - 4.0 * aha_nod) * w_aha)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r + (50.0 + 6.0 * tap) * w_think - 4.0 * w_aha)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r - 6.0 * w_think + 26.0 * w_aha)

    rotate_world(arm, 'RightHand', (0, 1, 0), (6.0 + 9.0 * tap) * w_think + 16.0 * w_aha)
    rotate_world(arm, 'RightHand', (0, 0, 1), (-24.0 + 5.0 * tap) * w_think)
    rotate_world(arm, 'RightHand', (1, 0, 0), (-24.0 - 5.0 * tap) * w_think - 10.0 * w_aha)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_listen(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.19)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.19)
    rest_r = 1.0 - limb_env

    nod = window_bell(limb_p, 0.16, 0.84, ramp=0.20) * (math.sin(3 * math.pi * ((limb_p - 0.16) / 0.68)) ** 2) if 0.16 <= limb_p <= 0.84 else 0.0
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    # Attentive torso lean + forward-tucked elbow cupping behind ear; left arm hangs relaxed at side
    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.45 * nod, -0.8 * env)

    rotate_world(arm, 'Spine02', (1, 0, 0), 7.5 * env + 2.0 * nod)
    rotate_world(arm, 'Spine01', (1, 0, 0), 4.0 * env + 1.0 * nod)
    rotate_world(arm, 'Spine02', (0, 0, 1), 10.0 * env)
    rotate_world(arm, 'Spine01', (0, 0, 1), 5.0 * env)

    rotate_world(arm, 'Head', (0, 0, 1), 18.0 * env)
    rotate_world(arm, 'Head', (0, 1, 0), 11.0 * env)
    rotate_world(arm, 'Head', (1, 0, 0), -2.0 * env + 7.5 * nod)

    if env != 0.0:
        rotate_world(arm, 'LeftShoulder', (1, 0, 0), -3.0 * env)
    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=0.0,
        drop_offset=-3.5 * env,
        fwd_offset=-3.0 * env,
        inward_offset=0.0,
        forearm_flex_offset=-4.5 * env,
        forearm_drop_offset=-2.5 * env,
    )

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 9.0 * limb_env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 16.0 * limb_env)

    # Bring elbow closer in front (~28 deg Z, -32 deg X) so forearm cups near ear naturally without sticking out
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 30.0) * limb_env - 3.0 * nod)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 28.0 * limb_env + 3.0 * nod)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r - 32.0 * limb_env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-relaxed_forearm - 42.0) * limb_env + 4.5 * nod)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r + 14.0 * limb_env - 2.5 * nod)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r + 18.0 * limb_env)

    rotate_world(arm, 'RightHand', (1, 0, 0), -10.0 * limb_env)
    rotate_world(arm, 'RightHand', (0, 1, 0), 12.0 * limb_env)
    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_encourage(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.17)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.17)
    rest = 1.0 - limb_env
    pump = window_bell(limb_p, 0.14, 0.86, ramp=0.20) * (math.sin(2 * math.pi * ((limb_p - 0.14) / 0.72)) ** 2) if 0.14 <= limb_p <= 0.86 else 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    # Tucked elbows at ribs & forward warm paw pumps
    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.7 * env + 0.65 * pump, 0.0)

    rotate_world(arm, 'Spine02', (1, 0, 0), 5.5 * env + 4.5 * pump)
    rotate_world(arm, 'Spine01', (1, 0, 0), 3.0 * env + 2.5 * pump)
    rotate_world(arm, 'Head', (1, 0, 0), 2.5 * env + 10.0 * pump)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (3.0 * limb_env + 4.5 * pump))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (8.0 * limb_env + 2.0 * pump))

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 6.5 * limb_env - 2.5 * pump))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 28.0 * limb_env - 16.0 * pump)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 14.0 * limb_env + 4.0 * pump))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 48.0) * limb_env - 14.0 * pump)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest + 8.0 * limb_env - 2.0 * pump))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest + 16.0 * limb_env + 4.0 * pump))

        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * limb_env - 8.0 * pump)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), sign * 12.0 * limb_env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_shrug(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.22)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.22)
    rest = 1.0 - limb_env
    shrug_pulse = window_bell(limb_p, 0.14, 0.86, ramp=0.28) * (math.sin(math.pi * ((limb_p - 0.14) / 0.72)) ** 2) if 0.14 <= limb_p <= 0.86 else 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    # Raised shoulders, elbows tucked close to ribs, warm upturned open palms forward
    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.60 * env + 0.40 * shrug_pulse, -0.7 * env)

    rotate_world(arm, 'Spine02', (1, 0, 0), -3.0 * env)
    rotate_world(arm, 'Spine02', (0, 1, 0), -2.5 * env)
    rotate_world(arm, 'Head', (0, 1, 0), 4.5 * env + 2.0 * shrug_pulse)
    rotate_world(arm, 'Head', (1, 0, 0), -2.5 * env)
    rotate_world(arm, 'Head', (0, 0, 1), -5.0 * env)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (6.0 * limb_env + 3.0 * shrug_pulse))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * 4.0 * limb_env)

        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 3.5 * limb_env - 1.5 * shrug_pulse))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 14.0 * limb_env)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 4.0 * limb_env))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 42.0) * limb_env - 8.0 * shrug_pulse)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest + 2.0 * limb_env))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest) + sign * (10.0 * limb_env + 4.0 * shrug_pulse))
        rotate_local(arm, f'{side}ForeArm', (0, 1, 0), -sign * 24.0 * limb_env)

        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * limb_env - 5.0 * shrug_pulse)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * 10.0 * limb_env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_flex(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.27)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.27)
    rest = 1.0 - limb_env
    rest_legs = 1.0 - env
    pulse = window_bell(limb_p, 0.22, 0.78, ramp=0.22) * (math.sin(3 * math.pi * ((limb_p - 0.22) / 0.56)) ** 2) if 0.22 <= limb_p <= 0.78 else 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    rotate_world(arm, 'Spine02', (1, 0, 0), -8.0 * env - 2.0 * pulse)
    rotate_world(arm, 'Spine01', (1, 0, 0), -5.0 * env - 1.5 * pulse)
    rotate_world(arm, 'Head', (1, 0, 0), -2.0 * env + 7.0 * pulse)

    for side, sign in [('Left', 1), ('Right', -1)]:
        # Heroic wide planted stance blending from natural relaxed stance
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -sign * (1.4 * rest_legs + 4.0 * env))
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), -sign * 11.0 * env)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.0 * rest_legs - 16.0 * env - 3.0 * pulse)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 7.0 * rest_legs + 22.0 * env + 4.0 * pulse)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -3.0 * rest_legs - 6.0 * env - 1.0 * pulse)

        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (1.6 * rest_legs + 8.0 * limb_env + 1.5 * pulse))
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 58.0 * limb_env - 3.5 * pulse))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 4.0 * limb_env))
        rotate_local(arm, f'{side}Arm', (0, 1, 0), sign * 62.0 * limb_env)

        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest - 46.0 * limb_env - 15.0 * pulse))
        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 12.0 * limb_env)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * 4.0 * rest)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * (10.0 * limb_env + 8.0 * pulse))

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_bow(arm, mesh, phase, design):
    reset_pose(arm)
    bow_env = window_bell(phase, 0.06, 0.94, ramp=0.30)
    leg_env = window_bell(phase, 0.06, 0.94, ramp=0.20)
    rest_bow = 1.0 - bow_env
    rest_leg = 1.0 - leg_env
    limb_p = phase_lag(phase, 0.05)
    sweep_u = max(0.0, min(1.0, (limb_p - 0.14) / 0.72)) if 0.14 <= limb_p <= 0.86 else 0.0
    sweep = math.sin(2 * math.pi * sweep_u) * plateau_envelope(sweep_u, ramp=0.20) * plateau_envelope(limb_p, ramp=0.20)
    flourish = math.sin(2 * math.pi * limb_p) * plateau_envelope(limb_p, ramp=0.20)

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    rotate_world(arm, 'Spine02', (1, 0, 0), 16.0 * bow_env)
    rotate_world(arm, 'Spine02', (0, 0, 1), -4.0 * bow_env - 3.0 * sweep)
    rotate_world(arm, 'Spine01', (1, 0, 0), 14.0 * bow_env)
    rotate_world(arm, 'Spine', (1, 0, 0), 11.0 * bow_env)
    rotate_world(arm, 'Head', (1, 0, 0), 16.0 * bow_env)
    rotate_world(arm, 'Head', (0, 1, 0), 3.0 * flourish)

    # Balanced bow hinge blending smoothly from natural relaxed stance (hips counterbalance slightly earlier)
    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -sign * 1.4 * rest_leg)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.0 * rest_leg + 6.0 * leg_env)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 7.0 * rest_leg - 4.0 * leg_env)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -3.0 * rest_leg - 2.0 * leg_env)

    limb_env = plateau_envelope(limb_p, ramp=0.20)
    rest_l = 1.0 - limb_env
    rotate_world(arm, 'RightShoulder', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'RightShoulder', (0, 1, 0), 1.6 * rest_bow + (6.0 + 4.0 * sweep) * limb_env)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), (8.0 + 6.0 * sweep) * limb_env)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_l + (-relaxed_arm + 34.0) * limb_env + 12.0 * sweep)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_l + 18.0 * limb_env + 12.0 * sweep)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_l - 14.0 * limb_env - 8.0 * bow_env - 10.0 * sweep)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_l + (-relaxed_forearm - 22.0) * limb_env - 8.0 * sweep)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_l + 16.0 * limb_env + 12.0 * sweep)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_l)
    rotate_world(arm, 'RightHand', (0, 0, 1), -10.0 * limb_env - 10.0 * sweep)
    rotate_world(arm, 'RightHand', (1, 0, 0), -8.0 * limb_env + 8.0 * flourish)

    rotate_world(arm, 'LeftShoulder', (1, 0, 0), 8.0 * bow_env)
    rotate_world(arm, 'LeftShoulder', (0, 1, 0), -1.6 * rest_bow)
    rotate_world(arm, 'LeftShoulder', (0, 0, 1), -8.0 * bow_env)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm * rest_bow + (relaxed_arm - 6.0) * bow_env + 2.0 * sweep)
    rotate_world(arm, 'LeftArm', (1, 0, 0), -4.0 * rest_bow - 24.0 * bow_env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -4.0 * rest_bow - 24.0 * bow_env)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm * rest_bow + (-relaxed_forearm - 24.0) * bow_env)
    rotate_world(arm, 'LeftForeArm', (0, 0, 1), -4.0 * rest_bow - 48.0 * bow_env)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), relaxed_forearm_drop * rest_bow + 10.0 * bow_env)
    rotate_world(arm, 'LeftHand', (0, 1, 0), 10.0 * bow_env + 4.0 * flourish)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_march(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.22)
    limb_p = phase_lag(phase, 0.04)
    limb_env = plateau_envelope(limb_p, ramp=0.22)
    rest_l = 1.0 - limb_env

    m_wave = math.sin(6 * math.pi * phase) * env
    limb_wave = math.sin(6 * math.pi * limb_p) * limb_env
    step_pulse = (math.sin(6 * math.pi * phase) ** 2) * env
    left_lift = (max(0.0, math.sin(6 * math.pi * phase)) ** 2) * env
    right_lift = (max(0.0, -math.sin(6 * math.pi * phase)) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    rotate_world(arm, 'Hips', (0, 0, 1), -5.0 * m_wave)
    rotate_world(arm, 'Spine02', (0, 0, 1), 4.0 * m_wave)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.5 * step_pulse)
    rotate_world(arm, 'Spine01', (0, 0, 1), 3.0 * m_wave)
    rotate_world(arm, 'Spine', (0, 0, 1), 2.0 * m_wave)
    rotate_world(arm, 'Head', (0, 1, 0), 5.0 * limb_wave)
    rotate_world(arm, 'Head', (1, 0, 0), -4.0 * step_pulse + 2.0 * env)

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 8.0 * limb_env + 4.0 * limb_wave)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_l + (-relaxed_arm + 38.0) * limb_env + 18.0 * limb_wave)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_l + 24.0 * limb_env - 12.0 * limb_wave)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_l - 20.0 * limb_env + 8.0 * limb_wave)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_l + (-relaxed_forearm - 38.0) * limb_env + 6.0 * limb_wave)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_l + 20.0 * limb_env + 22.0 * limb_wave)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_l)
    rotate_world(arm, 'RightHand', (0, 1, 0), 14.0 * limb_wave)
    rotate_world(arm, 'RightHand', (1, 0, 0), -10.0 * limb_env + 6.0 * limb_wave)

    # Tucked counter-swinging left arm close to side instead of splaying out
    rotate_world(arm, 'LeftShoulder', (0, 0, 1), -4.0 * limb_env - 6.0 * limb_wave)
    rotate_world(arm, 'LeftArm', (0, 1, 0), relaxed_arm - 4.0 * limb_env)
    rotate_world(arm, 'LeftArm', (1, 0, 0), -4.0 * rest_l - 28.0 * limb_wave - 6.0 * limb_env)
    rotate_world(arm, 'LeftArm', (0, 0, 1), -4.0 * rest_l - 12.0 * limb_env - 8.0 * limb_wave)
    rotate_world(arm, 'LeftForeArm', (1, 0, 0), -relaxed_forearm - 24.0 * limb_env - 14.0 * limb_wave)
    rotate_world(arm, 'LeftForeArm', (0, 1, 0), relaxed_forearm_drop - 6.0 * limb_env)
    rotate_world(arm, 'LeftForeArm', (0, 0, 1), -4.0 * rest_l - 12.0 * limb_env)
    rotate_world(arm, 'LeftHand', (1, 0, 0), -8.0 * limb_wave)

    for side, sign, lift in [('Left', 1, left_lift), ('Right', -1, right_lift)]:
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), -sign * 5.0 * lift)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -30.0 * lift)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 40.0 * lift)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -12.0 * lift)

    return apply_floor_and_hop(arm, mesh, 0.03 * step_pulse)


def pose_wiggle(arm, mesh, phase, design):
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.18)
    limb_p = phase_lag(phase, 0.025)
    limb_env = plateau_envelope(limb_p, ramp=0.18)
    rest_l = 1.0 - limb_env

    w = math.sin(6 * math.pi * phase) * env
    w_limb = math.sin(6 * math.pi * limb_p) * limb_env
    pulse = (math.sin(6 * math.pi * phase) ** 2) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    rotate_world(arm, 'Hips', (0, 1, 0), -13.0 * w)
    rotate_world(arm, 'Hips', (0, 0, 1), 15.0 * w)

    rotate_world(arm, 'Spine02', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine02', (0, 0, 1), -6.0 * w)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.5 * pulse)
    rotate_world(arm, 'Spine01', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine01', (0, 0, 1), -6.0 * w)
    rotate_world(arm, 'Spine', (0, 1, 0), 5.0 * w)
    rotate_world(arm, 'Spine', (0, 0, 1), -6.0 * w)

    rotate_world(arm, 'neck', (0, 1, 0), 3.0 * w_limb)
    rotate_world(arm, 'Head', (0, 1, 0), 6.0 * w_limb)
    rotate_world(arm, 'Head', (0, 0, 1), -8.0 * w_limb)
    rotate_world(arm, 'Head', (1, 0, 0), -4.0 * pulse + 3.0 * env)

    for side, sign in [('Left', 1), ('Right', -1)]:
        shake = sign * w_limb
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 8.0 * limb_env)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 38.0 * limb_env - 5.0 * env) + 4.5 * w_limb)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest_l + 26.0 * limb_env))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest_l - 22.0 * limb_env + 6.0 * shake)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest_l + (-relaxed_forearm - 38.0) * limb_env + 8.0 * shake)
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest_l + 20.0 * limb_env))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest_l * (1.0 - 0.5 * env) - 16.0 * limb_env) + 5.0 * w_limb)

        rotate_world(arm, f'{side}Hand', (1, 0, 0), 10.0 * shake)
        rotate_world(arm, f'{side}Hand', (0, 1, 0), 5.0 * w_limb)

        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 9.0 * w)
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -10.0 * w)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -5.0 * pulse)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 8.0 * pulse)
        rotate_world(arm, f'{side}Foot', (0, 1, 0), -3.0 * w)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_peekaboo(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    if 0.0 < phase < 0.22:
        w_hide = smooth5(phase / 0.22)
    elif 0.22 <= phase <= 0.34:
        w_hide = 1.0
    elif 0.34 < phase < 0.56:
        w_hide = smooth5((0.56 - phase) / 0.22)
    else:
        w_hide = 0.0

    if 0.34 < phase < 0.56:
        w_peek = 1.0 - w_hide
    elif 0.56 <= phase <= 0.78:
        w_peek = 1.0
    elif 0.78 < phase < 1.0:
        w_peek = smooth5((1.0 - phase) / 0.22)
    else:
        w_peek = 0.0

    w_rest = max(0.0, 1.0 - w_hide - w_peek)

    limb_p = phase_lag(phase, 0.04)
    hide_sway = window_bell(limb_p, 0.14, 0.44, ramp=0.25) * math.sin(2.0 * math.pi * ((limb_p - 0.14) / 0.30)) * w_hide if 0.14 <= limb_p <= 0.44 else 0.0
    peek_nod = window_bell(limb_p, 0.50, 0.86, ramp=0.25) * (math.sin(2.0 * math.pi * ((limb_p - 0.50) / 0.36)) ** 2) * w_peek if 0.50 <= limb_p <= 0.86 else 0.0
    peek_tilt = window_bell(limb_p, 0.50, 0.86, ramp=0.25) * math.sin(2.0 * math.pi * ((limb_p - 0.50) / 0.36)) * w_peek if 0.50 <= limb_p <= 0.86 else 0.0

    yaw_deg = 8.0 * hide_sway
    yaw_rad = math.radians(yaw_deg)
    ax_x = (math.cos(yaw_rad), math.sin(yaw_rad), 0.0)
    ax_y = (-math.sin(yaw_rad), math.cos(yaw_rad), 0.0)

    apply_natural_stance(arm, design, weight=w_rest)
    if yaw_deg != 0.0:
        rotate_world(arm, 'Spine02', (0, 0, 1), yaw_deg)
    rotate_world(arm, 'Spine02', ax_x, -4.8 * w_hide + 4.0 * w_peek)
    rotate_world(arm, 'Spine01', ax_x, -3.2 * w_hide + 2.0 * w_peek)
    rotate_world(arm, 'Head', ax_x, 12.0 * w_hide - 6.0 * w_peek + 7.0 * peek_nod)
    rotate_world(arm, 'Head', ax_y, 5.0 * peek_tilt)

    # Playful crouch during hide -> joyful forward bent-elbow surprise on peek (no horizontal T-pose!)
    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -16.0 * w_hide - 4.0 * w_peek)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 26.0 * w_hide + 6.0 * w_peek)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -10.0 * w_hide - 2.0 * w_peek)

        rotate_world(arm, f'{side}Shoulder', ax_y, -sign * (-2.0 * w_hide + 4.0 * w_peek))
        rotate_world(arm, f'{side}Shoulder', (0, 0, 1), -sign * (26.0 * w_hide + 4.0 * w_peek))

        rotate_world(arm, f'{side}Arm', ax_y, sign * (relaxed_arm - 60.0 * w_hide - 40.0 * w_peek))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * w_rest + 46.0 * w_hide + 18.0 * w_peek))
        rotate_world(arm, f'{side}Arm', ax_x, -4.0 * w_rest - 30.0 * w_hide - 24.0 * w_peek)

        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * w_rest + 28.0 * w_hide + 4.0 * w_peek))
        rotate_world(arm, f'{side}ForeArm', ax_y, sign * (relaxed_forearm_drop * w_rest - 28.0 * w_hide - 14.0 * w_peek))
        rotate_world(arm, f'{side}ForeArm', ax_x, -relaxed_forearm * w_rest - 22.0 * w_hide - 44.0 * w_peek)

        rotate_world(arm, f'{side}Hand', (0, 0, 1), -sign * (18.0 * w_hide - 10.0 * w_peek))
        rotate_world(arm, f'{side}Hand', ax_y, -sign * (10.0 * w_hide - 8.0 * w_peek))

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_stretch(arm, mesh, phase, design):
    reset_pose(arm)
    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    if 0.0 < phase < 0.24:
        w_stretch = smooth5(phase / 0.24)
    elif 0.24 <= phase <= 0.44:
        w_stretch = 1.0
    elif 0.44 < phase < 0.68:
        w_stretch = smooth5((0.68 - phase) / 0.24)
    else:
        w_stretch = 0.0

    if 0.44 < phase < 0.68:
        w_release = 1.0 - w_stretch
    elif 0.68 <= phase <= 0.74:
        w_release = 1.0
    elif 0.74 < phase < 1.0:
        w_release = smooth5((1.0 - phase) / 0.26)
    else:
        w_release = 0.0

    w_rest = max(0.0, 1.0 - w_stretch - w_release)

    limb_p = phase_lag(phase, 0.04)
    sway = window_bell(limb_p, 0.14, 0.50, ramp=0.24) * math.sin(2.0 * math.pi * ((limb_p - 0.14) / 0.36)) * w_stretch if 0.14 <= limb_p <= 0.50 else 0.0
    sigh_nod = window_bell(limb_p, 0.52, 0.88, ramp=0.25) * math.sin(math.pi * ((limb_p - 0.52) / 0.36)) * w_release if 0.52 <= limb_p <= 0.88 else 0.0

    apply_natural_stance(arm, design, weight=w_rest)
    rotate_world(arm, 'Spine02', (1, 0, 0), -10.0 * w_stretch + 5.0 * sigh_nod)
    if sway != 0.0:
        rotate_world(arm, 'Spine02', (0, 1, 0), 1.7 * sway)
    rotate_world(arm, 'Spine01', (1, 0, 0), -6.0 * w_stretch + 3.0 * sigh_nod)
    if sway != 0.0:
        rotate_world(arm, 'Spine01', (0, 1, 0), 0.8 * sway)
    rotate_world(arm, 'Spine', (1, 0, 0), -4.0 * w_stretch + 2.0 * sigh_nod)
    rotate_world(arm, 'Head', (1, 0, 0), -14.0 * w_stretch + 8.0 * sigh_nod)

    for side, sign in [('Left', 1), ('Right', -1)]:
        # Gentle toe rise during peak stretch, cushioned knee release down to relaxed standing sides
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -4.0 * (w_rest + w_release) + 3.0 * w_stretch - 8.0 * w_release)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 7.0 * (w_rest + w_release) - 2.0 * w_stretch + 14.0 * w_release)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -3.0 * (w_rest + w_release) + 10.0 * w_stretch - 6.0 * w_release)

        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * (9.0 * w_stretch + 0.5 * w_release))

        # Overhead stretch (-62 deg) lowers smoothly all the way down to relaxed sides (+15 deg on exhale, +17 deg rest)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 79.0 * w_stretch - 2.0 * w_release))
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * (w_rest + w_release) + 18.0 * w_stretch + 2.0 * w_release))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * (w_rest + w_release) + 12.0 * w_stretch - 4.0 * w_release)

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * (w_rest + w_release) + 4.0 * w_stretch - 6.0 * w_release)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * (w_rest + w_release) - 30.0 * w_stretch - 2.0 * w_release))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * (w_rest + w_release) + 10.0 * w_stretch + 2.0 * w_release))

        rotate_world(arm, f'{side}Hand', (0, 1, 0), -sign * (6.0 * w_stretch))
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -8.0 * w_stretch - 4.0 * w_release)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_walk(arm, mesh, phase, design):
    """Seamless C^infinity teddy bear waddle-walk cycle with natural side-hanging arm swing."""
    reset_pose(arm)
    p_arm = phase_lag(phase, 0.06, loop=True)
    p_head = phase_lag(phase, 0.08, loop=True)

    step = math.sin(2.0 * math.pi * phase)
    step_cos = math.cos(2.0 * math.pi * phase)
    arm_swing = math.sin(2.0 * math.pi * p_arm)
    bob = 0.5 * (1.0 - math.cos(4.0 * math.pi * phase))
    head_bob = 0.5 * (1.0 - math.cos(4.0 * math.pi * p_head))
    head_sway = math.sin(2.0 * math.pi * p_head)

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    # Jaunty teddy waddle in Hips + spine counter-twist
    rotate_world(arm, 'Hips', (0, 1, 0), -4.5 * step)
    rotate_world(arm, 'Hips', (0, 0, 1), 7.5 * step)
    rotate_world(arm, 'Hips', (1, 0, 0), 3.0 + 2.0 * bob)

    rotate_world(arm, 'Spine02', (0, 1, 0), 3.5 * step)
    rotate_world(arm, 'Spine02', (0, 0, 1), -5.0 * step)
    rotate_world(arm, 'Spine02', (1, 0, 0), -2.0 * bob)
    rotate_world(arm, 'Spine01', (0, 1, 0), 2.5 * step)
    rotate_world(arm, 'Spine01', (0, 0, 1), -4.0 * step)
    rotate_world(arm, 'Spine', (0, 1, 0), 2.0 * step)
    rotate_world(arm, 'Spine', (0, 0, 1), -3.0 * step)

    rotate_world(arm, 'Head', (0, 1, 0), -2.5 * head_sway)
    rotate_world(arm, 'Head', (0, 0, 1), -3.5 * head_sway)
    rotate_world(arm, 'Head', (1, 0, 0), -2.0 + 4.5 * head_bob)

    # Natural counter-swinging arms hanging close to sides (upper ~33 deg, forearm ~19 deg)
    for side, sign in [('Left', 1), ('Right', -1)]:
        fwd = sign * arm_swing
        fwd_smooth = 0.5 * (1.0 + fwd)
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 1.6)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 6.8 - 2.0 * (fwd ** 2)))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 - 20.0 * fwd)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 + 3.0 * fwd))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm - 2.0 - 14.0 * (fwd_smooth ** 2))
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop - 4.0 - 2.0 * (fwd_smooth ** 2)))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 + 3.0 * fwd_smooth))
        rotate_world(arm, f'{side}Hand', (0, 0, 1), sign * 4.0)

    # Alternating stepping legs with pure C^infinity sinusoids (zero loop seam kink!)
    for side, sign, s_dir in [('Left', 1, 1.0), ('Right', -1, -1.0)]:
        leg_swing = s_dir * step
        swing_lift = 0.5 * (1.0 + s_dir * step_cos)
        push_back = 0.5 * (1.0 - leg_swing)
        rotate_world(arm, f'{side}UpLeg', (0, 1, 0), 2.5 * step)
        rotate_world(arm, f'{side}UpLeg', (0, 0, 1), -4.0 * step)
        rotate_world(arm, f'{side}UpLeg', (1, 0, 0), -6.0 - 20.0 * leg_swing - 7.0 * swing_lift)
        rotate_world(arm, f'{side}Leg', (1, 0, 0), 8.0 + 22.0 * swing_lift + 8.0 * push_back)
        rotate_world(arm, f'{side}Foot', (1, 0, 0), -4.0 - 8.0 * swing_lift + 8.0 * push_back)

    hop = 0.025 * bob
    return apply_floor_and_hop(arm, mesh, hop)


def pose_point_down(arm, mesh, phase, design):
    """Friendly downward gesture pointing toward cards below the prompt slot."""
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.18)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.18)
    rest_r = 1.0 - limb_env
    tap = window_bell(limb_p, 0.16, 0.84, ramp=0.22) * (math.sin(2 * math.pi * ((limb_p - 0.16) / 0.68)) ** 2) if 0.16 <= limb_p <= 0.84 else 0.0

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.7 * env + 0.35 * tap, -0.8 * env)

    rotate_world(arm, 'Spine02', (1, 0, 0), 9.5 * env)
    rotate_world(arm, 'Spine02', (0, 0, 1), -5.0 * env)
    rotate_world(arm, 'Spine01', (1, 0, 0), 5.5 * env)
    rotate_world(arm, 'Head', (1, 0, 0), 15.0 * env + 4.0 * tap)
    rotate_world(arm, 'Head', (0, 1, 0), -5.0 * env)

    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=1.2 * env,
        drop_offset=-1.5 * env,
        fwd_offset=3.0 * env,
        inward_offset=2.0 * env,
        forearm_flex_offset=-4.0 * env,
        forearm_drop_offset=-2.0 * env,
    )

    rotate_world(arm, 'RightShoulder', (0, 1, 0), 5.0 * limb_env)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 16.0) * limb_env)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r - 44.0 * limb_env + 10.0 * tap)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 16.0 * limb_env)

    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-relaxed_forearm - 18.0) * limb_env + 8.0 * tap)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r - 2.0 * limb_env)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r + 10.0 * limb_env)
    rotate_world(arm, 'RightHand', (1, 0, 0), 20.0 * limb_env + 12.0 * tap)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_gentle_try_again(arm, mesh, phase, design):
    """Soft empathetic head tilt and warm elbows-tucked open palms encouraging another try."""
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.24)
    limb_p = phase_lag(phase, 0.05)
    limb_env = plateau_envelope(limb_p, ramp=0.24)
    rest = 1.0 - limb_env
    head_shake = window_bell(limb_p, 0.14, 0.86, ramp=0.22) * math.sin(3 * math.pi * ((limb_p - 0.14) / 0.72)) if 0.14 <= limb_p <= 0.86 else 0.0
    sway = math.sin(2 * math.pi * phase) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.45 * env, 0.8 * sway)

    rotate_world(arm, 'Spine02', (1, 0, 0), 3.0 * env)
    rotate_world(arm, 'Spine02', (0, 1, 0), 2.5 * sway)
    rotate_world(arm, 'Head', (0, 1, 0), 11.0 * env)
    rotate_world(arm, 'Head', (0, 0, 1), 6.0 * head_shake)
    rotate_world(arm, 'Head', (1, 0, 0), 6.0 * env)

    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 4.0 * limb_env)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 4.0 * limb_env))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 20.0 * limb_env)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 10.0 * limb_env))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 36.0) * limb_env)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest + 4.0 * limb_env))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * 4.0 * rest + sign * 8.0 * limb_env)
        rotate_local(arm, f'{side}ForeArm', (0, 1, 0), -sign * 20.0 * limb_env)
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * limb_env)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_talk_explain(arm, mesh, phase, design):
    """Animated conversational hand gestures forward in front of torso while inactive arm rests at side."""
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.20)
    limb_p = phase_lag(phase, 0.05)

    g1 = window_bell(limb_p, 0.06, 0.46, ramp=0.38)
    g2 = window_bell(limb_p, 0.34, 0.74, ramp=0.38)
    g3 = window_bell(limb_p, 0.60, 0.96, ramp=0.38)
    nod = math.sin(4 * math.pi * phase) * env

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.40 * (nod ** 2), 0.7 * (g1 - g2))

    rotate_world(arm, 'Spine02', (1, 0, 0), 3.0 * env + 2.0 * g3)
    rotate_world(arm, 'Spine02', (0, 0, 1), 5.0 * g1 - 5.0 * g2)
    rotate_world(arm, 'Head', (0, 0, 1), 6.0 * g1 - 5.0 * g2)
    rotate_world(arm, 'Head', (0, 1, 0), 4.0 * (g2 - g1))
    rotate_world(arm, 'Head', (1, 0, 0), 5.0 * nod)

    for side, sign, act_raw in [('Left', 1, g2 + 0.75 * g3), ('Right', -1, g1 + 0.80 * g3)]:
        act = min(1.0, act_raw / 1.35)
        rest = 1.0 - act
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 4.0 * act)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - 6.0 * act))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 26.0 * act)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 14.0 * act))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 38.0) * act)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest + 4.0 * act))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * 4.0 * rest + sign * 8.0 * act)
        rotate_local(arm, f'{side}ForeArm', (0, 1, 0), -sign * 20.0 * act)
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * act)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_count_one_two_three(arm, mesh, phase, design):
    """Rhythmic 1-2-3 beat forward chest taps and bouncy nods for numeracy games."""
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.18)
    limb_p = phase_lag(phase, 0.04)

    beat1 = window_bell(limb_p, 0.06, 0.38, ramp=0.40)
    beat2 = window_bell(limb_p, 0.30, 0.64, ramp=0.40)
    beat3 = window_bell(limb_p, 0.54, 0.94, ramp=0.38)
    core_bounce = (beat1 + beat2 + beat3) * 0.75

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.75 * core_bounce, 0.8 * (beat1 - beat2))

    rotate_world(arm, 'Spine02', (0, 0, 1), -5.0 * beat1 + 5.0 * beat2)
    rotate_world(arm, 'Spine02', (1, 0, 0), -3.5 * beat3 + 2.5 * (beat1 + beat2))
    rotate_world(arm, 'Head', (0, 1, 0), -4.0 * beat1 + 4.0 * beat2)
    rotate_world(arm, 'Head', (1, 0, 0), 7.0 * beat1 + 7.0 * beat2 - 5.0 * beat3)

    r_lift = 16.0 * beat1 + 48.0 * beat3
    l_lift = 16.0 * beat2 + 48.0 * beat3

    for side, sign, lift, fwd_raw in [
        ('Right', -1, r_lift, beat1 + beat3),
        ('Left', 1, l_lift, beat2 + beat3),
    ]:
        fwd = min(1.0, fwd_raw * 0.85)
        rest = 1.0 - fwd
        rotate_world(arm, f'{side}Shoulder', (0, 1, 0), -sign * 6.5 * fwd)
        rotate_world(arm, f'{side}Arm', (0, 1, 0), sign * (relaxed_arm - lift))
        rotate_world(arm, f'{side}Arm', (1, 0, 0), -4.0 * rest - 30.0 * fwd)
        rotate_world(arm, f'{side}Arm', (0, 0, 1), -sign * (4.0 * rest + 18.0 * fwd))

        rotate_world(arm, f'{side}ForeArm', (1, 0, 0), -relaxed_forearm * rest + (-relaxed_forearm - 40.0) * fwd)
        rotate_world(arm, f'{side}ForeArm', (0, 1, 0), sign * (relaxed_forearm_drop * rest - 14.0 * beat3))
        rotate_world(arm, f'{side}ForeArm', (0, 0, 1), -sign * (4.0 * rest + 8.0 * fwd))
        rotate_world(arm, f'{side}Hand', (1, 0, 0), -10.0 * fwd)

    return apply_floor_and_hop(arm, mesh, 0.0)


def pose_sleepy_yawn(arm, mesh, phase, design):
    """Cozy long-idle stretch with left arm relaxed at side and paw-over-mouth yawn."""
    reset_pose(arm)
    env = plateau_envelope(phase, ramp=0.18)
    limb_p = phase_lag(phase, 0.05)
    yawn = window_bell(limb_p, 0.14, 0.82, ramp=0.34)
    rest_r = 1.0 - yawn
    inhale = window_bell(phase, 0.08, 0.80, ramp=0.34)

    relaxed_arm = design.get('relaxedArmDegrees', 17)
    relaxed_forearm = design.get('relaxedForearmDegrees', 12)
    relaxed_forearm_drop = design.get('relaxedForearmDropDegrees', 16)

    apply_natural_stance(arm, design, weight=1.0)
    add_grounded_bounce(arm, 0.60 * env + 0.35 * inhale, -0.5 * math.sin(2 * math.pi * phase) * env)

    rotate_world(arm, 'Spine02', (1, 0, 0), -6.0 * inhale)
    rotate_world(arm, 'Spine01', (1, 0, 0), -3.5 * inhale)
    rotate_world(arm, 'Head', (1, 0, 0), -10.0 * yawn + 5.0 * env * (1.0 - yawn))
    rotate_world(arm, 'Head', (0, 1, 0), 6.0 * yawn)

    apply_relaxed_arm(
        arm, 'Left', 1, design, weight=1.0,
        shoulder_lift=1.5 * inhale,
        drop_offset=-1.5 * inhale,
        fwd_offset=3.0 * inhale,
        inward_offset=1.5 * env,
        forearm_flex_offset=-4.0 * env,
        forearm_drop_offset=-2.0 * inhale,
    )

    # Right paw rises gently from relaxed side to cover yawn while keeping safe clearance from snout
    rotate_world(arm, 'RightShoulder', (0, 1, 0), 8.0 * yawn)
    rotate_world(arm, 'RightShoulder', (0, 0, 1), 18.0 * yawn)
    rotate_world(arm, 'RightArm', (0, 1, 0), -relaxed_arm * rest_r + (-relaxed_arm + 32.0) * yawn)
    rotate_world(arm, 'RightArm', (0, 0, 1), 4.0 * rest_r + 46.0 * yawn)
    rotate_world(arm, 'RightArm', (1, 0, 0), -4.0 * rest_r - 36.0 * yawn)
    rotate_world(arm, 'RightForeArm', (1, 0, 0), -relaxed_forearm * rest_r + (-relaxed_forearm - 48.0) * yawn)
    rotate_world(arm, 'RightForeArm', (0, 1, 0), -relaxed_forearm_drop * rest_r)
    rotate_world(arm, 'RightForeArm', (0, 0, 1), 4.0 * rest_r + 32.0 * yawn)
    rotate_world(arm, 'RightHand', (1, 0, 0), -12.0 * yawn)

    return apply_floor_and_hop(arm, mesh, 0.0)


CLIP_BUILDERS = [
    ('celebrate', 42, 1, pose_celebrate),
    ('wave', 66, 1, pose_wave),
    ('clap', 66, 1, pose_clap),
    ('jump', 48, 1, pose_jump),
    ('finale', 84, 1, pose_finale),
    ('idle', 96, 1, pose_idle),
    ('idle_breathe', 108, 1, pose_idle_breathe),
    ('search', 66, 1, pose_search),
    ('think', 72, 1, pose_think),
    ('listen', 66, 1, pose_listen),
    ('encourage', 60, 1, pose_encourage),
    ('shrug', 60, 1, pose_shrug),
    ('flex', 66, 1, pose_flex),
    ('bow', 66, 1, pose_bow),
    ('march', 72, 1, pose_march),
    ('wiggle', 66, 1, pose_wiggle),
    ('peekaboo', 66, 1, pose_peekaboo),
    ('stretch', 66, 1, pose_stretch),
    ('walk', 48, 1, pose_walk),
    ('point_down', 60, 1, pose_point_down),
    ('gentle_try_again', 66, 1, pose_gentle_try_again),
    ('talk_explain', 66, 1, pose_talk_explain),
    ('count_one_two_three', 72, 1, pose_count_one_two_three),
    ('sleepy_yawn', 78, 1, pose_sleepy_yawn),
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
    reset_pose(arm)
    brow_clean_stats = clean_sculpted_eyebrows(mesh, arm)
    decimate_stats = decimate_and_normalize_skin(
        mesh, arm, ratio=float(design.get('decimateRatio', 0.28))
    )

    scene = bpy.context.scene
    scene.render.fps = 30
    scene.render.fps_base = 1

    actions_by_name = {}
    clip_summaries = []
    celebrate_floors = []

    for clip_name, end_frame, key_step, pose_fn in CLIP_BUILDERS:
        action = bpy.data.actions.new(clip_name)
        action.use_fake_user = True
        actions_by_name[clip_name] = action
        floors = []
        frames_to_key = list(range(0, end_frame + 1, key_step))
        if frames_to_key[-1] != end_frame:
            frames_to_key.append(end_frame)
        for frame in frames_to_key:
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
            'keyframes': len(frames_to_key),
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
    export_model(glb, arm, [mesh], animation=True, animation_mode='ACTIONS', force_sampling=False)
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
    end_frames = {name: end_frame for name, end_frame, _, _ in CLIP_BUILDERS}
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
        ('jump-peak', 'jump', 22, (-2, -5, .35)),
        ('finale-peak', 'finale', 28, (-2, -5, .35)),
        ('idle-peak', 'idle', 24, (-2, -5, .35)),
        ('idle_breathe-peak', 'idle_breathe', 27, (-2, -5, .35)),
        ('search-peak', 'search', 30, (-2, -5, .35)),
        ('think-peak', 'think', 45, (-2, -5, .35)),
        ('listen-peak', 'listen', 33, (-2, -5, .35)),
        ('encourage-peak', 'encourage', 30, (-2, -5, .35)),
        ('shrug-peak', 'shrug', 24, (-2, -5, .35)),
        ('flex-peak', 'flex', 33, (-2, -5, .35)),
        ('bow-peak', 'bow', 24, (-2, -5, .35)),
        ('march-peak', 'march', 18, (-2, -5, .35)),
        ('wiggle-peak', 'wiggle', 26, (-2, -5, .35)),
        ('peekaboo-peak', 'peekaboo', 18, (-2, -5, .35)),
        ('stretch-peak', 'stretch', 27, (-2, -5, .35)),
        ('walk-step-left', 'walk', 12, (-2, -5, .35)),
        ('walk-step-right', 'walk', 36, (-2, -5, .35)),
        ('point_down-peak', 'point_down', 30, (-2, -5, .35)),
        ('gentle_try_again-peak', 'gentle_try_again', 30, (-2, -5, .35)),
        ('talk_explain-peak', 'talk_explain', 30, (-2, -5, .35)),
        ('count_one_two_three-peak', 'count_one_two_three', 39, (-2, -5, .35)),
        ('sleepy_yawn-peak', 'sleepy_yawn', 38, (-2, -5, .35)),
    ]
    for label, clip_name, frame, offset in review_shots:
        set_active_studio_accessory(
            studio_props,
            clip_name,
            normalized_progress=frame / end_frames[clip_name],
            elapsed_seconds=0.0,
        )
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
        'stage': 'Authored 24-clip living companion motion; runtime, compression, deformation and art checks pending',
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
        'brow_cleanup': brow_clean_stats,
        'decimation': decimate_stats,
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
