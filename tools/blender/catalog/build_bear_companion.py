"""Build the isolated, parameterized bear B on the unchanged fitting rig."""
import argparse
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import bind_rigid, digest, ellipsoid, export_model, material, relaxed_pose, render_reviews, triangles, tube, write_json
from build_catalog_head_style_study import geometry_signature, motion_signature, rig_signature
from build_catalog_female_foundation_study import topology_signature
from build_catalog_t01 import reset, select


def front_y(config, x, z):
    center, radii = config['center'], config['radii']
    amount = max(.02, 1 - ((x - center[0]) / radii[0]) ** 2 - ((z - center[2]) / radii[2]) ** 2)
    return center[1] - radii[1] * math.sqrt(amount)


def create_head(design, mats, quality):
    segments, rings = design['quality'][quality]
    head = design['head']
    parts = [ellipsoid('Bear head surface', head['center'], head['radii'], mats['honey'], segments, rings)]
    ear = design['ears']
    for sign in (-1, 1):
        center = (sign * ear['centerX'], ear['centerY'], ear['centerZ'])
        parts.append(ellipsoid('Bear rounded ear', center, ear['radii'], mats['honey'], 24, 16))
        parts.append(ellipsoid('Bear inner ear', (center[0], center[1] - .054, center[2]), (.074, .031, .082), mats['innerEar'], 24, 16))
    muzzle = design['muzzle']
    parts.append(ellipsoid('Bear cream muzzle', muzzle['center'], muzzle['radii'], mats['muzzle'], 32, 20))
    eye = design['eyes']
    for sign in (-1, 1):
        x, z = sign * eye['centerX'], eye['centerZ']
        y = front_y(head, x, z) - .004
        parts.append(ellipsoid('Bear gentle eye', (x, y, z), eye['radii'], mats['eyes'], 24, 16))
        parts.append(ellipsoid('Bear eye glint', (x - .007, y - .014, z + .012), (.006, .003, .007), mats['glint'], 12, 8))
        points = []
        for index in range(15):
            t = index / 14
            px = x + (t - .5) * .083
            pz = z + .076 + .009 * math.sin(math.pi * t) - sign * (t - .5) * .010
            points.append((px, front_y(head, px, pz) - .007, pz))
        parts.append(tube('Bear gentle brow', points, .007, mats['brows']))
    nose_z = muzzle['center'][2] + muzzle['radii'][2] * .42
    nose_y = muzzle['center'][1] - muzzle['radii'][1] * .98
    parts.append(ellipsoid('Bear soft nose', (0, nose_y, nose_z), (.054, .029, .036), mats['nose'], 28, 16))
    points = []
    for index in range(25):
        x = -.079 + .158 * index / 24
        z = muzzle['center'][2] - .044 + .030 * (x / .079) ** 2
        points.append((x, front_y(muzzle, x, z) - .002, z))
    parts.append(tube('Bear closed smile', points, .0032, mats['nose']))
    center_points = [(0, front_y(muzzle, 0, z) - .003, z)
                     for z in [nose_z - .030, muzzle['center'][2] - .015, muzzle['center'][2] - .044]]
    parts.append(tube('Bear muzzle centre', center_points, .0028, mats['nose']))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = 'Bear_head'
    anchor = Vector(design.get('headScaleAnchor', (0, -.005, 1.430)))
    scale = design.get('headScale', 1)
    for vertex in result.data.vertices:
        vertex.co = anchor + (vertex.co - anchor) * scale
    result.data.update()
    result['bear_role'] = 'rigid-head-with-attached-face-and-ears'
    return result


def create_paws(body, arm, mat, config):
    scale = config['pawScale']
    depth = config.get('pawDepth', 1)
    width = config.get('pawWidth', 1)
    length = config.get('pawLength', 1)
    lift = config.get('pawLift', 0)
    paws = []
    covered = body.vertex_groups.new(name='covered_BearPaws')
    for side, sign in [('Left', 1), ('Right', -1)]:
        bone = arm.data.bones[f'{side}Hand']
        center = (bone.head_local + bone.tail_local) * .5 + Vector((0, -.006, -.007 + lift))
        paw = ellipsoid(f'Bear_{side.lower()}_paw', center, tuple(value * scale for value in (.044 * width, .048 * depth, .080 * length)), mat, 24, 16)
        thumb = ellipsoid(f'Bear_{side.lower()}_thumb', center + Vector((-sign * .031 * scale, -.009, .018)), tuple(value * scale for value in (.023, .035, .037)), mat, 20, 12)
        bpy.ops.object.select_all(action='DESELECT')
        paw.select_set(True)
        thumb.select_set(True)
        bpy.context.view_layer.objects.active = paw
        bpy.ops.object.join()
        bind_rigid(paw, arm, bone.name)
        paw['bear_role'] = 'soft-paw'
        paws.append(paw)
        group = body.vertex_groups.get(bone.name)
        hidden = [vertex.index for vertex in body.data.vertices
                  if any(weight.group == group.index and weight.weight >= .25 for weight in vertex.groups)]
        covered.add(hidden, 1, 'REPLACE')
    modifier = body.modifiers.new('Bear-specific reversible hand coverage', 'MASK')
    modifier.vertex_group = covered.name
    modifier.invert_vertex_group = True
    return paws


