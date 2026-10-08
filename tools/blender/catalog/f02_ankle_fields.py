"""Compare audited F02 tab/shell fields in each side's actual Foot-local frame."""
import json
import math
import sys
from f02_ankle_measurement import quaternion, multiply, transpose, subtract


def compare(a, b):
    if not a['samples'] or [p['index'] for p in a['samples']] != [p['index'] for p in b['samples']]: raise ValueError('Mismatched audited detail indices')
    q = quaternion(multiply(a['delta_leg_local'], transpose(b['delta_leg_local'])))
    return {
        'twist_difference_rad': abs(a['twist_rad']-b['twist_rad']),
        'knee_value_difference': abs(a['knee_value']-b['knee_value']),
        'local_rotation_difference_rad': 2*math.atan2(math.sqrt(sum(v*v for v in q[:3])), abs(q[3])),
        'max_tab_difference_m': max(math.dist(x['tab_foot_local'], y['tab_foot_local']) for x, y in zip(a['samples'], b['samples'])),
        'max_gap_vector_difference_m': max(math.dist(subtract(x['tab_foot_local'], x['nearest_shell_foot_local']), subtract(y['tab_foot_local'], y['nearest_shell_foot_local'])) for x, y in zip(a['samples'], b['samples'])),
    }


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin); print(json.dumps(compare(data['a'], data['b']), allow_nan=False))
    except (ValueError, TypeError, KeyError) as error:
        print(str(error), file=sys.stderr); sys.exit(1)
