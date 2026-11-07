"""Studio-only 3D prop builder for the bear companion review renders.

Called ONLY after export_model() in build_generated_bear_celebration.py so runtime GLB
bytes remain a pure single-mesh ('Bear_fixed_outfit') asset.
"""
import math
import bmesh
import bpy
from mathutils import Euler, Matrix, Vector
from bear_companion_common import material


def _bone_child_mesh(name, mesh_data, mat, arm, bone_name):
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    # Blender BONE parenting places origin at the bone TAIL (0, bone.length, 0) in bone-local cm.
    # Offset by -bone.length on Y so (0, 0, 0) matches the bone HEAD (identical to Three.js bone.add()).
    bone_len = arm.data.bones[bone_name].length
    obj.location = (0.0, -bone_len, 0.0)
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


def _mask_point(side_sign, theta, v):
    # Inner eye rim at v=0, smooth winged outer contour at v=1
    cx = side_sign * (13.5 + 2.0 * v)
    cy = 41.8 + 0.6 * v
    rx = 6.2 + v * 12.8
    ry = 4.6 + v * 4.4
    raw_x = cx + rx * math.cos(theta)
    raw_y = cy + ry * math.sin(theta)
    # Clamp across center nose bridge (x=0) so left and right halves join seamlessly
    if side_sign < 0:
        x = min(0.0, raw_x)
    else:
        x = max(0.0, raw_x)
    # Classic superhero outer wing lift and smooth nose-bridge arch above the snout
    outer_dist = max(0.0, abs(x) - 18.0) / 15.0
    wing_lift = 2.8 * v * (outer_dist ** 1.4) * (1.0 if math.sin(theta) > -0.2 else 0.3)
    bridge_arch = 3.2 * v * math.exp(-(x * x) / 55.0) * (1.0 if math.sin(theta) < 0 else 0.0)
    y = max(36.8 if abs(x) < 12.0 else 33.5, raw_y + wing_lift + bridge_arch)
    # Face surface Z(x, y) + 2.0 cm clearance so BVH overlap with Head is strictly 0
    snout_bulge = 13.5 * math.exp(-((max(0.0, 42.5 - y)) / 4.2) ** 2) * math.exp(-(x / 15.5) ** 2)
    z = 43.8 + snout_bulge - 0.0080 * x * x - 0.012 * ((y - 42.0) ** 2)
    return (x, y, z)


