"""Studio-only 3D prop and facial rig builder for the bear companion review renders.

Called ONLY after export_model() in build_generated_bear_celebration.py so runtime GLB
bytes remain a pure single-mesh ('Bear_fixed_outfit') asset.
"""
import math
import bmesh
import bpy
from mathutils import Euler, Matrix, Vector
from bear_companion_common import material

BLINK_PERIOD_SECONDS = 3.4
BLINK_START_SECONDS = 1.68
BLINK_DURATION_SECONDS = 0.15
EYELID_OPEN_ROT_X = -1.55
EYELID_CLOSED_ROT_X = 0.92
EYELID_LEFT_YAW_RAD = 0.30
EYELID_RIGHT_YAW_RAD = -0.28
BROW_ARC_RAD = math.pi * 0.68
BROW_BASE_ROT_Z = (math.pi - BROW_ARC_RAD) * 0.5
BROW_REST_SLOPE_RAD = 0.14
BROW_LEFT_YAW_RAD = 0.42
BROW_RIGHT_YAW_RAD = -0.38

EXPRESSIVE_BLINK_CLIPS = {'wave', 'encourage', 'shrug', 'think', 'listen'}

NEUTRAL_BROW_POSE = {'liftY': 0.0, 'leftTiltRad': 0.0, 'rightTiltRad': 0.0}

BROW_POSE_BY_CLIP = {
    'celebrate': {'liftY': 1.6, 'leftTiltRad': 0.09, 'rightTiltRad': -0.09},
    'jump': {'liftY': 1.6, 'leftTiltRad': 0.09, 'rightTiltRad': -0.09},
    'finale': {'liftY': 1.6, 'leftTiltRad': 0.09, 'rightTiltRad': -0.09},
    'peekaboo': {'liftY': 1.5, 'leftTiltRad': 0.08, 'rightTiltRad': -0.08},
    'clap': {'liftY': 1.2, 'leftTiltRad': 0.06, 'rightTiltRad': -0.06},
    'wave': {'liftY': 1.2, 'leftTiltRad': 0.06, 'rightTiltRad': -0.06},
    'wiggle': {'liftY': 1.2, 'leftTiltRad': 0.06, 'rightTiltRad': -0.06},
    'bow': {'liftY': 1.2, 'leftTiltRad': 0.06, 'rightTiltRad': -0.06},
    'march': {'liftY': 1.2, 'leftTiltRad': 0.06, 'rightTiltRad': -0.06},
    'stretch': {'liftY': 1.1, 'leftTiltRad': 0.05, 'rightTiltRad': -0.05},
    'encourage': {'liftY': 0.9, 'leftTiltRad': -0.11, 'rightTiltRad': 0.11},
    'shrug': {'liftY': 0.9, 'leftTiltRad': -0.11, 'rightTiltRad': 0.11},
    'think': {'liftY': 1.1, 'leftTiltRad': -0.04, 'rightTiltRad': 0.11},
    'search': {'liftY': 1.1, 'leftTiltRad': -0.04, 'rightTiltRad': 0.11},
    'listen': {'liftY': 1.1, 'leftTiltRad': -0.04, 'rightTiltRad': 0.11},
}


def compute_blink_amount(active_clip_name, normalized_progress=0.5, elapsed_seconds=0.0):
    if not active_clip_name or active_clip_name == 'flex':
        return 0.0
    if not math.isfinite(elapsed_seconds) or elapsed_seconds <= 0.05:
        return 0.0
    if active_clip_name == 'peekaboo' and 0.22 <= normalized_progress <= 0.78:
        return 0.0

    periodic_blink = 0.0
    cycle_time = ((elapsed_seconds % BLINK_PERIOD_SECONDS) + BLINK_PERIOD_SECONDS) % BLINK_PERIOD_SECONDS
    if BLINK_START_SECONDS <= cycle_time <= BLINK_START_SECONDS + BLINK_DURATION_SECONDS:
        u = (cycle_time - BLINK_START_SECONDS) / BLINK_DURATION_SECONDS
        periodic_blink = math.sin(math.pi * u)

    mid_clip_blink = 0.0
    if active_clip_name in EXPRESSIVE_BLINK_CLIPS and 0.46 <= normalized_progress <= 0.56:
        u = (normalized_progress - 0.46) / 0.10
        mid_clip_blink = math.sin(math.pi * u)

    return max(0.0, min(1.0, max(periodic_blink, mid_clip_blink)))


