"""A03 round / A04 soft-square glasses fitted to the painted eyes of a verified head study.

Lenses enclose each painted eye opening (catalog_glasses_plan.frame_layout). The flat
frame sits in front of the most forward skin under the lenses and bridge by FACE_GAP.
Temples run back from the outer rims to the ear tops, pushed outward wherever the
skull would be closer than TEMPLE_GAP, then bend down behind the ear. Temples may pass
into hair, as real temples do. Frames only: no lens geometry (transparent lenses sort
badly at runtime). Everything binds rigidly to Head.

Usage: blender_cli.py build_catalog_glasses.py --id A03|A04 --base male|female --output-dir DIR
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from build_catalog_head import material
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_geometry import HEADS, digest, mesh_object, render_reviews, measured_ear_top
from catalog_glasses_plan import DESIGNS, frame_layout, lens_outline, temple_path

FACE_GAP = .006  # Unscaled clearance between the frame's back and the most forward skin.
TEMPLE_GAP = .003  # Unscaled clearance between a temple and the skull.
EAR_DROP = .022  # Unscaled drop of the temple tip behind the ear.
SIDES = 10


def skin_tree(objects):
    """BVH of skin faces across the head objects: hair objects and hair materials are skipped."""
    points, faces = [], []
    for obj in objects:
        if 'hair' in obj.name.lower():
            continue
        p, f = world_mesh(obj)
        keep = [face for face, poly in zip(f, obj.data.polygons)
                if not (obj.data.materials and obj.data.materials[poly.material_index]
                        and 'hair' in obj.data.materials[poly.material_index].name.lower())]
        faces += [tuple(len(points) + i for i in face) for face in keep]
        points += p
    return BVHTree.FromPolygons(points, faces)


def outer_x(tree, y, z, side):
    """Outermost skin x on one side at (y, z), ears included, or None."""
    hit = tree.ray_cast(Vector((side * .6, y, z)), Vector((-side, 0, 0)))[0]
    return hit.x if hit is not None else None


def front_y(tree, x, z):
    """Most forward (smallest y) skin point at (x, z), or None."""
    hit = tree.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)))[0]
    return hit.y if hit is not None else None


def sweep(name, path, closed, axes, half_a, half_b, mat):
    """Elliptical tube along `path`; axes[i] = (a_dir, b_dir) unit vectors of the section."""
    vertices, faces = [], []
    for point, (a, b) in zip(path, axes):
        for k in range(SIDES):
            t = 2 * math.pi * k / SIDES
            vertices.append(tuple(Vector(point) + a * (half_a * math.cos(t)) + b * (half_b * math.sin(t))))
    rings = len(path)
    for i in range(rings if closed else rings - 1):
        j = (i + 1) % rings
        for k in range(SIDES):
            m = (k + 1) % SIDES
            faces.append((i * SIDES + k, i * SIDES + m, j * SIDES + m, j * SIDES + k))
    if not closed:  # Cap both ends with fans.
        for ring, flip in ((0, True), (rings - 1, False)):
            centre = len(vertices)
            vertices.append(tuple(path[ring]))
            for k in range(SIDES):
                a, b = ring * SIDES + k, ring * SIDES + (k + 1) % SIDES
                faces.append((centre, b, a) if flip else (centre, a, b))
    obj = mesh_object(name, vertices, faces, [mat])
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def path_axes(path, up=Vector((0, 0, 1))):
    """Section axes along an open path: a = horizontal normal, b = up-ish normal."""
    axes = []
    for i in range(len(path)):
        a, b = Vector(path[max(0, i - 1)]), Vector(path[min(len(path) - 1, i + 1)])
        tangent = (b - a).normalized()
        side = tangent.cross(up)
        if side.length < 1e-6:
            side = tangent.cross(Vector((0, 1, 0)))
        side.normalize()
        axes.append((side, side.cross(tangent).normalized()))
    return axes


def build(item_id, base, output_dir):
    config = HEADS[base]
    design = DESIGNS[item_id]
    source = config['study'] / config['blend']
    landmarks = json.loads((config['study'] / 'head-landmarks.json').read_text())
    if json.loads((config['study'] / 'verification-report.json').read_text())['status'] != 'passed':
        raise RuntimeError('Fit glasses only to a verified head study')
    source_hashes = {str(p): digest(p) for p in (source, config['study'] / 'head-landmarks.json', config['study'] / 'verification-report.json')}
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig_before, motion_before = rig_signature(arm), motion_signature()
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    heads = [bpy.data.objects[n] for n in config['head_objects']]
    skull = bpy.data.objects[config['skull'][0]]
    tree = skin_tree(heads)
    scale = landmarks['scale']
    layout = frame_layout(landmarks['head'], item_id, landmarks['pivot'], scale)
    outline = lens_outline(layout['exponent'], layout['lens_half_width'], layout['lens_half_height'])
    rim = layout['rim']

    # Frame plane: in front of every skin point under the lenses and the bridge.
    samples = []
    for cx, cz in layout['centres']:
        for u, v in outline:
            # Out to the rim's outer edge, which reaches down the sides of the nose.
            outer = 1 + 1.2 * rim['radial'] / math.hypot(u, v)
            for f in (outer, 1.0, .66, .33, 0.0):
                samples.append((cx + f * u, cz + f * v))
    inner = layout['centres'][1][0] + layout['lens_half_width']
    for i in range(9):
        x = inner + (2 * -inner) * i / 8
        for dz in (0, layout['bridge_rise'], layout['lens_half_height'] * .4):
            samples.append((x, layout['centres'][0][1] + dz))
    hits = [front_y(tree, x, z) for x, z in samples]
    forward = min(h for h in hits if h is not None)
    frame_y = forward - FACE_GAP * scale - rim['depth']

    mat = material(f'{item_id} frame', design['color'], .55)
    parts = []
    normal = Vector((0, -1, 0))
    for side, (cx, cz) in zip((1, -1), layout['centres']):
        path, axes = [], []
        for i, (u, v) in enumerate(outline):
            path.append((cx + u, frame_y, cz + v))
            pu, pv = outline[i - 1], outline[(i + 1) % len(outline)]
            tangent = Vector((pv[0] - pu[0], 0, pv[1] - pu[1])).normalized()
            radial = tangent.cross(normal).normalized()
            if radial.dot(Vector((u, 0, v))) < 0:
                radial.negate()
            axes.append((radial, normal))
        parts.append(sweep(f'{item_id} rim', path, True, axes, rim['radial'], rim['depth'], mat))

    # Bridge: an arc between the inner rim points, rising by bridge_rise at the middle.
    left_inner = layout['centres'][0][0] - layout['lens_half_width']
    z0 = layout['centres'][0][1] + layout['lens_half_height'] * .25
    bridge = [(left_inner - 2 * left_inner * i / 10, frame_y,
               z0 + layout['bridge_rise'] * math.sin(math.pi * i / 10)) for i in range(11)]
    parts.append(sweep(f'{item_id} bridge', bridge, False, path_axes(bridge, Vector((0, -1, 0))),
                       rim['radial'] * .85, rim['depth'] * .85, mat))

    # Temples: hinge at the outer rim, back to the ear top, clear of the skull.
    # The temple's vertical half size is temple['width']; it rests just above the ear top.
    ear_z = max(landmarks['ear_top_z'], measured_ear_top(skull, landmarks)) + layout['temple']['width'] + TEMPLE_GAP * scale
    centre_y = landmarks['skull_centre'][1]
    temples = []
    for side, (cx, cz) in zip((1, -1), layout['centres']):
        hinge_z = cz + layout['lens_half_height'] * .35
        hinge = (cx + side * (layout['lens_half_width'] + rim['radial'] * .5), frame_y + rim['depth'], hinge_z)
        ear_x = outer_x(tree, centre_y, ear_z, side)
        if ear_x is None:
            raise RuntimeError('No skull at ear height')
        ear = (ear_x + side * (TEMPLE_GAP * scale + layout['temple']['height']), centre_y, ear_z)
        path = temple_path(hinge, ear, EAR_DROP * scale, samples=32)
        pushed = []
        for x, y, z in path:
            # Outermost skin from outside, so ears count; the section's full height is checked.
            hits = [outer_x(tree, y, z + dz, side) for dz in (-layout['temple']['width'], 0, layout['temple']['width'])]
            hits = [h for h in hits if h is not None]
            need = (side * max(side * h for h in hits) + side * (TEMPLE_GAP * scale + layout['temple']['height'])) if hits else x
            pushed.append((side * max(side * x, side * need), y, z))
        # Keep the temple straight-ish: x never moves back inward once pushed out.
        for i in range(1, len(pushed)):
            if side * pushed[i][0] < side * pushed[i - 1][0] and i < len(path) - 3:
                pushed[i] = (pushed[i - 1][0], pushed[i][1], pushed[i][2])
        temples.append(pushed)
        parts.append(sweep(f'{item_id} temple', pushed, False, path_axes(pushed),
                           layout['temple']['height'], layout['temple']['width'], mat))

    for obj in parts:
        for bone in arm.data.bones:
            obj.vertex_groups.new(name=bone.name)
        obj.vertex_groups['Head'].add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    item = bpy.context.object
    item.name = item.data.name = f'{item_id}_glasses'
    for group in [g for g in item.vertex_groups if g.name != 'Head']:
        item.vertex_groups.remove(group)
    item.modifiers.new('Head attachment', 'ARMATURE').object = arm
    world = item.matrix_world.copy()
    item.parent = arm
    item.matrix_world = world
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Head study geometry changed'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before, 'Glasses build changed the rig or gaits'

    output_dir.mkdir(parents=True, exist_ok=True)
    blend_out = output_dir / f'{item_id}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    body = bpy.data.objects[config['body']]
    export_uv(output_dir / f'{item_id}.glb', [arm, item])
    if base == 'male':
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
        bpy.context.collection.objects.link(masked)
        masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
        masked.parent = arm
        garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
        export_uv(output_dir / 'outfit.glb', [arm, masked, *heads, *garments, item])
        bpy.data.objects.remove(masked, do_unlink=True)
    else:
        export_uv(output_dir / 'outfit.glb', [arm, body, *heads, item])
    reset(arm)
    eyes = layout['centres']
    target = Vector((0, frame_y + .05, (eyes[0][1] + eyes[1][1]) / 2))
    reviews = render_reviews(output_dir, target)
    here = Path(__file__)
    report = {
        'stage': f'{item_id} glasses fitted to painted eyes; run verify_catalog_glasses.py. Art review pending.',
        'item': item_id, 'object': item.name, 'base': base, 'head_study': str(config['study']), 'source_hashes': source_hashes,
        'builder': str(here), 'builder_sha256': digest(here), 'plan_sha256': digest(here.with_name('catalog_glasses_plan.py')),
        'blender': bpy.app.version_string, 'layout': layout, 'frame_y': frame_y, 'forward_skin_y': forward,
        'gaps_m': {'face': FACE_GAP * scale, 'temple': TEMPLE_GAP * scale, 'ear_drop': EAR_DROP * scale},
        'temples': temples, 'landmarks': landmarks,
        'mesh': {'vertices': len(item.data.vertices), 'polygons': len(item.data.polygons), 'attachment': 'Head, weight 1'},
        'baseline': {'rig': rig_before, 'motion': motion_before},
        'blend': {str(blend_out): digest(blend_out)},
        'exports': {name: digest(output_dir / name) for name in (f'{item_id}.glb', 'outfit.glb')},
        'reviews': reviews,
    }
    (output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('GLASSES_BUILD', json.dumps({k: report[k] for k in ('item', 'base', 'frame_y', 'mesh')}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', choices=sorted(DESIGNS), required=True)
    parser.add_argument('--base', choices=sorted(HEADS), required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    build(args.id, args.base, args.output_dir)


if __name__ == '__main__':
    main()
