"""Pure glasses fitting rules (A03 round, A04 soft-square); no bpy.

Coordinates are metres in the shared rig space; the character faces -Y. Eye
positions come from the painted faces (paint_catalog_face.mjs: eyeX, eyeY in head
millimetres from the unscaled skull centre, y down) and scale with the head about
the Head pivot, like the brow and ear landmarks in catalog_headwear_plan.py.

CLI for tests: read one JSON request on stdin, print the JSON result.
"""
import json
import math
import sys

from catalog_headwear_plan import SKULL_CENTRE, finite, scaled_point

# Painted eyes: centre offset and height above the unscaled skull centre, and the half
# size of the eye opening (H01 openings are drawn at 1.15x, H02's 1.22x tall).
EYES = {'H01': {'x': .056, 'above': .026, 'half_width': .033, 'half_height': .030},
        'H02': {'x': .062, 'above': -.002, 'half_width': .035, 'half_height': .031}}

# Unscaled frame designs. Lenses enclose the painted eye opening plus a margin; `round`
# makes both half sizes equal. Exponent 2 is a circle; larger exponents square the lens
# off (superellipse). Sections grow with the head.
DESIGNS = {
    'A03': {'label': 'navy round glasses', 'exponent': 2.0, 'round': True, 'margin_width': .005, 'margin_height': .007,
            'rim_radial': .0060, 'rim_depth': .0040, 'bridge_rise': .010, 'temple_width': .0050, 'temple_height': .0034,
            'color': (.026, .049, .106)},
    'A04': {'label': 'blue soft-square glasses', 'exponent': 4.5, 'round': False, 'margin_width': .006, 'margin_height': .004,
            'rim_radial': .0062, 'rim_depth': .0042, 'bridge_rise': .003, 'temple_width': .0054, 'temple_height': .0036,
            'color': (.12, .285, .66)},
}


def eye_centres(head_id, pivot, scale):
    """World (x, z) of the left and right painted eye centres; y comes from the surface."""
    if head_id not in EYES:
        raise ValueError(f'Unknown head {head_id}')
    finite(scale, *pivot)
    eye = EYES[head_id]
    rows = []
    for side in (1, -1):  # Character's left (+X) first.
        point = scaled_point((side * eye['x'], SKULL_CENTRE[1], SKULL_CENTRE[2] + eye['above']), pivot, scale)
        rows.append([point[0], point[2]])
    return rows


def lens_outline(exponent, half_width, half_height, segments=48):
    """Closed superellipse outline (u, v) about the lens centre, counter-clockwise from +u."""
    finite(exponent, half_width, half_height)
    if exponent < 2 or half_width <= 0 or half_height <= 0 or not isinstance(segments, int) or segments < 12:
        raise ValueError('Need exponent >= 2, positive half sizes and at least 12 segments')
    points = []
    for i in range(segments):
        t = 2 * math.pi * i / segments
        c, s = math.cos(t), math.sin(t)
        points.append([half_width * math.copysign(abs(c) ** (2 / exponent), c),
                       half_height * math.copysign(abs(s) ** (2 / exponent), s)])
    return points


def frame_layout(head_id, design_id, pivot, scale):
    """Scaled lens centres, half sizes and sections for one design on one head."""
    if design_id not in DESIGNS:
        raise ValueError(f'Unknown design {design_id}')
    d = DESIGNS[design_id]
    left, right = eye_centres(head_id, pivot, scale)
    eye = EYES[head_id]
    half_width, half_height = eye['half_width'] + d['margin_width'], eye['half_height'] + d['margin_height']
    if d['round']:
        half_width = half_height = max(half_width, half_height)
    half_width, half_height = half_width * scale, half_height * scale
    gap = left[0] - right[0] - 2 * half_width
    if gap <= 2 * d['rim_radial'] * scale:
        raise ValueError('Lenses overlap at the bridge; shrink the lens width')
    return {'design': design_id, 'head': head_id, 'scale': scale, 'centres': [left, right],
            'lens_half_width': half_width, 'lens_half_height': half_height, 'exponent': d['exponent'],
            'bridge_gap': gap, 'bridge_rise': d['bridge_rise'] * scale,
            'rim': {'radial': d['rim_radial'] * scale, 'depth': d['rim_depth'] * scale},
            'temple': {'width': d['temple_width'] * scale, 'height': d['temple_height'] * scale}}


def temple_path(hinge, ear, drop, samples=12):
    """Temple centre line from the hinge straight back to above the ear, then down behind it.

    `hinge` and `ear` are (x, y, z); the last fifth bends down by `drop` behind the ear.
    """
    finite(*hinge, *ear, drop)
    if not ear[1] > hinge[1]:
        raise ValueError('The ear must lie behind the hinge (+Y)')
    points = []
    for i in range(samples + 1):
        t = i / samples
        point = [hinge[k] + (ear[k] - hinge[k]) * t for k in range(3)]
        points.append(point)
    tail = .25 * (ear[1] - hinge[1])
    for i in range(1, 9):
        t = i / 8
        points.append([ear[0], ear[1] + tail * t, ear[2] - drop * t * t])
    return points


OPERATIONS = {
    'eye_centres': lambda r: eye_centres(r['head'], r['pivot'], r['scale']),
    'lens_outline': lambda r: lens_outline(r['exponent'], r['half_width'], r['half_height'], r.get('segments', 48)),
    'frame_layout': lambda r: frame_layout(r['head'], r['design'], r['pivot'], r['scale']),
    'temple_path': lambda r: temple_path(r['hinge'], r['ear'], r['drop'], r.get('samples', 12)),
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