def compute_brow_pose(active_clip_name):
    if not active_clip_name or active_clip_name == 'flex':
        return dict(NEUTRAL_BROW_POSE)
    return dict(BROW_POSE_BY_CLIP.get(active_clip_name, NEUTRAL_BROW_POSE))


def _bone_child_mesh(name, mesh_data, mat, arm, bone_name, local_offset=(0.0, 0.0, 0.0)):
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    # Blender BONE parenting places origin at the bone TAIL (0, bone.length, 0) in bone-local cm.
    # Offset by -bone.length on Y so (0, 0, 0) matches the bone HEAD (identical to Three.js bone.add()).
    bone_len = arm.data.bones[bone_name].length
    obj.location = (
        local_offset[0],
        -bone_len + local_offset[1],
        local_offset[2],
    )
    return obj


def _orient_y_matrix(origin, y_dir):
    y_vec = Vector(y_dir).normalized()
    q = Vector((0.0, 1.0, 0.0)).rotation_difference(y_vec)
    return Matrix.Translation(origin) @ q.to_matrix().to_4x4()


def _add_part(bm, geom_fn, matrix, mat_index=0):
    temp = bmesh.new()
    geom_fn(temp)
    bmesh.ops.transform(temp, matrix=matrix, verts=temp.verts)
    temp.faces.ensure_lookup_table()
    for f in temp.faces:
        f.material_index = mat_index
    vert_map = {}
    for v in temp.verts:
        nv = bm.verts.new(v.co)
        vert_map[v] = nv
    for f in temp.faces:
        try:
            nf = bm.faces.new([vert_map[v] for v in f.verts])
            nf.material_index = f.material_index
            nf.smooth = True
        except ValueError:
            pass
    temp.free()


def mask_point(side_sign, theta, v):
    # Inner eye rim at v=0 centered at (cx=±16.2, cy=36.8) over the temple pupils, smooth winged outer contour at v=1,
    # hugging glabella (Z ≈ 43.5) above y=38 while bulging forward over the snout below y=38.
    cx = side_sign * (16.2 + 0.8 * v)
    cy = 36.8 + 0.8 * v
    rx = 5.2 + v * 13.8
    ry = 4.6 + v * 4.4
    raw_x = cx + rx * math.cos(theta)
    raw_y = cy + ry * math.sin(theta)
    if side_sign < 0:
        x = min(0.0, raw_x)
    else:
        x = max(0.0, raw_x)
    outer_dist = max(0.0, abs(x) - 18.0) / 15.0
    wing_lift = 2.8 * v * (outer_dist ** 1.4) * (1.0 if math.sin(theta) > -0.2 else 0.3)
    bridge_arch = 3.2 * v * math.exp(-(x * x) / 55.0) * (1.0 if math.sin(theta) < 0 else 0.0)
    min_y_floor = 31.4 + 4.4 * math.exp(-(x * x) / 150.0)
    y = max(min_y_floor, raw_y + wing_lift + bridge_arch)
    snout_drop = max(0.0, 38.0 - y)
    snout_bulge = 21.5 * (1.0 - math.exp(-((snout_drop / 3.1) ** 2))) * math.exp(-((x / 16.2) ** 2))
    z = 43.5 + snout_bulge - 0.0096 * x * x - 0.012 * ((y - 38.0) ** 2)
    return (x, y, z)


_mask_point = mask_point


