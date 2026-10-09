"""Pure headwear fitting rules shared by head-scale and cap builders; no bpy.

Coordinates are metres in the shared rig space. The character faces -Y, so an
azimuth (radians from +X toward +Y) of -pi/2 is the front and +pi/2 the back.

CLI for tests: read one JSON request on stdin, print the JSON result.
"""
import json
import math
import sys

# Shared analytic skull centre of H01/H02 before any head scale (paint_catalog_face.mjs).
SKULL_CENTRE = (0.0, 0.012, 1.608)
# Ear tops sit 36 mm above the unscaled skull centre on both heads (H01 ear geometry).
EAR_TOP_ABOVE_CENTRE_M = 0.036
# Painted brow line above the unscaled skull centre (paint_catalog_face.mjs browY / eyeY - 21).
BROW_ABOVE_CENTRE_M = {'H01': 0.077, 'H02': 0.019}


def finite(*values):
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in values):
        raise ValueError('Values must be finite numbers')


def scaled_point(point, pivot, scale):
    """Uniform head scale about the Head bone bind anchor."""
    finite(*point, *pivot, scale)
    if not .8 <= scale <= 1.5:
        raise ValueError('Head scale must be within 0.8-1.5')
    return [p + (value - p) * scale for value, p in zip(point, pivot)]


def hair_hang_scale(z, scale, z_full, z_tip, tip_scale):
    """Scale for a hanging hair point at unscaled height z.

    Hair above z_full grows with the head; below it the factor eases to
    tip_scale at z_tip, so shoulder-length hair keeps its length relative to
    the unchanged shoulders instead of growing down and back into them.
    """
    finite(z, scale, z_full, z_tip, tip_scale)
    if not z_tip < z_full or not 1 <= tip_scale <= scale:
        raise ValueError('Need z_tip < z_full and 1 <= tip_scale <= scale')
    return tip_scale + (scale - tip_scale) * smoothstep((z - z_tip) / (z_full - z_tip))


def shorten_rear_hair(z, y, z_from, fraction, y_start, y_full):
    """Height of a hanging rear hair point after shortening its length below z_from.

    Only locks behind the head (y from y_start to y_full, the character faces -Y)
    shorten, by `fraction` of their hanging length, so tips clear the upper back
    and swinging arms while the face-framing locks keep their length.
    """
    finite(z, y, z_from, fraction, y_start, y_full)
    if not 0 <= fraction < 1 or not y_start < y_full:
        raise ValueError('Need 0 <= fraction < 1 and y_start < y_full')
    if z >= z_from:
        return z
    return z_from - (z_from - z) * (1 - fraction * smoothstep((y - y_start) / (y_full - y_start)))


def head_landmarks(head_id, pivot, scale):
    """World landmarks for a painted head at a uniform scale about the Head pivot."""
    if head_id not in BROW_ABOVE_CENTRE_M:
        raise ValueError(f'Unknown head {head_id}')
    centre = scaled_point(SKULL_CENTRE, pivot, scale)
    z0 = SKULL_CENTRE[2]
    return {
        'head': head_id, 'scale': scale, 'pivot': list(pivot), 'skull_centre': centre,
        'brow_z': scaled_point((0, 0, z0 + BROW_ABOVE_CENTRE_M[head_id]), pivot, scale)[2],
        'ear_top_z': scaled_point((0, 0, z0 + EAR_TOP_ABOVE_CENTRE_M), pivot, scale)[2],
    }


def band_heights(landmarks, front_above_brow, side_above_ear, back_above_centre, front_rise_over_side=0.0):
    """Cap band heights at the front, sides and back, scaled with the head.

    The front rises at least front_rise_over_side above the sides so the band
    tilts the same way on every head, and never drops below the brow offset.
    """
    s = landmarks['scale']
    side = landmarks['ear_top_z'] + side_above_ear * s
    return {'front': max(landmarks['brow_z'] + front_above_brow * s, side + front_rise_over_side * s),
            'side': side,
            'back': landmarks['skull_centre'][2] + back_above_centre * s}


def band_height(azimuth, front, side, back):
    """Smooth band curve through the given front, side and back heights.

    z = m + b*sin(a) + c*cos(2a): sin(a) separates front from back and cos(2a)
    lifts or drops both sides symmetrically.
    """
    finite(azimuth, front, side, back)
    m = (front + back) / 4 + side / 2
    c = side / 2 - (front + back) / 4
    b = (back - front) / 2
    return m + b * math.sin(azimuth) + c * math.cos(2 * azimuth)


