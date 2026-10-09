"""A06 ivory loop scarf with a navy front band, fitted on an assembled outfit.

A chunky tube follows a closed path around the neck. At each angle the path clears the
neck skin (or collar) horizontally by NECK_GAP and rests on the top garment below it
(back higher, chest lower, as a loop scarf drapes). A navy band wraps the front section.
Weights are the body's at the nearest neck/shoulder point, limited to neck, Spine,
Spine01 and the shoulders, so the scarf follows the upper torso but never the head.
Hair long enough to reach the scarf (the H02 bob) drapes over it: with --hair-over, the
hair is not a scarf obstacle; instead an over_A06 hair key rests the hair on top of the
scarf in every gait pose and head gesture, each lift spread through nearby hair.
--clearance widens the tube's clearance where the run lifts the shoulders (female O05).

Usage: blender_cli.py build_catalog_a06.py --outfit-blend OUTFIT.blend --top T05_crew_sweatshirt_outfit
  --output-dir A06/fitting-revisions/o05-head130/male
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from catalog_coverage_visibility import gait_samples
from build_catalog_head import material
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_geometry import mesh_object, render_reviews
from build_catalog_a05 import SurfaceWeights, assign, limit_influences
from verify_catalog_head_scale_study import GESTURES, pose_gesture
from catalog_headwear_plan import smoothstep

TUBE = {'radius_horizontal': .046, 'radius_vertical': .040}
NECK_GAP, REST_GAP, CLEAR = .006, .004, .009  # CLEAR: tube surface to any obstacle after refinement.
BAND = {'half_angle_deg': 22, 'extra': .004}
ANGLES, SIDES = 72, 20
SCARF_BONES = ('neck', 'Spine', 'Spine01', 'LeftShoulder', 'RightShoulder')
RELAX, RELAX_CYCLES = 30, 3  # Tangential spacing passes, alternated with posed refinement.
# A gap above this many median spacings is a tangle (bunched points, a tube cutting across).
MAX_GAP_RATIO = 4.0
# Hair over the scarf clears the tube (band included) by `gap`; each lift spreads to hair
# within `spread` so the layers of a lock rise together. Loop samples every `step`.
DRAPE = {'gap': .008, 'spread': .025, 'step': .002}
IVORY, NAVY = (.86, .82, .71), (.026, .049, .106)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def neck_axis(body, arm):
    """Neck centre (x, y) from the neck bone's head; the height is replaced by the collar top."""
    bone = arm.data.bones['neck']
    head = arm.matrix_world @ bone.head_local
    return Vector((head.x, head.y, head.z))


def tube_ring(path, rh, rv, start, end, closed):
    """Sweep an ellipse (rh outward, rv vertical) along `path` between indices start..end."""
    vertices, faces = [], []
    indices = list(range(start, end + 1)) if not closed else list(range(len(path)))
    for i in indices:
        p = path[i % len(path)]
        a, b = path[(i - 1) % len(path)], path[(i + 1) % len(path)]
        tangent = (b - a).normalized()
        out = tangent.cross(Vector((0, 0, 1))).normalized()
        if out.dot(Vector((p.x, p.y, 0))) < 0:
            out.negate()
        up = out.cross(tangent).normalized()
        if up.z < 0:
            up.negate()
        for k in range(SIDES):
            t = 2 * math.pi * k / SIDES
            vertices.append(tuple(p + out * (rh * math.cos(t)) + up * (rv * math.sin(t))))
    rings = len(indices)
    for i in range(rings if closed else rings - 1):
        j = (i + 1) % rings
        for k in range(SIDES):
            m = (k + 1) % SIDES
            faces.append((i * SIDES + k, j * SIDES + k, j * SIDES + m, i * SIDES + m))
    return vertices, faces


