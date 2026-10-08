"""Build A01 from each head's measured envelope; head-study sources stay unchanged.

The first A01 was a fixed half-ellipsoid scaled up to clear one lock of the
original H01 hair: it floated 9-12 cm above the hair and intersected the painted
H01 (docs/audits/2026-10-07-avatar-fit-and-tooling-audit.md). This revision:

1. Adds an `under_A01` shape key that flattens hair inside the crown to a thin
   layer over the skull (catalog_headwear_plan.under_hat_radius).
2. Builds the crown by offsetting the measured skull (ray casts from the skull
   centre) by that layer plus a small ease, above a band that tilts from the
   brow to the ear tops to the back of the skull.
3. Adds an arched rear opening with the adjustment strap, a curved brim with a
   navy underside, six panel seams and a crown button.

Every vertex is weighted 1.0 to Head. Writes the revision .blend, A01.glb, the
head with its under-hat key, a review assembly and a study report. Run
verify_catalog_headwear.py afterwards for the fit gate and motion sweeps.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_head import sphere
from catalog_headwear_plan import crown_ease
from catalog_headwear_geometry import build_headwear_study, mesh_object, orient_outward, solidify, HEADS

# Shared A01 design. Offsets are metres on an unscaled head; band offsets scale with the head.
DESIGN = {
    'hair_layer': .008, 'tuck': .006, 'release': .02, 'brim_tuck': .035, 'band_hug': .015,
    'front_above_brow': .02, 'side_above_ear': .006, 'back_above_centre': -.01, 'front_rise_over_side': .055,
    'ease': .0025, 'front_lift': .008, 'fabric': .003,
    'sectors': 128, 'rows': 30, 'top_gap_rad': .05,
    'opening_half_angle': .34, 'opening_height': .36, 'strap_height_fraction': .12, 'strap_overhang': .06,
    'brim_length_of_width': .30, 'brim_half_angle': math.radians(66), 'brim_pitch': math.radians(14),
    'brim_camber': .03, 'brim_thickness': .006,
    'colors': {'cap': (.86, .22, .040), 'seam': (.74, .165, .028), 'brim_under': (.028, .052, .105),
               'strap': (.12, .285, .66)},
    'ease_fn': lambda scale: lambda theta, t: crown_ease(theta, t, DESIGN['ease'], DESIGN['front_lift'] * scale),
}


def arch(theta, t):
    """Normalised position relative to the rear opening; inside when < 1."""
    dtheta = math.atan2(math.sin(theta - math.pi / 2), math.cos(theta - math.pi / 2))
    return dtheta / DESIGN['opening_half_angle'], t / DESIGN['opening_height']


def build_crown(env, top, mats):
    n, rows = DESIGN['sectors'], DESIGN['rows']
    params = [[(2 * math.pi * i / n - math.pi, r / (rows - 1)) for i in range(n)] for r in range(rows)]
    faces, removed = [], []
    for r in range(rows - 1):
        for i in range(n):
            j = (i + 1) % n
            quad = ((r, i), (r, j), (r + 1, j), (r + 1, i))
            theta_c = math.atan2(sum(math.sin(params[a][b][0]) for a, b in quad), sum(math.cos(params[a][b][0]) for a, b in quad))
            t_c = sum(params[a][b][1] for a, b in quad) / 4
            x, y = arch(theta_c, t_c)
            (removed if x * x + y * y < 1 else faces).append(quad)
    kept = {v for quad in faces for v in quad}
    boundary = kept & {v for quad in removed for v in quad}
    # Snap the opening's boundary vertices onto a smooth arch in (theta, t).
    for r, i in boundary:
        x, y = arch(*params[r][i])
        length = math.hypot(x, y) or 1.0
        x, y = x / length, max(0.0, y / length)
        params[r][i] = (math.pi / 2 + x * DESIGN['opening_half_angle'], y * DESIGN['opening_height'])
    index, vertices = {}, []
    for r, i in sorted(kept):
        theta, t = params[r][i]
        index[(r, i)] = len(vertices)
        vertices.append(env.point(theta, env.elevation(theta, t, top), t))
    pole = len(vertices)
    vertices.append(env.centre + Vector((0, 0, 1)) * env.radius(0, math.pi / 2, 1))
    polygons = [tuple(index[v] for v in quad) for quad in faces]
    polygons += [(index[(rows - 1, i)], index[(rows - 1, (i + 1) % n)], pole) for i in range(n)]
    crown = mesh_object('A01 fitted crown', vertices, polygons, [mats['cap']])
    orient_outward(crown, env.centre)
    solidify(crown, DESIGN['fabric'], 1)
    return crown


def build_brim(env, top, mats):
    cols, rows = 41, 12
    theta0, half = -math.pi / 2, DESIGN['brim_half_angle']
    width = (env.point(0, env.band_elevation(0), 0) - env.point(math.pi, env.band_elevation(math.pi), 0)).length
    length = DESIGN['brim_length_of_width'] * width
    vertices, faces = [], []
    for row in range(rows):
        v = row / (rows - 1)
        for col in range(cols):
            u = -1 + 2 * col / (cols - 1)
            theta = theta0 + u * half
            inner = env.point(theta, env.band_elevation(theta), 0, DESIGN['fabric'])
            outward = (inner - env.centre)
            outward.z = 0
            outward.normalize()
            reach = length * max(0.0, math.cos(u * math.pi / 2)) ** .55
            # Camber curves the brim down toward its sides; it fades with the reach so the ends meet the band.
            drop = v * reach * math.tan(DESIGN['brim_pitch']) + DESIGN['brim_camber'] * env.scale * u * u * v * reach / length
            vertices.append(inner + outward * reach * v - Vector((0, 0, drop)))
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            faces.append((a, a + 1, a + cols + 1, a + cols))
    brim = mesh_object('A01 fitted brim', vertices, faces, [mats['cap'], mats['brim_under']])
    bm = bmesh.new()
    bm.from_mesh(brim.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if sum(f.normal.z for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(brim.data)
    bm.free()
    solidify(brim, DESIGN['brim_thickness'], -1, material_offset=1)
    return brim, length


def build_strap(env, top, mats):
    half = DESIGN['opening_half_angle'] + DESIGN['strap_overhang']
    cols, rows = 25, 4
    vertices, faces = [], []
    for row in range(rows):
        t = DESIGN['strap_height_fraction'] * row / (rows - 1)
        for col in range(cols):
            theta = math.pi / 2 - half + 2 * half * col / (cols - 1)
            vertices.append(env.point(theta, env.elevation(theta, t, top), t, DESIGN['fabric'] + .0005))
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            faces.append((a, a + 1, a + cols + 1, a + cols))
    strap = mesh_object('A01 fitted adjustment strap', vertices, faces, [mats['strap']])
    orient_outward(strap, env.centre)
    solidify(strap, .003, 1)
    return strap


def build_seams(env, top, mats):
    seams = []
    for k in range(6):
        theta = -math.pi / 2 + k * math.pi / 3
        x, _ = arch(theta, 0)
        start = DESIGN['opening_height'] + .04 if abs(x) < 1 else .02
        points = [env.point(theta, env.elevation(theta, t, top), t, DESIGN['fabric'] + .0006)
                  for t in [start + (.985 - start) * s / 24 for s in range(25)]]
        curve = bpy.data.curves.new('A01 panel seam', 'CURVE')
        curve.dimensions, curve.bevel_depth, curve.bevel_resolution = '3D', .0009, 1
        spline = curve.splines.new('POLY')
        spline.points.add(len(points) - 1)
        for point, co in zip(spline.points, points):
            point.co = (*co, 1)
        obj = bpy.data.objects.new(curve.name, curve)
        bpy.context.collection.objects.link(obj)
        curve.materials.append(mats['seam'])
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        seams.append(bpy.context.object)
    return seams


def build_parts(env, mats):
    top = math.pi / 2 - DESIGN['top_gap_rad']
    crown = build_crown(env, top, mats)
    brim, brim_length = build_brim(env, top, mats)
    strap = build_strap(env, top, mats)
    seams = build_seams(env, top, mats)
    button = sphere('A01 crown button', tuple(env.centre + Vector((0, 0, env.radius(0, math.pi / 2, 1, DESIGN['fabric'] + .003 * env.scale)))),
                    (.011 * env.scale, .011 * env.scale, .005 * env.scale), mats['cap'], segments=16, rings=8)
    return [crown, brim, strap, *seams, button], {'brim_length_m': brim_length}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', choices=sorted(HEADS), required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    report = build_headwear_study('A01', 'A01_baseball_cap', DESIGN, build_parts, args.base, args.output_dir,
                                  Path(__file__), crown_materials=['cap'])
    print('A01_FITTED', json.dumps({k: report[k] for k in ('base', 'band_heights_m', 'brim_length_m', 'under_hat', 'mesh')}))


if __name__ == '__main__':
    main()