def smoothstep(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def bear_body_variant(body, arm, design):
    """Keep indices/weights while fitting a fuller exposed forearm and longer tee."""
    config = design['body']
    released = []
    upper_groups = {body.vertex_groups[f'{side}Arm'].index for side in ('Left', 'Right')}
    for vertex in body.data.vertices:
        if sum(weight.weight for weight in vertex.groups if weight.group in upper_groups) > .01:
            released.append(vertex.index)
    # Historical T01 coverage cut away exposed upper-arm skin. Restore the
    # bear's continuous anatomy and fit its smaller upper-arm contour instead.
    body.vertex_groups['covered_T01'].remove(released)
    for side in ('Left', 'Right'):
        bone = arm.data.bones[f'{side}Arm']
        group = body.vertex_groups[f'{side}Arm']
        axis = bone.tail_local - bone.head_local
        for vertex in body.data.vertices:
            influence = next((weight.weight for weight in vertex.groups if weight.group == group.index), 0)
            if influence <= 0:
                continue
            t = (vertex.co - bone.head_local).dot(axis) / axis.length_squared
            anchor = bone.head_local + axis * t
            vertex.co = anchor + (vertex.co - anchor) * (1 - config.get('upperArmInset', 0) * influence)
    for side in ('Left', 'Right'):
        bone = arm.data.bones[f'{side}ForeArm']
        group = body.vertex_groups[f'{side}ForeArm']
        hand = body.vertex_groups[f'{side}Hand']
        axis = bone.tail_local - bone.head_local
        for vertex in body.data.vertices:
            weights = {weight.group: weight.weight for weight in vertex.groups}
            influence = weights.get(group.index, 0)
            if influence <= 0:
                continue
            t = (vertex.co - bone.head_local).dot(axis) / axis.length_squared
            anchor = bone.head_local + axis * t
            blend = smoothstep(t / .18) * smoothstep((1 - t) / .15) * influence
            blend *= 1 - smoothstep(weights.get(hand.index, 0) / .25)
            vertex.co = anchor + (vertex.co - anchor) * (1 + (config['forearmGirth'] - 1) * blend)
    shirt = bpy.data.objects['T01_crew_tee_outfit']
    for vertex in shirt.data.vertices:
        z = vertex.co.z
        x = abs(vertex.co.x)
        side_blend = smoothstep((x - .10) / .08) * smoothstep((.34 - x) / .08)
        side_blend *= smoothstep((z - .99) / .10) * smoothstep((1.33 - z) / .10)
        vertex.co.x += (1 if vertex.co.x >= 0 else -1) * config['underarmEase'] * side_blend
        armpit = smoothstep((x - .09) / .04) * smoothstep((.25 - x) / .05)
        armpit *= smoothstep((z - 1.04) / .07) * smoothstep((1.32 - z) / .10)
        vertex.co.z -= config.get('underarmDrop', 0) * armpit
        vertex.co.y += config.get('upperBackEase', 0) * armpit * smoothstep(vertex.co.y / .055)
        vertex.co.y += config['teeBackEase'] * smoothstep((1.20 - z) / .22) * smoothstep(vertex.co.y / .06)
        if abs(vertex.co.x) > .26 or z > 1.22:
            continue
        blend = smoothstep((1.22 - z) / .28)
        vertex.co.x *= 1 + (config['teeWidth'] - 1) * blend
        vertex.co.y *= 1 + (config['teeDepth'] - 1) * blend
        vertex.co.z -= config['teeHemDrop'] * smoothstep((1.12 - z) / .19)
    body.data.update()
    shirt.data.update()


def main():
    started = time.monotonic()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--design', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--quality', choices=['proxy', 'final'], default='final')
    parser.add_argument('--preview-only', action='store_true')
    parser.add_argument('--lod', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    destination = args.output_dir / ('outfit-lod.blend' if args.lod else 'outfit.blend')
    if destination.resolve() == args.source.resolve():
        raise RuntimeError('The source is immutable; choose a separate output')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    design = json.loads(args.design.read_text())
    source_hash = digest(args.source)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    body = bpy.data.objects['body_underlayer_male']
    reset(arm)
    rig_before, motion_before = rig_signature(arm), motion_signature()
    body_topology = topology_signature(body)
    preserved = {obj.name: geometry_signature(obj) for obj in bpy.data.objects
                 if obj.type == 'MESH' and obj.name != 'H01_head' and obj != body}
    if not args.lod:
        previous = bpy.data.objects['H01_head']
        bpy.data.objects.remove(previous, do_unlink=True)
        mats = {name: material(f'Bear {name}', color, .35 if name in ('eyes', 'nose') else .82)
                for name, color in design['colors'].items()}
        body.data.materials.clear()
        body.data.materials.append(mats['honey'])
        head = create_head(design, mats, args.quality)
        bind_rigid(head, arm, 'Head')
        bear_body_variant(body, arm, design)
        create_paws(body, arm, mats['honey'], design['body'])
        neck = ellipsoid('Bear_neck', (0, -.005, 1.440), (.065, .063, .100), mats['honey'], 32, 20)
        bind_rigid(neck, arm, 'neck')
    for obj in bpy.data.objects:
        for modifier in obj.modifiers:
            if modifier.type == 'ARMATURE':
                modifier.use_deform_preserve_volume = False
    assert rig_signature(arm) == rig_before, 'Construction changed the shared rest rig'
    assert motion_signature() == motion_before, 'Construction changed canonical gaits'
    assert topology_signature(body) == body_topology, 'Construction changed coverage indices'
    for name, signature in preserved.items():
        if name == 'T01_crew_tee_outfit' and not args.lod:
            continue
        assert geometry_signature(bpy.data.objects[name]) == signature, f'Construction changed {name}'
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    reset(arm)
    counts = {obj.name: triangles(obj) for obj in meshes}
    report = {'source': str(args.source), 'source_sha256': source_hash,
              'design_sha256': digest(args.design), 'builder_sha256': digest(Path(__file__)),
              'helper_sha256': digest(Path(__file__).with_name('bear_companion_common.py')),
              'quality': args.quality, 'blender_version': bpy.app.version_string,
              'rig_sha256': rig_before, 'gaits_sha256': motion_before,
              'body_topology_sha256': body_topology, 'source_garments': preserved,
              'bear_garments': {name: geometry_signature(bpy.data.objects[name]) for name in preserved},
              'triangles': counts, 'total_triangles': sum(counts.values()),
              'ground_z': design['groundZ'], 'status': 'constructed candidate; fit/art/runtime acceptance pending'}
    if not args.preview_only:
        action = bpy.data.actions.get('celebrate') if args.lod else None
        if action:
            arm.animation_data_create()
            arm.animation_data.action = action
            if action.slots:
                arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(0)
        for action_to_keep in bpy.data.actions:
            action_to_keep.use_fake_user = True
        bpy.ops.wm.save_as_mainfile(filepath=str(destination.resolve()))
        runtime = args.output_dir / ('outfit-lod.glb' if args.lod else 'outfit.glb')
        export_model(runtime, arm, meshes, animation=bool(action))
        if args.lod:
            garments = [obj for obj in meshes if obj.name.startswith(('T01_', 'B01_', 'F01_'))]
            export_model(args.output_dir / 'body.glb', arm, [obj for obj in meshes if obj not in garments], animation=bool(action))
            export_model(args.output_dir / 'garments.glb', arm, garments, animation=bool(action))
        report['blend_sha256'] = digest(destination)
        report['glb_sha256'] = digest(runtime)
    relaxed_pose(arm, design['relaxedArmDegrees'])
    views = [('front', (0, -5, .1)), ('three-quarter', (-2.2, -5, .15))] if args.quality == 'proxy' else None
    report['reviews'] = render_reviews(args.output_dir, views=views, still=args.quality == 'final')
    report['elapsed_seconds'] = time.monotonic() - started
    report_path = args.output_dir / ('lod-report.json' if args.lod else 'construction-report.json')
    write_json(report_path, report)
    assert digest(args.source) == source_hash, 'The immutable input file changed'
    print(json.dumps({'triangles': report['total_triangles'], 'seconds': report['elapsed_seconds'],
                      'report': str(report_path)}))


if __name__ == '__main__':
    main()