def _build_eyelid_mesh(name, radius=6.4, width_segs=20, height_segs=14, theta_length=math.pi * 0.52):
    bm = bmesh.new()
    pole = bm.verts.new((0.0, radius, 0.0))
    rows = []
    for r in range(1, height_segs + 1):
        theta = (r / height_segs) * theta_length
        sin_t = math.sin(theta)
        cos_t = math.cos(theta)
        row = []
        for s in range(width_segs):
            phi = (2.0 * math.pi * s) / width_segs
            x = -radius * math.cos(phi) * sin_t
            y = radius * cos_t
            z = radius * math.sin(phi) * sin_t
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)

    for s in range(width_segs):
        sn = (s + 1) % width_segs
        try:
            f = bm.faces.new((pole, rows[0][s], rows[0][sn]))
            f.smooth = True
        except ValueError:
            pass

    for r in range(len(rows) - 1):
        for s in range(width_segs):
            sn = (s + 1) % width_segs
            try:
                f = bm.faces.new((rows[r][s], rows[r + 1][s], rows[r + 1][sn], rows[r][sn]))
                f.smooth = True
            except ValueError:
                pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def _build_brow_mesh(name, radius=4.6, tube=1.05, radial_segs=8, tubular_segs=16, arc=BROW_ARC_RAD):
    bm = bmesh.new()
    rings = []
    for j in range(tubular_segs + 1):
        u = (j / tubular_segs) * arc
        cos_u = math.cos(u)
        sin_u = math.sin(u)
        ring = []
        for i in range(radial_segs):
            v = (2.0 * math.pi * i) / radial_segs
            cos_v = math.cos(v)
            sin_v = math.sin(v)
            x = (radius + tube * cos_v) * cos_u
            y = (radius + tube * cos_v) * sin_u
            z = tube * sin_v
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)

    for j in range(tubular_segs):
        for i in range(radial_segs):
            inext = (i + 1) % radial_segs
            try:
                f = bm.faces.new((rings[j][i], rings[j + 1][i], rings[j + 1][inext], rings[j][inext]))
                f.smooth = True
            except ValueError:
                pass

    for end_ring, flip in ((rings[0], False), (rings[-1], True)):
        try:
            verts = list(reversed(end_ring)) if flip else list(end_ring)
            f = bm.faces.new(verts)
            f.smooth = True
        except ValueError:
            pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def attach_bear_accessories(arm, include_facial=True):
    """Create studio review accessory & 3D facial objects parented to Head, RightHand, and LeftHand."""
    mat_wood = material('Prop_Wood', '#5C3A21', 0.55)
    mat_brass = material('Prop_Brass', '#F59E0B', 0.30)
    mat_lens = material('Prop_Lens', '#7DD3FC', 0.15)
    mat_bulb = material('Prop_Bulb', '#FDE047', 0.20)
    mat_silver = material('Prop_Silver', '#94A3B8', 0.35)
    mat_dark = material('Prop_Dark', '#1E293B', 0.45)
    mat_red = material('Prop_Red', '#E11D48', 0.38)
    mat_flag_cloth = material('Prop_Flag_Cloth', '#EF4444', 0.40)
    mat_flag_wood = material('Prop_Flag_Wood', '#92400E', 0.55)
    mat_maraca_wood = material('Prop_Maraca_Wood', '#B45309', 0.50)
    mat_orange = material('Prop_Orange', '#F97316', 0.35)
    mat_teal = material('Prop_Teal', '#14B8A6', 0.35)
    mat_eyelid = material('Prop_Eyelid_Fur', '#C9823B', 0.72)
    mat_brow = material('Prop_Brow_Dark', '#4A2811', 0.75)

    cyl_y = Euler((-math.pi / 2, 0.0, 0.0)).to_matrix().to_4x4()
    props = {}

    # 1. Magnifying Glass (RightHand)
    bm = bmesh.new()
    holder = _orient_y_matrix((0.0, 12.0, 2.0), (0.3764, 0.5170, 0.7688))
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=16, radius1=2.1, radius2=1.8, depth=22.0),
        holder @ Matrix.Translation((0.0, 8.0, 0.0)) @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=16, radius1=2.4, radius2=2.4, depth=3.6),
        holder @ Matrix.Translation((0.0, 20.0, 0.0)) @ cyl_y,
        1,
    )
    head_mat = holder @ Matrix.Translation((0.0, 35.5, 0.0)) @ Euler((0.3678, -2.5779, -1.1420)).to_matrix().to_4x4()
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=28, radius1=15.5, radius2=15.5, depth=3.0),
        head_mat,
        1,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=28, radius1=13.0, radius2=13.0, depth=3.5),
        head_mat,
        2,
    )
    m_search = bpy.data.meshes.new('Prop_Search_Glass')
    bm.to_mesh(m_search)
    bm.free()
    obj_search = _bone_child_mesh('Prop_Search_Glass', m_search, mat_wood, arm, 'RightHand')
    obj_search.data.materials.append(mat_brass)
    obj_search.data.materials.append(mat_lens)
    props['search'] = [obj_search]

    # 2. Pop-up Lightbulb (Head) — anchored at (-22, 68.2, 29.5) clearing crown fur with upper rays <= NDC_Y 0.90
    bm = bmesh.new()
    _add_part(
        bm,
        lambda t: bmesh.ops.create_uvsphere(t, u_segments=24, v_segments=18, radius=7.8),
        Matrix.Translation((0.0, 4.8, 0.0)),
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=20, radius1=3.8, radius2=6.2, depth=4.6),
        cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=20, radius1=3.4, radius2=3.8, depth=3.8),
        Matrix.Translation((0.0, -3.3, 0.0)) @ cyl_y,
        1,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_uvsphere(t, u_segments=16, v_segments=12, radius=2.2),
        Matrix.Translation((0.0, -5.4, 0.0)),
        2,
    )
    for i in range(5):
        angle = -math.pi * 0.38 + (i / 4.0) * math.pi * 0.76
        ray_mat = (
            Matrix.Translation((math.sin(angle) * 9.8, 4.8 + math.cos(angle) * 9.8, 0.0))
            @ Euler((0.0, 0.0, -angle)).to_matrix().to_4x4()
            @ cyl_y
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=10, radius1=0.85, radius2=0.85, depth=3.6),
            ray_mat,
            0,
        )
    m_bulb = bpy.data.meshes.new('Prop_Think_Bulb')
    bm.to_mesh(m_bulb)
    bm.free()
    obj_bulb = _bone_child_mesh('Prop_Think_Bulb', m_bulb, mat_bulb, arm, 'Head', local_offset=(-22.0, 68.2, 29.5))
    obj_bulb.rotation_euler = Euler((0.0, 0.0, 0.12))
    obj_bulb.data.materials.append(mat_silver)
    obj_bulb.data.materials.append(mat_dark)
    props['think'] = [obj_bulb]

    # 3. Smooth Parametric Superhero Mask (Head) — lowered cy=37.8 so cutouts center cleanly over pupils
    bm = bmesh.new()
    rings = 12
    segs = 56
    for side_sign in (-1.0, 1.0):
        grid = []
        for r in range(rings + 1):
            v = r / rings
            row_verts = []
            for s in range(segs):
                theta = (2.0 * math.pi * s) / segs
                pt = mask_point(side_sign, theta, v)
                row_verts.append(bm.verts.new(pt))
            grid.append(row_verts)
        for r in range(rings):
            for s in range(segs):
                sn = (s + 1) % segs
                try:
                    f = bm.faces.new((grid[r][s], grid[r][sn], grid[r + 1][sn], grid[r + 1][s]))
                    f.smooth = True
                except ValueError:
                    pass
    m_mask = bpy.data.meshes.new('Prop_Flex_Mask')
    bm.to_mesh(m_mask)
    bm.free()
    obj_mask = _bone_child_mesh('Prop_Flex_Mask', m_mask, mat_red, arm, 'Head')
    props['flex'] = [obj_mask]

    # 4. Magician's Top Hat (RightHand) — pulled inward to keep crown inside NDC_X >= -0.92 at cameraDistance = 5.6
    bm = bmesh.new()
    holder = _orient_y_matrix((0.0, 19.0, 11.0), (0.62, 0.10, 0.78)) @ Matrix.Translation((3.0, 2.0, 20.5))
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=32, radius1=19.5, radius2=19.5, depth=2.0),
        holder @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=32, radius1=13.5, radius2=13.5, depth=3.8),
        holder @ Matrix.Translation((0.0, 2.6, 0.0)) @ cyl_y,
        1,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=32, radius1=13.0, radius2=14.5, depth=19.5),
        holder @ Matrix.Translation((0.0, 10.8, 0.0)) @ cyl_y,
        0,
    )
    m_hat = bpy.data.meshes.new('Prop_Bow_Hat')
    bm.to_mesh(m_hat)
    bm.free()
    obj_hat = _bone_child_mesh('Prop_Bow_Hat', m_hat, mat_dark, arm, 'RightHand')
    obj_hat.data.materials.append(mat_red)
    props['bow'] = [obj_hat]

    # 5. Pennant Flag (RightHand) — shortened pole (46) and inward holder (x=0.02 >= 0) so NDC_X >= -0.92
    bm = bmesh.new()
    holder = _orient_y_matrix((0.0, 11.5, 2.0), (0.02, 0.52, 0.854))
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=14, radius1=1.5, radius2=1.5, depth=46.0),
        holder @ Matrix.Translation((0.0, 20.0, 0.0)) @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_uvsphere(t, u_segments=16, v_segments=12, radius=2.8),
        holder @ Matrix.Translation((0.0, 43.6, 0.0)),
        1,
    )
    for z_off, winding in ((0.5, (0, 1, 2)), (-0.5, (0, 2, 1))):
        pts = [
            bm.verts.new(holder @ Vector((0.0, 42.5, z_off))),
            bm.verts.new(holder @ Vector((0.0, 26.5, z_off))),
            bm.verts.new(holder @ Vector((21.0, 34.5, z_off))),
        ]
        f = bm.faces.new((pts[winding[0]], pts[winding[1]], pts[winding[2]]))
        f.material_index = 2
    m_flag = bpy.data.meshes.new('Prop_March_Flag')
    bm.to_mesh(m_flag)
    bm.free()
    obj_flag = _bone_child_mesh('Prop_March_Flag', m_flag, mat_flag_wood, arm, 'RightHand')
    obj_flag.data.materials.append(mat_bulb)
    obj_flag.data.materials.append(mat_flag_cloth)
    props['march'] = [obj_flag]

    # 6. Fiesta Maracas (LeftHand + RightHand)
    wiggle_objs = []
    for side_bone, origin, dir_vec in [
        ('LeftHand', (0.0, 12.0, 2.0), (0.2282, 0.9729, 0.0365)),
        ('RightHand', (0.0, 12.0, 2.0), (0.4959, 0.6230, 0.6049)),
    ]:
        bm = bmesh.new()
        holder = _orient_y_matrix(origin, dir_vec)
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=14, radius1=2.0, radius2=1.6, depth=22.0),
            holder @ Matrix.Translation((0.0, 10.0, 0.0)) @ cyl_y,
            0,
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_uvsphere(t, u_segments=22, v_segments=16, radius=8.5),
            holder @ Matrix.Translation((0.0, 27.5, 0.0)) @ Matrix.Diagonal((1.0, 1.22, 1.0, 1.0)),
            1,
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=22, radius1=8.7, radius2=8.7, depth=2.0),
            holder @ Matrix.Translation((0.0, 27.5, 0.0)) @ cyl_y,
            2,
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=22, radius1=7.6, radius2=7.6, depth=1.6),
            holder @ Matrix.Translation((0.0, 31.2, 0.0)) @ cyl_y,
            3,
        )
        m_mar = bpy.data.meshes.new(f'Prop_Maraca_{side_bone}')
        bm.to_mesh(m_mar)
        bm.free()
        obj_mar = _bone_child_mesh(f'Prop_Maraca_{side_bone}', m_mar, mat_maraca_wood, arm, side_bone)
        obj_mar.data.materials.append(mat_orange)
        obj_mar.data.materials.append(mat_bulb)
        obj_mar.data.materials.append(mat_teal)
        wiggle_objs.append(obj_mar)
    props['wiggle'] = wiggle_objs

    # 7. Optional 3D Eyelids & Brows (Head) matching companionAccessories.ts 1:1
    if include_facial and 'Head' in arm.data.bones:
        eyelid_mesh = _build_eyelid_mesh('Prop_Bear_Eyelid')
        left_eyelid = _bone_child_mesh('leftEyelid', eyelid_mesh, mat_eyelid, arm, 'Head', local_offset=(17.3, 36.5, 32.9))
        right_eyelid = _bone_child_mesh('rightEyelid', eyelid_mesh, mat_eyelid, arm, 'Head', local_offset=(-17.3, 35.6, 33.95))
        for eyelid in (left_eyelid, right_eyelid):
            eyelid.scale = (0.95, 0.88, 0.80)
            eyelid.rotation_mode = 'ZXY'
        left_eyelid.rotation_euler = Euler((EYELID_OPEN_ROT_X, EYELID_LEFT_YAW_RAD, 0.0), 'ZXY')
        right_eyelid.rotation_euler = Euler((EYELID_OPEN_ROT_X, EYELID_RIGHT_YAW_RAD, 0.0), 'ZXY')
        props['__eyelids__'] = [left_eyelid, right_eyelid]

        brow_mesh = _build_brow_mesh('Prop_Bear_Brow')
        left_brow = _bone_child_mesh('leftBrow', brow_mesh, mat_brow, arm, 'Head', local_offset=(17.3, 39.2, 36.4))
        right_brow = _bone_child_mesh('rightBrow', brow_mesh, mat_brow, arm, 'Head', local_offset=(-17.3, 38.2, 37.7))
        for brow in (left_brow, right_brow):
            brow.scale = (1.0, 1.0, 0.58)
            brow.rotation_mode = 'ZYX'
        left_brow.rotation_euler = Euler((0.0, BROW_LEFT_YAW_RAD, BROW_BASE_ROT_Z - BROW_REST_SLOPE_RAD), 'ZYX')
        right_brow.rotation_euler = Euler((0.0, BROW_RIGHT_YAW_RAD, BROW_BASE_ROT_Z + BROW_REST_SLOPE_RAD), 'ZYX')
        props['__brows__'] = [left_brow, right_brow]

    sync_bear_accessories(props, None)
    return props


