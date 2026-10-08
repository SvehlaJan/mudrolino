"""Signed portable F02 swing/twist payload; instrumentation, no runtime mutation."""
import json
import math
import sys
from f02_ankle_measurement import unit, dot, cross, quaternion, rotation, vector, transpose, position, subtract, measure_side


def qmultiply(a, b):
    xyz = [a[3]*b[i]+b[3]*a[i]+cross(a[:3], b[:3])[i] for i in range(3)]
    return [*xyz, a[3]*b[3]-dot(a[:3], b[:3])]


def qexp(v):
    length = math.sqrt(dot(v, v))
    return [*(x*math.sin(length/2)/length for x in v), math.cos(length/2)] if length > 1e-14 else [0, 0, 0, 1]


def qmatrix(q):
    x, y, z, w = q
    return [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]


def reconstruct(twist_rad, swing_forward_rad, swing_up_rad, axis, forward):
    axis, forward = unit(axis), unit(forward)
    if abs(dot(axis, forward)) > 1e-5: raise ValueError('Calibration basis not orthogonal')
    if not all(math.isfinite(v) for v in [twist_rad, swing_forward_rad, swing_up_rad]): raise ValueError('Nonfinite payload')
    up = unit(cross(axis, forward))
    swing = qexp([swing_forward_rad*forward[i]+swing_up_rad*up[i] for i in range(3)])
    twist = qexp([twist_rad*x for x in axis])
    return qmultiply(swing, twist)


def payload(delta, axis, forward):
    axis, forward = unit(axis), unit(forward)
    if abs(dot(axis, forward)) > 1e-5: raise ValueError('Calibration basis not orthogonal')
    q = quaternion(rotation(delta)); t = dot(q[:3], axis); n = math.hypot(t, q[3])
    if n < 1e-10: raise ValueError('Undefined orthogonal 180-degree twist')
    twist = [*(x*t/n for x in axis), q[3]/n]
    swing = qmultiply(q, [-twist[0], -twist[1], -twist[2], twist[3]])
    length = math.sqrt(dot(swing[:3], swing[:3])); angle = 2*math.atan2(length, swing[3])
    log = [x*angle/length for x in swing[:3]] if length > 1e-14 else [0, 0, 0]
    up = unit(cross(axis, forward))
    result = {'twist_rad': 2*math.atan2(t/n, q[3]/n), 'swing_forward_rad': dot(log, forward), 'swing_up_rad': dot(log, up), 'axis_leg_local_bind': axis, 'forward_leg_local_bind': forward, 'up_leg_local_bind': up}
    rebuilt = reconstruct(result['twist_rad'], result['swing_forward_rad'], result['swing_up_rad'], axis, forward)
    difference = qmultiply(q, [-rebuilt[0], -rebuilt[1], -rebuilt[2], rebuilt[3]])
    result.update(reconstructed_matrix=qmatrix(rebuilt), reconstruction_rotation_error_rad=2*math.atan2(math.sqrt(dot(difference[:3], difference[:3])), abs(difference[3])))
    return result


def payload_side(world, bind, side):
    measured = measure_side(world, bind, side)
    forward_world = unit(subtract(position(bind[side+'ToeBase']), position(bind[side+'Foot'])))
    forward = unit(vector(transpose(rotation(bind[side+'Leg'])), forward_world))
    return {**payload(measured['delta_leg_local'], measured['axis_leg_local_bind'], forward), 'knee_value': measured['knee_value']}


def loop_time(time, duration):
    if not all(math.isfinite(v) for v in [time, duration]) or time < 0 or duration <= 0: raise ValueError('Invalid LoopRepeat time')
    return time%duration


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin)
        if data.get('operation') == 'loop_time': result = loop_time(data['time'], data['duration'])
        else: result = payload(**data)
        print(json.dumps(result, allow_nan=False))
    except (ValueError, TypeError, KeyError) as error:
        print(str(error), file=sys.stderr); sys.exit(1)