def pose_samples(arm):
    """Rest, the head-scale test gestures and quarter-frame gaits, posing `arm` for each."""
    for _, axis, angle in [(None, None, 0), *GESTURES]:
        if axis is None:
            reset(arm)
        else:
            pose_gesture(arm, axis, angle)
        yield 'rest' if axis is None else f'gesture:{angle}'
    for motion, frame in gait_samples():
        reset(arm)
        action = bpy.data.actions[motion]
        arm.animation_data.action = action
        arm.animation_data.action_slot = action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
        bpy.context.view_layer.update()
        yield f'{motion}:{frame}'
    reset(arm)
    arm.animation_data.action = None
    bpy.context.view_layer.update()


def drape_hair(hair, item, arm, rings, radius, centre):
    """Add an over_A06 key resting `hair` on the scarf in every sampled pose.

    The hair is rigid on Head, so each posed scarf centreline maps into the Head rest
    frame; the union of those loops is the obstacle. Hair within `radius + gap` of the
    union rises vertically onto its top surface (the highest tube top in its column),
    so the bob rests on the scarf. Each lift spreads to hair within DRAPE['spread']
    (smoothstep falloff) so the layers of a lock rise together.
    """
    rest_head = arm.matrix_world @ arm.data.bones['Head'].matrix_local
    samples = []
    for _ in pose_samples(arm):
        points, _ = world_mesh(item)
        loop = [sum(points[i * SIDES:(i + 1) * SIDES], Vector()) / SIDES for i in range(rings)]
        to_rest = rest_head @ (arm.matrix_world @ arm.pose.bones['Head'].matrix).inverted()
        loop = [to_rest @ c for c in loop]
        for i, a in enumerate(loop):
            b = loop[(i + 1) % rings]
            steps = max(1, math.ceil((b - a).length / DRAPE['step']))
            samples += [a.lerp(b, k / steps) for k in range(steps)]
    reach = radius + DRAPE['gap']
    near, column = KDTree(len(samples)), KDTree(len(samples))
    for i, c in enumerate(samples):
        near.insert(c, i)
        column.insert((c.x, c.y, 0), i)
    near.balance()
    column.balance()
    base, _ = world_mesh(hair)  # Rest pose with the existing keys applied.
    lift = [0.0] * len(base)
    for i, p in enumerate(base):
        if not near.find_range(p, reach):
            continue
        top = max(samples[j].z + math.sqrt(max(0.0, reach * reach - d * d))
                  for _, j, d in column.find_range((p.x, p.y, 0), reach))
        lift[i] = max(0.0, top - p.z)
    lifted = [i for i, value in enumerate(lift) if value > 0]
    spread = lift[:]
    if lifted:
        origin = KDTree(len(lifted))
        for i in lifted:
            origin.insert(base[i], i)
        origin.balance()
        for i, p in enumerate(base):
            for _, j, d in origin.find_range(p, DRAPE['spread']):
                spread[i] = max(spread[i], lift[j] * smoothstep(1 - d / DRAPE['spread']))
    remaining = sum(1 for i, p in enumerate(base) if near.find_range(p + Vector((0, 0, spread[i])), reach - 1e-4))
    if not hair.data.shape_keys:
        hair.shape_key_add(name='Basis', from_mix=False)
    key = hair.shape_key_add(name='over_A06', from_mix=False)
    to_local = hair.matrix_world.inverted().to_3x3()
    for i, block in enumerate(key.data):
        block.co = hair.data.vertices[i].co + to_local @ Vector((0, 0, spread[i]))
    key.value = 1.0
    return {'key': key.name, 'gap_m': DRAPE['gap'], 'spread_m': DRAPE['spread'], 'loop_samples': len(samples),
            'lifted_vertices': len(lifted), 'moved_vertices': sum(1 for v in spread if v > 1e-6),
            'max_lift_m': max(spread), 'remaining_within_gap': remaining}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit-blend', type=Path, required=True)
    parser.add_argument('--top', required=True)
    parser.add_argument('--body', default='body_underlayer_male')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--hair-over', help='Hair object that drapes over the scarf (H02_hair): not a scarf obstacle, gets an over_A06 key')
    parser.add_argument('--clearance', type=float, default=CLEAR, help='Tube surface to any obstacle after refinement (m)')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source_sha = digest(args.outfit_blend)
    bpy.ops.wm.open_mainfile(filepath=str(args.outfit_blend.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig_before, motion_before = rig_signature(arm), motion_signature()
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    top, body = bpy.data.objects[args.top], bpy.data.objects[args.body]
    masks = [(m, m.show_viewport) for m in body.modifiers if m.type == 'MASK']
    for m, _ in masks:
        m.show_viewport = False
    bpy.context.view_layer.update()
    skin = BVHTree.FromPolygons(*world_mesh(body))
    for m, state in masks:
        m.show_viewport = state
    cloth = BVHTree.FromPolygons(*world_mesh(top))
    centre = neck_axis(body, arm)
    # The scarf sits on the collar: measure the neck from the collar top upward.
    collar_top = max((top.matrix_world @ v.co).z for v in top.data.vertices
                     if ((top.matrix_world @ v.co).to_2d() - centre.to_2d()).length < .12)
    centre.z = collar_top
    rh, rv = TUBE['radius_horizontal'], TUBE['radius_vertical']
    neck_weights = SurfaceWeights(body, arm, SCARF_BONES)

    def scarf_weights(p):
        return neck_weights.at(Vector((centre.x + (p.x - centre.x) * .6, centre.y + (p.y - centre.y) * .6, p.z - rv))) or {'Spine': 1.0}

    def posed_skin(obj):
        for m, _ in masks:
            m.show_viewport = False
        bpy.context.view_layer.update()
        tree = BVHTree.FromPolygons(*world_mesh(obj))
        for m, state in masks:
            m.show_viewport = state
        return tree

    path = []
    for i in range(ANGLES):
        theta = 2 * math.pi * i / ANGLES - math.pi / 2  # Start at the front (-Y).
        direction = Vector((math.cos(theta), math.sin(theta), 0))
        # Horizontal clearance from the neck or collar at the tube's height band.
        reach = 0
        for dz in (0, .02, .04):
            origin = Vector((centre.x, centre.y, centre.z + dz))
            hit = skin.ray_cast(origin, direction, .3)[0]
            if hit is not None:
                reach = max(reach, (hit - origin).length)
        radius = reach + NECK_GAP + rh
        # Rest on whatever lies below the tube's footprint (shoulder, chest or collar).
        floor = -1
        for offset in (-rh * .8, 0, rh * .8):
            x = centre.x + direction.x * (radius + offset)
            y = centre.y + direction.y * (radius + offset)
            for tree in (cloth, skin):
                hit = tree.ray_cast(Vector((x, y, centre.z + .3)), Vector((0, 0, -1)), .6)[0]
                if hit is not None:
                    floor = max(floor, hit.z)
        path.append([centre.x + direction.x * radius, centre.y + direction.y * radius, floor + rv + REST_GAP])
    # Smooth the height around the loop (circular average), never lowering below the floor.
    floors = [p[2] for p in path]
    for _ in range(6):
        heights = [p[2] for p in path]
        for i in range(ANGLES):
            path[i][2] = max(floors[i], (heights[i - 1] + 2 * heights[i] + heights[(i + 1) % ANGLES]) / 4)
    path = [Vector(p) for p in path]

    # Refine at rest: push each centreline point out of every obstacle until the tube clears
    # it by CLEAR, then smooth. Obstacles: the top, the body and the head at rest and in each
    # test gesture (the scarf ignores the Head bone, so posed heads are fixed obstacles).
    heads = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('H01_head') or o.name.startswith('H02_'))
             and o.name != args.hair_over]
    obstacles = [cloth, skin]
    for _, axis, angle in [(None, None, 0), *GESTURES]:
        if axis is None:
            reset(arm)
        else:
            pose_gesture(arm, axis, angle)
        bpy.context.view_layer.update()
        obstacles += [BVHTree.FromPolygons(*world_mesh(h)) for h in heads]
    reset(arm)
    arm.animation_data.action = None
    bpy.context.view_layer.update()
    reach = max(rh, rv) + args.clearance
    for _ in range(12):
        moved = 0
        for i, p in enumerate(path):
            for tree in obstacles:
                q, _, _, d = tree.find_nearest(p)
                if q is not None and d < reach:
                    away = p - q
                    p = q + away.normalized() * reach if away.length > 1e-9 else p + Vector((0, 0, reach))
                    moved += 1
            path[i] = p
        path = [(path[i - 1] + path[i] * 2 + path[(i + 1) % ANGLES]) / 4 for i in range(ANGLES)]
        if not moved:
            break
    for _ in range(4):  # Final push without smoothing so clearance holds exactly.
        for i, p in enumerate(path):
            for tree in obstacles:
                q, _, _, d = tree.find_nearest(p)
                if q is not None and d < reach:
                    p = q + (p - q).normalized() * reach
            path[i] = p

    # Posed refinement: each centreline point moves with its own blended skin transform, so
    # check it against the posed top, head and body in every gait pose and map any push
    # back to rest through the inverse of that transform.
    weights = [scarf_weights(p) for p in path]
    rest_bones = {b.name: arm.matrix_world @ b.matrix_local for b in arm.data.bones}
    posed_pushes = 0

    def posed_refinement(rounds=3):
        """Push points clear in every gait pose; returns the number of pushes."""
        pushes = 0
        for _ in range(rounds):
            moved = 0
            for motion, frame in gait_samples():
                reset(arm)
                action = bpy.data.actions[motion]
                arm.animation_data.action = action
                arm.animation_data.action_slot = action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                bpy.context.view_layer.update()
                skins = {name: (arm.matrix_world @ arm.pose.bones[name].matrix) @ rest_bones[name].inverted() for name in SCARF_BONES}
                trees = [BVHTree.FromPolygons(*world_mesh(o)) for o in (top, *heads)] + [posed_skin(body)]
                for i, p in enumerate(path):
                    blend = Matrix([[0] * 4 for _ in range(4)])
                    for name, w in weights[i].items():
                        blend += skins[name] * w
                    posed = blend @ p
                    pushed = posed
                    for tree in trees:
                        q, _, _, d = tree.find_nearest(pushed)
                        if q is not None and d < reach:
                            pushed = q + (pushed - q).normalized() * reach
                    if (pushed - posed).length > 1e-6:
                        path[i] = blend.inverted() @ pushed
                        moved += 1
            pushes += moved
            if not moved:
                break
        return pushes

    # Pushes can slide points along the loop, bunching them into pinched knots with long
    # straight gaps between. Alternate the posed refinement with relaxing each point along
    # the loop only (toward its neighbours' midpoint), which evens the spacing without
    # moving the tube across the loop; a final posed refinement has the last word. (Ending on
    # a relaxed path checked against the centreline reach never settled: relaxed points sat
    # millimetres inside the reach while the tube itself stayed clear.)
    for _ in range(RELAX_CYCLES):
        posed_pushes += posed_refinement()
        for _ in range(RELAX):
            tangents = [(path[(i + 1) % ANGLES] - path[i - 1]).normalized() for i in range(ANGLES)]
            path[:] = [p + t * (((path[i - 1] + path[(i + 1) % ANGLES]) / 2 - p).dot(t))
                       for i, (p, t) in enumerate(zip(path, tangents))]
        weights[:] = [scarf_weights(p) for p in path]
    posed_pushes += posed_refinement()
    gaps = sorted((path[(i + 1) % ANGLES] - path[i]).length for i in range(ANGLES))
    spacing = {'min_m': gaps[0], 'median_m': gaps[ANGLES // 2], 'max_m': gaps[-1]}
    if spacing['max_m'] > MAX_GAP_RATIO * spacing['median_m']:
        raise RuntimeError(f'Scarf path spacing is uneven: {spacing}')
    reset(arm)
    arm.animation_data.action = None
    bpy.context.view_layer.update()

    ivory = material('A06 ivory scarf', IVORY, .92)
    navy = material('A06 navy scarf band', NAVY, .9)
    vertices, faces = tube_ring(path, rh, rv, 0, ANGLES - 1, True)
    scarf = mesh_object('A06 scarf', vertices, faces, [ivory])
    half = int(round(BAND['half_angle_deg'] / 360 * ANGLES))
    band_path = path[-half:] + path[:half + 1]
    bv, bf = tube_ring(band_path, rh + BAND['extra'], rv + BAND['extra'], 0, len(band_path) - 1, False)
    band = mesh_object('A06 band', bv, bf, [navy])
    for part in (scarf, band):
        assign(part, arm, scarf_weights)
    bpy.ops.object.select_all(action='DESELECT')
    scarf.select_set(True)
    band.select_set(True)
    bpy.context.view_layer.objects.active = scarf
    bpy.ops.object.join()
    item = bpy.context.object
    item.name, item.data.name = 'A06_loop_scarf_outfit', 'A06 loop scarf'
    for layer in list(item.data.uv_layers):
        item.data.uv_layers.remove(layer)
    limit_influences(item)
    item.modifiers.new('Scarf skin', 'ARMATURE').object = arm
    world = item.matrix_world.copy()
    item.parent = arm
    item.matrix_world = world
    drape = drape_hair(bpy.data.objects[args.hair_over], item, arm, ANGLES, max(rh, rv) + BAND['extra'], centre) if args.hair_over else None
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Outfit geometry changed'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before

    args.output_dir.mkdir(parents=True, exist_ok=True)
    blend_out = args.output_dir / 'outfit.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    heads = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('H01_head') or o.name.startswith('H02_'))]
    others = [o for o in bpy.data.objects if o.type == 'MESH' and o not in (body, item, *heads)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export_uv(args.output_dir / 'outfit.glb', [arm, masked, *heads, *others, item])
    export_uv(args.output_dir / 'A06.glb', [arm, item])
    bpy.data.objects.remove(masked, do_unlink=True)
    reset(arm)
    reviews = render_reviews(args.output_dir, Vector((0, 0, centre.z)))
    report = {'stage': 'A06 loop scarf on an assembled outfit; run outfit motion/head/export gates. Art review pending.',
              'source_outfit': str(args.outfit_blend), 'source_sha256': source_sha, 'top': args.top, 'builder_sha256': digest(__file__),
              'tube': TUBE, 'neck_gap_m': NECK_GAP, 'rest_gap_m': REST_GAP, 'clearance_m': args.clearance, 'head_gestures': [g[0] for g in GESTURES], 'posed_pushes': posed_pushes, 'relax_cycles': RELAX_CYCLES, 'path_spacing_m': spacing, 'band': BAND, 'hair_over': drape, 'neck_centre': list(centre),
              'path_heights': [round(p.z, 4) for p in path], 'path_radii': [round((p - centre).to_2d().length, 4) for p in path],
              'mesh': {'vertices': len(item.data.vertices), 'polygons': len(item.data.polygons),
                       'max_influences': max(len(v.groups) for v in item.data.vertices)},
              'blend': {str(blend_out): digest(blend_out)},
              'exports': {n: digest(args.output_dir / n) for n in ('outfit.glb', 'A06.glb')}, 'reviews': reviews}
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('A06_BUILD', json.dumps({k: report[k] for k in ('neck_centre', 'mesh')}))


if __name__ == '__main__':
    main()