def sync_bear_accessories(props, clip_name, normalized_progress=None, elapsed_seconds=0.0):
    progress = 0.72 if normalized_progress is None else float(normalized_progress)
    head_bone_len = None

    for key, obj_list in props.items():
        if key in ('__eyelids__', '__brows__'):
            continue
        if key == 'think':
            if clip_name == 'think':
                scale = 0.0
                if 0.50 <= progress <= 0.92:
                    if progress < 0.62:
                        u = (progress - 0.50) / 0.12
                        scale = math.sin(0.5 * math.pi * u)
                    elif progress > 0.84:
                        u = (0.92 - progress) / 0.08
                        scale = math.sin(0.5 * math.pi * u)
                    else:
                        scale = 1.0
                show_bulb = scale > 0.01
                s = max(0.01, scale)
                for obj in obj_list:
                    obj.scale = (s, s, s)
                    obj.hide_render = not show_bulb
                    obj.hide_viewport = not show_bulb
            else:
                for obj in obj_list:
                    obj.hide_render = True
                    obj.hide_viewport = True
            continue

        show = key == clip_name
        for obj in obj_list:
            obj.hide_render = not show
            obj.hide_viewport = not show

    eyelids = props.get('__eyelids__', [])
    if len(eyelids) == 2:
        hide_eyelids = (
            not clip_name
            or clip_name == 'flex'
            or (clip_name == 'peekaboo' and 0.22 <= progress <= 0.78)
        )
        blink = 0.0 if hide_eyelids else compute_blink_amount(clip_name, progress, elapsed_seconds)
        eyelids_visible = (not hide_eyelids) and blink > 0.02
        rot_x = EYELID_OPEN_ROT_X + (EYELID_CLOSED_ROT_X - EYELID_OPEN_ROT_X) * blink
        left_eyelid, right_eyelid = eyelids
        left_eyelid.rotation_euler = Euler((rot_x, EYELID_LEFT_YAW_RAD, 0.0), 'ZXY')
        right_eyelid.rotation_euler = Euler((rot_x, EYELID_RIGHT_YAW_RAD, 0.0), 'ZXY')
        for eyelid in eyelids:
            eyelid.hide_render = not eyelids_visible
            eyelid.hide_viewport = not eyelids_visible

    brows = props.get('__brows__', [])
    if len(brows) == 2:
        left_brow, right_brow = brows
        if head_bone_len is None and left_brow.parent and 'Head' in left_brow.parent.data.bones:
            head_bone_len = left_brow.parent.data.bones['Head'].length
        bone_len = head_bone_len or 0.0
        pose = compute_brow_pose(clip_name)
        brows_visible = bool(
            clip_name
            and clip_name != 'flex'
            and progress > 0.0
            and (pose['liftY'] != 0.0 or pose['leftTiltRad'] != 0.0 or pose['rightTiltRad'] != 0.0)
        )
        left_brow.hide_render = not brows_visible
        left_brow.hide_viewport = not brows_visible
        right_brow.hide_render = not brows_visible
        right_brow.hide_viewport = not brows_visible
        if brows_visible:
            left_brow.location = (17.3, -bone_len + 39.2 + pose['liftY'], 36.4)
            right_brow.location = (-17.3, -bone_len + 38.2 + pose['liftY'], 37.7)
            left_brow.rotation_euler = Euler(
                (0.0, BROW_LEFT_YAW_RAD, BROW_BASE_ROT_Z - BROW_REST_SLOPE_RAD + pose['leftTiltRad']),
                'ZYX',
            )
            right_brow.rotation_euler = Euler(
                (0.0, BROW_RIGHT_YAW_RAD, BROW_BASE_ROT_Z + BROW_REST_SLOPE_RAD + pose['rightTiltRad']),
                'ZYX',
            )


def create_studio_accessories(arm, include_facial=True):
    return attach_bear_accessories(arm, include_facial=include_facial)


def set_active_studio_accessory(props, clip_name, normalized_progress=None, elapsed_seconds=0.0):
    sync_bear_accessories(props, clip_name, normalized_progress=normalized_progress, elapsed_seconds=elapsed_seconds)
