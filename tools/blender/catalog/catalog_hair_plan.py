"""Pure hair-variant rules for the reusable selfie heads (H03-H06); no bpy.

A hair variant is a radial shell over the scalp: for each direction from the skull
centre, the hair surface sits `offset` metres outside the scalp. Inside the hairline
the offset is the style's volume plus rounded curl or wave lumps; across the edge it
eases down to `-TUCK`, so the boundary is sunk just under the skin and no seam shows.
Directions are an azimuth measured from the front (the character faces -Y, so
`front_angle` is 0 at the face and pi at the back, mirrored left/right) and an
elevation above the horizontal. Distances are unscaled head metres; the builder
multiplies them by the head scale, as the landmarks in catalog_headwear_plan.py do.

CLI for tests: read one JSON request on stdin, print the JSON result.
"""
import json
import math
import sys

from catalog_headwear_plan import SKULL_CENTRE, finite, scaled_point, smoothstep

# Hair edges sink this far under the skin so the boundary never shows a seam.
TUCK = .0015

# Hairline: (degrees from the front, height above the unscaled skull centre). Hair grows
# above the line. Volume: radial thickness at the front, side, back and crown. `edge`
# (front/side/back) is the height over which hair grows from the tucked boundary to full
# volume: short for a crisp crop, long for a soft roll. Lumps: Fibonacci-spaced centres
# (`count` over the sphere), each a bump of angular `radius` and `height`, made up to
# `jitter` smaller per centre: 'ball' curls are round-topped with steep sides, 'soft'
# waves ease in; `stretch` widens them into waves and `tilt` (radians, mirrored
# left/right) sweeps the waves back.
STYLES = {
    'H03': {'label': 'rounded dark curls', 'base': 'female', 'grid': (200, 100),
            'hairline': [(0, .062), (35, .050), (60, .020), (75, -.060), (95, -.110), (130, -.090), (180, -.080)],
            'volume': {'front': .028, 'side': .048, 'back': .044, 'crown': .040},
            'edge': {'front': .024, 'side': .030, 'back': .050},
            'lumps': {'count': 260, 'radius': .150, 'height': .024, 'stretch': 1.0, 'tilt': 0.0, 'jitter': .35, 'profile': 'ball'},
            'color': (.030, .019, .014)},
    # H04's sides end just above the beanie band (the outer ear reaches .054 and the band
    # sits at .060), so the band rests on skin rather than across the hair edge.
    'H04': {'label': 'short dark crop', 'base': 'male', 'grid': (300, 110),
            'hairline': [(0, .108), (30, .100), (55, .076), (75, .046), (82, .046), (88, .068), (100, .068),
                         (115, .045), (140, -.020), (180, -.060)],
            'volume': {'front': .012, 'side': .006, 'back': .007, 'crown': .016},
            'edge': {'front': .010, 'side': .010, 'back': .012},
            'lumps': {'count': 1700, 'radius': .052, 'height': .006, 'stretch': 1.0, 'tilt': 0.0, 'jitter': .3, 'profile': 'ball'},
            'color': (.024, .016, .012)},
    'H05': {'label': 'silver waves', 'base': 'female', 'grid': (200, 100),
            'hairline': [(0, .066), (30, .058), (55, .030), (80, -.030), (100, -.070), (180, -.070)],
            'volume': {'front': .014, 'side': .030, 'back': .028, 'crown': .030},
            'edge': {'front': .035, 'side': .025, 'back': .040},
            'lumps': {'count': 120, 'radius': .220, 'height': .016, 'stretch': 2.4, 'tilt': .5, 'jitter': .3, 'profile': 'soft'},
            'color': (.50, .50, .52)},
    'H06': {'label': 'bald', 'base': 'male', 'hairline': None},
}


# Painted features that hair must never hide (paint_catalog_face.mjs, head millimetres from
# the unscaled skull centre, here as metres above it): eye centres, outer corners and tops,
# brows and their outer ends, and the mouth centre and corners. Mirrored left/right.
FACE_FEATURES = {
    'H01': [(.056, .026), (.089, .026), (.056, .056), (.056, .077), (.085, .077), (.028, -.053), (0, -.056)],
    'H02': [(.062, -.002), (.097, -.002), (.062, .029), (.062, .019), (.090, .019), (.031, -.090), (0, -.098)],
}


def style(style_id):
    if style_id not in STYLES:
        raise ValueError(f'Unknown hair style {style_id}')
    return STYLES[style_id]


def feature_points(head_id, pivot, scale):
    """World (x, z) of the painted features on a scaled head; y comes from the surface."""
    if head_id not in FACE_FEATURES:
        raise ValueError(f'Unknown head {head_id}')
    finite(scale, *pivot)
    rows = []
    for x, above in FACE_FEATURES[head_id]:
        for side in ((1, -1) if x else (1,)):
            point = scaled_point((side * x, SKULL_CENTRE[1], SKULL_CENTRE[2] + above), pivot, scale)
            rows.append([point[0], point[2]])
    return rows