def create_studio_accessories(arm):
    """Create studio review accessory objects parented to Head, RightHand, and LeftHand."""
    mat_wood = material('Prop_Wood', '#5C3A21', 0.55)
    mat_brass = material('Prop_Brass', '#F59E0B', 0.30)
    mat_lens = material('Prop_Lens', '#7DD3FC', 0.15)
    mat_bulb = material('Prop_Bulb', '#FDE047', 0.20)
    mat_silver = material('Prop_Silver', '#94A3B8', 0.35)
    mat_dark = material('Prop_Dark', '#1E293B', 0.45)
    mat_red = material('Prop_Red', '#E11D48', 0.38)
    mat_orange = material('Prop_Orange', '#F97316', 0.35)
    mat_teal = material('Prop_Teal', '#14B8A6', 0.35)

    cyl_y = Euler((-math.pi / 2, 0.0, 0.0)).to_matrix().to_4x4()
    props = {}

    # 1. Magnifying Glass (RightHand) — handle anchored inside paw center (0, 12, 2), extending up & inward in front of right eye
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

    # 2. Pop-up Lightbulb (Head) — anchored at (-22, 80.5, 16) so 100% inside camera frame AND clears head fur
    bm = bmesh.new()
    base = Matrix.Translation((-22.0, 80.5, 16.0)) @ Euler((0.0, 0.0, 0.12)).to_matrix().to_4x4()
    _add_part(
        bm,
        lambda t: bmesh.ops.create_uvsphere(t, u_segments=20, v_segments=14, radius=8.6),
        base @ Matrix.Translation((0.0, 5.4, 0.0)),
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=18, radius1=4.2, radius2=6.8, depth=5.2),
        base @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=18, radius1=3.8, radius2=4.2, depth=4.4),
        base @ Matrix.Translation((0.0, -3.8, 0.0)) @ cyl_y,
        1,
    )
    for i in range(5):
        angle = -math.pi * 0.38 + (i / 4.0) * math.pi * 0.76
        ray_mat = (
            base
            @ Matrix.Translation((math.sin(angle) * 13.0, 5.4 + math.cos(angle) * 13.0, 0.0))
            @ Euler((0.0, 0.0, -angle)).to_matrix().to_4x4()
            @ cyl_y
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=10, radius1=0.9, radius2=0.9, depth=4.0),
            ray_mat,
            0,
        )
    m_bulb = bpy.data.meshes.new('Prop_Think_Bulb')
    bm.to_mesh(m_bulb)
    bm.free()
    obj_bulb = _bone_child_mesh('Prop_Think_Bulb', m_bulb, mat_bulb, arm, 'Head')
    obj_bulb.data.materials.append(mat_silver)
    props['think'] = [obj_bulb]

    # 3. Smooth Parametric Superhero Mask (Head) — zero stair-steps, zero mesh overlaps
    bm = bmesh.new()
    rings = 10
    segs = 48
    for side_sign in (-1.0, 1.0):
        grid = []
        for r in range(rings + 1):
            v = r / rings
            row_verts = []
            for s in range(segs):
                theta = (2.0 * math.pi * s) / segs
                pt = _mask_point(side_sign, theta, v)
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

    # 4. Magician's Top Hat (RightHand) — pinched at the outer brim edge beyond fingertips (Y=28.5 > 27.66)
    bm = bmesh.new()
    holder = _orient_y_matrix((0.0, 29.0, 10.0), (0.45, 0.35, 0.82)) @ Matrix.Translation((0.0, 2.0, 20.5))
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=28, radius1=19.5, radius2=19.5, depth=2.0),
        holder @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=28, radius1=13.5, radius2=13.5, depth=3.8),
        holder @ Matrix.Translation((0.0, 2.6, 0.0)) @ cyl_y,
        1,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=28, radius1=13.0, radius2=14.5, depth=19.5),
        holder @ Matrix.Translation((0.0, 10.8, 0.0)) @ cyl_y,
        0,
    )
    m_hat = bpy.data.meshes.new('Prop_Bow_Hat')
    bm.to_mesh(m_hat)
    bm.free()
    obj_hat = _bone_child_mesh('Prop_Bow_Hat', m_hat, mat_dark, arm, 'RightHand')
    obj_hat.data.materials.append(mat_red)
    props['bow'] = [obj_hat]

    # 5. Pennant Flag (RightHand) — pole anchored inside paw center (0, 12, 2), extending vertically up
    bm = bmesh.new()
    holder = _orient_y_matrix((0.0, 12.0, 2.0), (-0.1142, 0.7111, 0.6938))
    _add_part(
        bm,
        lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=14, radius1=1.5, radius2=1.5, depth=52.0),
        holder @ Matrix.Translation((0.0, 22.0, 0.0)) @ cyl_y,
        0,
    )
    _add_part(
        bm,
        lambda t: bmesh.ops.create_uvsphere(t, u_segments=14, v_segments=10, radius=2.8),
        holder @ Matrix.Translation((0.0, 49.0, 0.0)),
        1,
    )
    v1 = bm.verts.new(holder @ Vector((0.0, 46.5, 0.0)))
    v2 = bm.verts.new(holder @ Vector((0.0, 26.5, 0.0)))
    v3 = bm.verts.new(holder @ Vector((30.0, 36.5, 0.0)))
    f = bm.faces.new((v1, v2, v3))
    f.material_index = 2
    m_flag = bpy.data.meshes.new('Prop_March_Flag')
    bm.to_mesh(m_flag)
    bm.free()
    obj_flag = _bone_child_mesh('Prop_March_Flag', m_flag, mat_wood, arm, 'RightHand')
    obj_flag.data.materials.append(mat_bulb)
    obj_flag.data.materials.append(mat_red)
    props['march'] = [obj_flag]

    # 6. Fiesta Maracas (LeftHand + RightHand) — handles anchored inside paw centers (0, 12, 2)
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
            lambda t: bmesh.ops.create_uvsphere(t, u_segments=18, v_segments=14, radius=8.5),
            holder @ Matrix.Translation((0.0, 27.5, 0.0)) @ Matrix.Diagonal((1.0, 1.22, 1.0, 1.0)),
            1,
        )
        _add_part(
            bm,
            lambda t: bmesh.ops.create_cone(t, cap_ends=True, segments=18, radius1=8.7, radius2=8.7, depth=2.0),
            holder @ Matrix.Translation((0.0, 27.5, 0.0)) @ cyl_y,
            2,
        )
        m_mar = bpy.data.meshes.new(f'Prop_Maraca_{side_bone}')
        bm.to_mesh(m_mar)
        bm.free()
        obj_mar = _bone_child_mesh(f'Prop_Maraca_{side_bone}', m_mar, mat_wood, arm, side_bone)
        obj_mar.data.materials.append(mat_orange)
        obj_mar.data.materials.append(mat_teal)
        wiggle_objs.append(obj_mar)
    props['wiggle'] = wiggle_objs

    set_active_studio_accessory(props, None)
    return props


def set_active_studio_accessory(props, clip_name):
    for key, obj_list in props.items():
        show = key == clip_name
        for obj in obj_list:
            obj.hide_render = not show
            obj.hide_viewport = not show
