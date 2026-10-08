"""A05 orange backpack with navy straps, fitted on an assembled outfit's top.

The pack is a rounded box (superellipsoid) centred on the spine, PACK_GAP behind the
most backward point of the top under its footprint. It takes the body's spine-only
weights (Hips/Spine02/Spine01/Spine) at the matching back point, so it bends with the
back but never with the shoulders. Straps are padded bands projected onto the top
garment: from inside the pack, over the shoulder, down the chest, round the side below
the arm at the waist and back into the pack's lower corner. They inherit the garment's weights,
blended into the pack's near their ends. Pack, pocket, zip, loop and straps are one
object, so the sewn-in strap ends do not count as contact.

Usage: blender_cli.py build_catalog_a05.py --outfit-dir outfits/O06-head130-T06-B02-F02
  --top T06_henley_outfit --output-dir A05/fitting-revisions/o06-head130/male
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
from mathutils.geometry import barycentric_transform
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from build_catalog_head import material
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_geometry import mesh_object, render_reviews

PACK = {'half_width': .150, 'half_height': .170, 'half_depth': .060, 'exponent': 3.2, 'top': 1.355}
PACK_GAP = .014
POCKET = {'half_width': .105, 'half_height': .075, 'half_depth': .030, 'drop': .085}
STRAP = {'width': .046, 'thickness': .010, 'gap': .004, 'blend': .05, 'clearance': .004}
SPINE_BONES = ('Hips', 'Spine02', 'Spine01', 'Spine')
# Strap control points for the character's left side (mirrored for the right): into the
# pack top, over the shoulder clear of the neck, down the chest, round the side at the
# waist, into the pack's lower corner. The swinging elbow/forearm brushes the side
# segment in the walk; the user accepted that contact (2026-10-08, class arm-brush).
# The middle points are projected onto the top garment.
STRAP_PATH = [(.090, .20, 1.315), (.105, .150, 1.390), (.125, .070, 1.430), (.130, -.030, 1.420),
              (.130, -.120, 1.330), (.140, -.150, 1.220), (.155, -.140, 1.110), (.170, -.080, 1.035),
              (.175, .020, 1.025), (.160, .110, 1.060), (.125, .200, 1.100)]
ORANGE, NAVY, IVORY = (.90, .245, .045), (.026, .049, .106), (.86, .82, .71)  # T02 tangerine, T06 navy.


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def superellipsoid(name, centre, half, exponent, mat, rings=24, segments=40):
    """Closed rounded box; `half` = (x, y, z) half sizes, exponent 2 is an ellipsoid."""
    def f(c, e):
        return math.copysign(abs(c) ** (2 / e), c)
    vertices, faces = [], []
    for i in range(1, rings):
        phi = math.pi * i / rings - math.pi / 2
        for j in range(segments):
            theta = 2 * math.pi * j / segments
            vertices.append((centre[0] + half[0] * f(math.cos(phi), exponent) * f(math.cos(theta), exponent),
                             centre[1] + half[1] * f(math.cos(phi), exponent) * f(math.sin(theta), exponent),
                             centre[2] + half[2] * f(math.sin(phi), exponent)))
    bottom, top = len(vertices), len(vertices) + 1
    vertices += [(centre[0], centre[1], centre[2] - half[2]), (centre[0], centre[1], centre[2] + half[2])]
    for i in range(rings - 2):
        for j in range(segments):
            a, b = i * segments + j, i * segments + (j + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    for j in range(segments):
        faces.append((bottom, (j + 1) % segments, j))
        last = (rings - 2) * segments
        faces.append((top, last + j, last + (j + 1) % segments))
    return mesh_object(name, vertices, faces, [mat])


def tube(name, path, radius, mat, sides=10):
    vertices, faces = [], []
    for i, point in enumerate(path):
        a, b = Vector(path[max(0, i - 1)]), Vector(path[min(len(path) - 1, i + 1)])
        tangent = (b - a).normalized()
        side = tangent.cross(Vector((0, 0, 1)))
        if side.length < 1e-6:
            side = tangent.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(tangent)
        for k in range(sides):
            t = 2 * math.pi * k / sides
            vertices.append(tuple(Vector(point) + radius * (side * math.cos(t) + up * math.sin(t))))
    for i in range(len(path) - 1):
        for k in range(sides):
            faces.append((i * sides + k, i * sides + (k + 1) % sides, (i + 1) * sides + (k + 1) % sides, (i + 1) * sides + k))
    return mesh_object(name, vertices, faces, [mat])


def catmull_rom(points, samples_per_span=8):
    pts = [Vector(p) for p in points]
    pts = [pts[0] * 2 - pts[1], *pts, pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(samples_per_span):
            t = k / samples_per_span
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-2])
    return out


class SurfaceWeights:
    """Barycentric bone weights of an object's surface, optionally restricted to some bones."""

    def __init__(self, obj, arm, bones=None):
        obj.data.calc_loop_triangles()
        self.obj, self.bones = obj, bones
        self.points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        self.triangles = [tuple(t.vertices) for t in obj.data.loop_triangles]
        self.tree = BVHTree.FromPolygons(self.points, self.triangles, all_triangles=True)
        self.names = {g.index: g.name for g in obj.vertex_groups}
        self.bone_names = {b.name for b in arm.data.bones}

    def nearest(self, p):
        point, normal, index, _ = self.tree.find_nearest(p)
        return point, normal, index

    def at(self, p, surface_point=None):
        point, _, index = self.nearest(p) if surface_point is None else (surface_point, None, self.nearest(surface_point)[2])
        ids = self.triangles[index]
        a, b, c = [self.points[i] for i in ids]
        bary = barycentric_transform(point, a, b, c, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
        factors = [max(0, min(1, value)) for value in bary]
        total = sum(factors) or 1
        weights = {}
        for i, factor in zip(ids, factors):
            for w in self.obj.data.vertices[i].groups:
                name = self.names[w.group]
                if name in self.bone_names and (self.bones is None or name in self.bones):
                    weights[name] = weights.get(name, 0) + w.weight * factor / total
        norm = sum(weights.values())
        return {k: v / norm for k, v in weights.items()} if norm > 0 else {}


def mix(a, b, t):
    out = {k: a.get(k, 0) * (1 - t) + b.get(k, 0) * t for k in set(a) | set(b)}
    total = sum(out.values())
    return {k: v / total for k, v in out.items() if v > 1e-6}


def assign(obj, arm, weight_fn):
    for bone in arm.data.bones:
        obj.vertex_groups.new(name=bone.name)
    empty = 0
    for v in obj.data.vertices:
        weights = {k: w for k, w in weight_fn(obj.matrix_world @ v.co).items() if w > 1e-6}
        empty += not weights
        for name, w in weights.items():
            obj.vertex_groups[name].add([v.index], w, 'REPLACE')
    if empty:
        raise RuntimeError(f'{obj.name}: {empty} vertices got no bone weight')


def limit_influences(obj, count=4):
    for v in obj.data.vertices:
        # Copy first: element references go stale once a group is removed.
        groups = sorted(((g.group, g.weight) for g in v.groups), key=lambda g: -g[1])
        for group, _ in groups[count:]:
            obj.vertex_groups[group].remove([v.index])
        kept = groups[:count]
        total = sum(w for _, w in kept)
        for group, w in kept:
            obj.vertex_groups[group].add([v.index], w / total, 'REPLACE')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit-dir', type=Path, required=True)
    parser.add_argument('--top', required=True, help='Top garment object in the outfit')
    parser.add_argument('--body', default='body_underlayer_male')
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = args.outfit_dir / 'outfit.blend'
    source_sha = digest(source)
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig_before, motion_before = rig_signature(arm), motion_signature()
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    top, body = bpy.data.objects[args.top], bpy.data.objects[args.body]
    top_tree = BVHTree.FromPolygons(*world_mesh(top))

    # Pack placement: behind the most backward point of the top under the pack footprint.
    bottom = PACK['top'] - 2 * PACK['half_height']
    back = []
    for i in range(9):
        for k in range(9):
            x = -PACK['half_width'] + 2 * PACK['half_width'] * i / 8
            z = bottom + 2 * PACK['half_height'] * k / 8
            hit = top_tree.ray_cast(Vector((x, 1, z)), Vector((0, -1, 0)))[0]
            if hit is not None:
                back.append(hit.y)
    panel_y = max(back) + PACK_GAP
    centre = Vector((0, panel_y + PACK['half_depth'], PACK['top'] - PACK['half_height']))

    orange = material('A05 orange backpack', ORANGE, .85)
    navy = material('A05 navy straps', NAVY, .85)
    ivory = material('A05 ivory zip', IVORY, .7)
    pack = superellipsoid('A05 pack', centre, (PACK['half_width'], PACK['half_depth'], PACK['half_height']), PACK['exponent'], orange)
    pocket_centre = centre + Vector((0, PACK['half_depth'] - POCKET['half_depth'] * .35, -POCKET['drop']))
    pocket = superellipsoid('A05 pocket', pocket_centre, (POCKET['half_width'], POCKET['half_depth'], POCKET['half_height']), 3.0, orange)
    # Zip along the pocket's upper edge, just proud of its outer face, with two pulls.
    zip_path = []
    for i in range(17):
        u = -1 + 2 * i / 16
        x = POCKET['half_width'] * .82 * u
        z = pocket_centre.z + POCKET['half_height'] * .55 * (1 - .25 * u * u)
        zip_path.append((x, pocket_centre.y + POCKET['half_depth'] * .98, z))
    zipper = tube('A05 pocket zip', zip_path, .0035, ivory)
    pulls = [superellipsoid('A05 zip pull', (s * .02, pocket_centre.y + POCKET['half_depth'] + .004, zip_path[8][2] - .012),
                            (.006, .004, .012), 2.6, ivory, rings=8, segments=12) for s in (-1, 1)]
    # Carry loop: a flattened half ring standing on the top.
    loop_path = [(.035 * math.cos(math.pi * i / 12), centre.y, PACK['top'] - .006 + .032 * math.sin(math.pi * i / 12)) for i in range(13)]
    loop = tube('A05 carry loop', loop_path, .007, orange)

    spine = SurfaceWeights(body, arm, SPINE_BONES)

    def pack_weights(p):
        # Weights of the body's back at the same height and side, spine bones only.
        hit = top_tree.ray_cast(Vector((p.x * .6, 1, p.z)), Vector((0, -1, 0)))[0]
        target = Vector((p.x * .6, (hit.y if hit else panel_y) - .02, p.z))
        return spine.at(target) or {'Spine01': 1.0}
    for part in (pack, pocket, zipper, *pulls, loop):
        assign(part, arm, pack_weights)

    cloth = SurfaceWeights(top, arm)
    straps = []
    for side in (1, -1):
        control = [(side * x, y, z) for x, y, z in STRAP_PATH]
        path = catmull_rom(control)
        projected, normals = [], []
        for p in path:
            if p.y > panel_y - .005:  # Inside the pack: keep the path, it is sewn in there.
                projected.append(p.copy())
                normals.append(Vector((0, -1, 0)))
                continue
            # Cast from outside toward a torso axis point just below, so the hit is the top's
            # outer layer (control points may lie inside the cloth) and the normal faces out.
            # From the torso axis outward through the top only: its first hit is the inner
            # layer and a second hit within 6 mm the outer one. Anything further out (a sleeve
            # hanging beside the torso) is ignored.
            axis = Vector((0, .01, p.z - .05))
            direction = (p - axis).normalized()
            hit, normal = top_tree.ray_cast(axis, direction, 1)[:2]
            outer = top_tree.ray_cast(hit + direction * 1e-4, direction, .006)[:2]
            if outer[0] is not None:
                hit, normal = outer
            if normal.dot(direction) < 0:
                normal = -normal
            projected.append(hit + normal * (STRAP['thickness'] / 2 + STRAP['gap']))
            normals.append(normal)
        # Flat band: width across the path on the surface, thickness along the normal.
        vertices, faces = [], []
        for i, (p, n) in enumerate(zip(projected, normals)):
            a, b = projected[max(0, i - 1)], projected[min(len(projected) - 1, i + 1)]
            tangent = (b - a).normalized()
            across = tangent.cross(n).normalized()
            n = across.cross(tangent).normalized()
            for k in range(12):
                t = 2 * math.pi * k / 12
                c, s = math.cos(t), math.sin(t)
                # Rounded rectangle: squash a circle toward the band's corners.
                cx = math.copysign(abs(c) ** .45, c) * STRAP['width'] / 2
                sy = math.copysign(abs(s) ** .45, s) * STRAP['thickness'] / 2
                vertices.append(tuple(p + across * cx + n * sy))
        rings = len(projected)
        for i in range(rings - 1):
            for k in range(12):
                faces.append((i * 12 + k, i * 12 + (k + 1) % 12, (i + 1) * 12 + (k + 1) % 12, (i + 1) * 12 + k))
        # A flat band digs into curved surfaces at its edges. Measure each band vertex
        # radially from the torso axis against the top's torso layer (as in the
        # projection; a sleeve further out is never the surface under the band) and lift it
        # to the clearance.
        for i, ring_point in enumerate(projected):
            if ring_point.y > panel_y - .005:
                continue
            for k in range(12):
                v = Vector(vertices[i * 12 + k])
                axis = Vector((0, .01, v.z - .05))
                direction = (v - axis).normalized()
                hit = top_tree.ray_cast(axis, direction, 1)[0]
                if hit is None:
                    continue
                outer = top_tree.ray_cast(hit + direction * 1e-4, direction, .006)[0]
                surface = (outer if outer is not None else hit) - axis
                height = (v - axis).dot(direction) - surface.dot(direction)
                # Where the strap blends into the pack's spine weights it moves apart from the
                # hip-weighted cloth in the walk, so it gets up to twice the clearance there.
                near_pack = max(0, min(1, (v.y - (panel_y - STRAP['blend'])) / STRAP['blend']))
                clearance = STRAP['clearance'] * (1 + near_pack)
                if height < clearance:
                    vertices[i * 12 + k] = tuple(v + direction * (clearance - height))
        if side == 1:
            strap_rings = [[[round(c, 4) for c in pt], [round(c, 3) for c in nn]] for pt, nn in zip(projected, normals)]
        strap = mesh_object('A05 strap', vertices, faces, [navy])

        def strap_weights(p):
            # Weights of the torso layer under the strap, found radially as in the projection:
            # the nearest cloth can be a sleeve hanging beside the torso, which would make the
            # strap swing with the arm.
            axis = Vector((0, .01, p.z - .05))
            direction = (p - axis).normalized()
            hit = top_tree.ray_cast(axis, direction, 1)[0]
            garment = cloth.at(p, surface_point=hit) if hit is not None else cloth.at(p)
            near_pack = max(0, min(1, (p.y - (panel_y - STRAP['blend'])) / STRAP['blend']))
            return mix(garment, pack_weights(p), near_pack) if near_pack > 0 else garment
        assign(strap, arm, strap_weights)
        straps.append(strap)

    parts = [pack, pocket, zipper, *pulls, loop, *straps]
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = pack
    bpy.ops.object.join()
    item = bpy.context.object
    item.name = 'A05_backpack_outfit'
    item.data.name = 'A05 backpack'
    for layer in list(item.data.uv_layers):
        item.data.uv_layers.remove(layer)
    limit_influences(item)
    item.modifiers.new('Backpack skin', 'ARMATURE').object = arm
    world = item.matrix_world.copy()
    item.parent = arm
    item.matrix_world = world
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Outfit geometry changed'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before

    args.output_dir.mkdir(parents=True, exist_ok=True)
    blend_out = args.output_dir / 'outfit.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    heads = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('H01_head') or o.name.startswith('H02_'))]
    garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit') and o is not item]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export_uv(args.output_dir / 'outfit.glb', [arm, masked, *heads, *garments, item])
    export_uv(args.output_dir / 'A05.glb', [arm, item])
    bpy.data.objects.remove(masked, do_unlink=True)
    reset(arm)
    reviews = render_reviews(args.output_dir, Vector((0, .1, 1.2)))
    report = {'stage': 'A05 backpack on an assembled outfit; run outfit motion/export gates. Art review pending.',
              'source_outfit': str(source), 'source_sha256': source_sha, 'top': args.top,
              'builder_sha256': digest(__file__), 'pack': PACK, 'pocket': POCKET, 'strap': STRAP, 'pack_gap_m': PACK_GAP,
              'panel_y': panel_y, 'centre': list(centre), 'strap_control_left': STRAP_PATH, 'strap_rings_left': strap_rings,
              'mesh': {'vertices': len(item.data.vertices), 'polygons': len(item.data.polygons),
                       'max_influences': max(len(v.groups) for v in item.data.vertices)},
              'blend': {str(blend_out): digest(blend_out)},
              'exports': {n: digest(args.output_dir / n) for n in ('outfit.glb', 'A05.glb')}, 'reviews': reviews}
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('A05_BUILD', json.dumps({k: report[k] for k in ('panel_y', 'mesh')}))


if __name__ == '__main__':
    main()
