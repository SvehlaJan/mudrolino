"""Build the A02 folded-cuff beanie from each head's measured envelope.

Reference: A02 in assets/avatar/concepts/2026-10-04/catalog-a/04-accessories.png,
14-beanie-construction.png and the female accessory-fit sheet. A muted-navy knit
dome with a broad cornflower folded cuff; no pom-pom, no visible yarn.

Same envelope tooling as A01 (catalog_headwear_geometry.py): an `under_A02` hair
key flattens hair inside the beanie, the knit crown follows the worn envelope
with a little extra dome, and the cuff is a rounded fold swept around the head
from the band. The band sits lower than the cap's: just above the brows in front,
above the ears at the sides and low on the back of the skull. Every vertex is
weighted 1.0 to Head. Run verify_catalog_headwear.py afterwards.
"""
import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_headwear_plan import smoothstep
from catalog_headwear_geometry import build_headwear_study, mesh_object, grid_faces, orient_outward, solidify, HEADS

DESIGN = {
    'hair_layer': .008, 'tuck': .006, 'release': .02, 'band_hug': .015,
    'front_above_brow': .02, 'side_above_ear': .006, 'back_above_centre': -.02, 'front_rise_over_side': .01,
    'ease': .0025, 'dome': .005, 'knit': .004,
    'cuff_thickness': .011, 'cuff_height': .055, 'fold_rise': .003, 'cuff_bulge': .0012,
    'sectors': 128, 'rows': 30, 'top_gap_rad': .05,
    'colors': {'knit': (.028, .052, .105), 'cuff': (.12, .285, .66)},
    'ease_fn': lambda scale: lambda theta, t: DESIGN['ease'] + DESIGN['dome'] * scale * smoothstep((t - .3) / .7),
}


def build_crown(env, top, mats, start):
    """Knit dome from just above the cuff fold to the crown, following the worn envelope."""
    n, rows = DESIGN['sectors'], DESIGN['rows']
    vertices = []
    for r in range(rows):
        t = r / (rows - 1)
        for i in range(n):
            theta = 2 * math.pi * i / n - math.pi
            vertices.append(env.point(theta, env.elevation(theta, t, top, start), t))
    pole = len(vertices)
    vertices.append(env.point(0, math.pi / 2, 1))
    faces = grid_faces(rows, n, wrap=True) + [((rows - 1) * n + i, (rows - 1) * n + (i + 1) % n, pole) for i in range(n)]
    crown = mesh_object('A02 knit crown', vertices, faces, [mats['knit']])
    orient_outward(crown, env.centre)
    solidify(crown, DESIGN['knit'], 1)
    return crown


def cuff_profile(scale):
    """Closed-ish fold loop as (radial offset, height above band) pairs, inner side to inner side.

    Bottom: a flat half-ellipse fold from the crown's inner surface down to the
    band and out to the outer wall. Outer wall: gently bulged. Top: a round lip
    returning onto the crown's outer surface.
    """
    knit, thick = DESIGN['knit'], DESIGN['cuff_thickness'] * scale
    height, rise, bulge = DESIGN['cuff_height'] * scale, DESIGN['fold_rise'] * scale, DESIGN['cuff_bulge'] * scale
    outer = knit + thick
    fold_r = outer / 2
    profile = [(fold_r + fold_r * math.cos(a), rise + rise * math.sin(a))
               for a in [math.pi + math.pi * k / 10 for k in range(11)]]
    lip_r = (outer - (knit + .0004)) / 2
    lip_centre = (knit + .0004 + lip_r, height - lip_r)
    for k in range(1, 12):
        h = rise + (lip_centre[1] - rise) * k / 12
        profile.append((outer + bulge * math.sin(math.pi * k / 12), h))
    profile += [(lip_centre[0] + lip_r * math.cos(a), lip_centre[1] + lip_r * math.sin(a))
                for a in [math.pi * k / 10 for k in range(11)]]
    return profile, rise


def build_cuff(env, mats):
    profile, _ = cuff_profile(env.scale)
    n = DESIGN['sectors']
    vertices = []
    for offset, height in profile:
        for i in range(n):
            theta = 2 * math.pi * i / n - math.pi
            vertices.append(env.point(theta, env.band_elevation(theta, height), 0, offset))
    cuff = mesh_object('A02 folded cuff', vertices, grid_faces(len(profile), n, wrap=True), [mats['cuff']])
    orient_outward(cuff, env.centre)
    return cuff


def build_parts(env, mats):
    top = math.pi / 2 - DESIGN['top_gap_rad']
    _, rise = cuff_profile(env.scale)
    crown = build_crown(env, top, mats, rise)
    cuff = build_cuff(env, mats)
    return [crown, cuff], {'cuff_height_m': DESIGN['cuff_height'] * env.scale,
                           'cuff_thickness_m': DESIGN['cuff_thickness'] * env.scale}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', choices=sorted(HEADS), required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    report = build_headwear_study('A02', 'A02_folded_beanie', DESIGN, build_parts, args.base, args.output_dir,
                                  Path(__file__), crown_materials=['knit'])
    print('A02_FITTED', json.dumps({k: report[k] for k in ('base', 'band_heights_m', 'under_hat', 'mesh')}))


if __name__ == '__main__':
    main()