def smoothstep(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def under_hat_radius(radius, skull_radius, depth_below_band, layer, tuck, blend):
    """Radius of a hair point after flattening it under a hat.

    Inside the crown (above the band) and within `tuck` below it, hair lies no
    further than `layer` from the skull. Over the next `blend` metres the limit
    eases back to the original hair, so the hair emerges below the band.
    """
    finite(radius, skull_radius, depth_below_band, layer, tuck, blend)
    if layer <= 0 or tuck < 0 or blend <= 0:
        raise ValueError('layer and blend must be positive; tuck non-negative')
    limit = skull_radius + layer
    if radius <= limit:
        return radius
    if depth_below_band <= tuck:
        return limit
    return limit + (radius - limit) * smoothstep((depth_below_band - tuck) / blend)


def pressed_shell_radius(radius, skull_radius, depth_below_band, layer, tuck, blend):
    """Radius of a point on a single hair shell (hair variants) pressed under a hat.

    Inside the crown and within `tuck` below the band the shell lies exactly `layer` from
    the skull, so curl valleys rise as peaks flatten and the band meets a smooth surface;
    it eases back to the original shell over `blend`. Edges tucked under the skin stay.
    (Ramping the pressed height with the original thickness near a hairline made the crop
    band gaps worse, 5.4 -> 7.6 mm p90, so the press is flat.)
    """
    finite(radius, skull_radius, depth_below_band, layer, tuck, blend)
    if layer <= 0 or tuck < 0 or blend <= 0:
        raise ValueError('layer and blend must be positive; tuck non-negative')
    if radius <= skull_radius:
        return radius
    limit = skull_radius + layer
    if depth_below_band <= tuck:
        return limit
    return limit + (radius - limit) * smoothstep((depth_below_band - tuck) / blend)


def crown_ease(azimuth, height_fraction, base, front_lift):
    """Crown clearance over the flattened hair; the front panels stand a little proud."""
    finite(azimuth, height_fraction, base, front_lift)
    front = max(0.0, -math.sin(azimuth)) ** 1.5
    lift = math.sin(math.pi * min(1.0, max(0.0, height_fraction))) ** 1.2
    return base + front_lift * front * lift


def percentile(values, q):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(q * len(ordered)))]


def fit_gate(crown_gaps_mm, band_gaps_mm, intersections, max_gap_mm=12.0,
             min_share=0.9, band_p90_mm=5.0, band_max_mm=15.0, min_gap_mm=-0.5):
    """Headwear must neither intersect nor float.

    crown_gaps_mm: radial gaps from the inner crown to the head/hair surface.
    band_gaps_mm: the same along the band ring; the band may bridge a hair edge
    (e.g. a parting under the brim) but must hug the head almost everywhere.
    intersections: {obstacle: pairs}.
    """
    if not crown_gaps_mm or not band_gaps_mm:
        raise ValueError('Gap samples are required')
    finite(*crown_gaps_mm, *band_gaps_mm)
    share = sum(1 for g in crown_gaps_mm if g <= max_gap_mm) / len(crown_gaps_mm)
    failures = []
    if share < min_share:
        failures.append(f'crown gap <= {max_gap_mm} mm on {share:.3f} of samples (need {min_share})')
    if percentile(band_gaps_mm, .9) > band_p90_mm:
        failures.append(f'band p90 gap {percentile(band_gaps_mm, .9):.1f} mm exceeds {band_p90_mm} mm')
    if max(band_gaps_mm) > band_max_mm:
        failures.append(f'band gap {max(band_gaps_mm):.1f} mm exceeds {band_max_mm} mm')
    if min(crown_gaps_mm + band_gaps_mm) < min_gap_mm:
        failures.append(f'crown penetrates head/hair by {-min(crown_gaps_mm + band_gaps_mm):.1f} mm')
    hits = {name: count for name, count in intersections.items() if count}
    if hits:
        failures.append(f'intersections: {hits}')
    return {
        'passed': not failures, 'failures': failures,
        'crown': {'samples': len(crown_gaps_mm), 'share_within_max': round(share, 4),
                  'p50_mm': round(percentile(crown_gaps_mm, .5), 2), 'p90_mm': round(percentile(crown_gaps_mm, .9), 2),
                  'max_mm': round(max(crown_gaps_mm), 2), 'min_mm': round(min(crown_gaps_mm), 2)},
        'band': {'samples': len(band_gaps_mm), 'p90_mm': round(percentile(band_gaps_mm, .9), 2),
                 'max_mm': round(max(band_gaps_mm), 2), 'min_mm': round(min(band_gaps_mm), 2)},
        'thresholds': {'max_gap_mm': max_gap_mm, 'min_share': min_share, 'band_p90_mm': band_p90_mm,
                       'band_max_mm': band_max_mm, 'min_gap_mm': min_gap_mm},
        'intersections': intersections,
    }


OPERATIONS = {
    'scaled_point': lambda r: scaled_point(r['point'], r['pivot'], r['scale']),
    'hair_hang_scale': lambda r: hair_hang_scale(r['z'], r['scale'], r['z_full'], r['z_tip'], r['tip_scale']),
    'shorten_rear_hair': lambda r: shorten_rear_hair(r['z'], r['y'], r['z_from'], r['fraction'], r['y_start'], r['y_full']),
    'head_landmarks': lambda r: head_landmarks(r['head'], r['pivot'], r['scale']),
    'band_heights': lambda r: band_heights(r['landmarks'], r['front_above_brow'], r['side_above_ear'], r['back_above_centre'], r.get('front_rise_over_side', 0.0)),
    'band_height': lambda r: band_height(r['azimuth'], r['front'], r['side'], r['back']),
    'under_hat_radius': lambda r: under_hat_radius(r['radius'], r['skull_radius'], r['depth_below_band'], r['layer'], r['tuck'], r['blend']),
    'pressed_shell_radius': lambda r: pressed_shell_radius(r['radius'], r['skull_radius'], r['depth_below_band'], r['layer'], r['tuck'], r['blend']),
    'crown_ease': lambda r: crown_ease(r['azimuth'], r['height_fraction'], r['base'], r['front_lift']),
    'fit_gate': lambda r: fit_gate(r['crown_gaps_mm'], r['band_gaps_mm'], r['intersections'], **r.get('thresholds', {})),
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