def front_angle(x, y):
    """Angle in radians between the horizontal direction (x, y) and the front (-Y)."""
    finite(x, y)
    return math.atan2(abs(x), -y)


def hairline_height(style_id, angle):
    """Unscaled hairline height above the skull centre at `angle` radians from the front."""
    finite(angle)
    line = style(style_id)['hairline']
    if line is None:
        raise ValueError(f'{style_id} has no hair')
    degrees = min(180.0, max(0.0, math.degrees(abs(angle))))
    for (a0, h0), (a1, h1) in zip(line, line[1:]):
        if degrees <= a1:
            return h0 + (h1 - h0) * smoothstep((degrees - a0) / (a1 - a0))
    return line[-1][1]


def around(values, angle):
    """Blend front/side/back values by the angle from the front."""
    finite(angle)
    a = min(math.pi, abs(angle))
    if a <= math.pi / 2:
        return values['front'] + (values['side'] - values['front']) * smoothstep(a / (math.pi / 2))
    return values['side'] + (values['back'] - values['side']) * smoothstep((a - math.pi / 2) / (math.pi / 2))


def volume(style_id, angle, elevation):
    """Radial hair volume before lumps: front/side/back blended by azimuth, crown above."""
    finite(angle, elevation)
    v = style(style_id)['volume']
    level = around(v, angle)
    return level + (v['crown'] - level) * math.sin(max(0.0, elevation)) ** 2


def lump(distance, radius, profile='soft'):
    """Bump profile: 1 at the centre, 0 at `radius` and beyond.

    'soft' is flat at both ends (waves); 'ball' is a round cap with steep sides, so
    neighbouring curls meet in creases.
    """
    finite(distance, radius)
    if radius <= 0:
        raise ValueError('Lump radius must be positive')
    t = min(1.0, abs(distance) / radius)
    if profile == 'ball':
        return math.sqrt(1 - t * t)
    if profile == 'soft':
        return (1 - t * t) ** 2
    raise ValueError(f'Unknown lump profile {profile}')


def lump_scale(index, jitter):
    """Deterministic per-lump size factor in [1 - jitter, 1]."""
    if not 0 <= jitter < 1:
        raise ValueError('Jitter must be within [0, 1)')
    return 1 - jitter * ((index * 0.6180339887498949) % 1.0)


def lump_centres(count):
    """Unit vectors spread evenly over the sphere (Fibonacci lattice), deterministic."""
    if not isinstance(count, int) or count < 1:
        raise ValueError('Need a positive integer count')
    golden = math.pi * (3 - math.sqrt(5))
    rows = []
    for i in range(count):
        z = 1 - 2 * (i + .5) / count
        r = math.sqrt(max(0.0, 1 - z * z))
        rows.append([r * math.cos(golden * i), r * math.sin(golden * i), z])
    return rows


def offset(style_id, angle, elevation, above_line, lumps=0.0):
    """Radial hair offset over the scalp (unscaled metres).

    `above_line` is the scalp point's height over the hairline; `lumps` the lump field
    (0-1) there. Lumps scale with the local volume, so a crop's short sides stay smooth.
    Outside the line the offset is -TUCK; it reaches full volume plus lumps `edge` above
    it, so the shell grows smoothly out of the skin.
    """
    finite(angle, elevation, above_line, lumps)
    s = style(style_id)
    base = volume(style_id, angle, elevation)
    full = base + s['lumps']['height'] * lumps * base / max(s['volume'].values())
    return -TUCK + (full + TUCK) * smoothstep(above_line / around(s['edge'], angle))


OPERATIONS = {
    'feature_points': lambda r: feature_points(r['head'], r['pivot'], r['scale']),
    'front_angle': lambda r: front_angle(r['x'], r['y']),
    'hairline_height': lambda r: hairline_height(r['style'], r['angle']),
    'volume': lambda r: volume(r['style'], r['angle'], r['elevation']),
    'lump': lambda r: lump(r['distance'], r['radius'], r.get('profile', 'soft')),
    'lump_scale': lambda r: lump_scale(r['index'], r['jitter']),
    'lump_centres': lambda r: lump_centres(r['count']),
    'offset': lambda r: offset(r['style'], r['angle'], r['elevation'], r['above_line'], r.get('lumps', 0.0)),
}


def main():
    request = json.load(sys.stdin)
    try:
        result = OPERATIONS[request['op']](request)
    except (KeyError, ValueError) as error:
        print(json.dumps({'error': str(error)}), file=sys.stderr)
        sys.exit(1)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
