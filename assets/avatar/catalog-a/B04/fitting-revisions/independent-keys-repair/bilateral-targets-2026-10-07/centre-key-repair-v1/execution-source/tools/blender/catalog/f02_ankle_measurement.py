"""Read-only, coordinate-independent F02 bind-relative ankle instrumentation.

Positive twist is dorsiflexion: bind forward crossed with bind shank-up gives
the hinge axis. Delta = (LegLive^-1 FootLive) (LegBind^-1 FootBind)^-1,
expressed in Leg-local coordinates. No gait, morph or runtime behavior changes.
"""
import json
import math
import sys


def dot(a, b): return sum(x*y for x, y in zip(a, b))
def transpose(a): return [list(row) for row in zip(*a)]
def multiply(a, b): return [[dot(row, col) for col in transpose(b)] for row in a]
def vector(a, b): return [dot(row, b) for row in a]
def unit(v):
    if len(v) != 3 or any(not isinstance(x, (int, float)) or not math.isfinite(x) for x in v): raise ValueError('Invalid axis')
    length = math.sqrt(dot(v, v))
    if length < 1e-12: raise ValueError('Undefined axis')
    return [x/length for x in v]
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def rotation(matrix):
    if len(matrix) not in (3, 4) or any(len(row) != len(matrix) for row in matrix): raise ValueError('Matrix dimensions')
    cols = [unit([matrix[i][j] for i in range(3)]) for j in range(3)]
    if max(abs(dot(cols[i], cols[j])) for i in range(3) for j in range(3) if i != j) > 1e-5: raise ValueError('Sheared rotation')
    if dot(cross(cols[0], cols[1]), cols[2]) < 1-1e-5: raise ValueError('Reflection')
    return transpose(cols)


def quaternion(m):
    trace = sum(m[i][i] for i in range(3))
    if trace > 0:
        s = 2*math.sqrt(1+trace)
        q = [(m[2][1]-m[1][2])/s, (m[0][2]-m[2][0])/s, (m[1][0]-m[0][1])/s, s/4]
    else:
        i = max(range(3), key=lambda j: m[j][j]); j = (i+1)%3; k = (i+2)%3
        s = 2*math.sqrt(max(0, 1+m[i][i]-m[j][j]-m[k][k])); q = [0, 0, 0, 0]
        q[i] = s/4; q[j] = (m[i][j]+m[j][i])/s; q[k] = (m[i][k]+m[k][i])/s; q[3] = (m[k][j]-m[j][k])/s
    length = math.sqrt(dot(q, q)); q = [x/length for x in q]
    return [-x for x in q] if q[3] < 0 else q


def measure(bind_leg, bind_foot, leg, foot, axis_world_bind):
    bleg, bfoot, lleg, lfoot = map(rotation, [bind_leg, bind_foot, leg, foot])
    axis = unit(vector(transpose(bleg), unit(axis_world_bind)))
    neutral = multiply(transpose(bleg), bfoot)
    delta = multiply(multiply(transpose(lleg), lfoot), transpose(neutral))
    q = quaternion(delta); projection = dot(q[:3], axis)
    length = math.hypot(projection, q[3])
    if length < 1e-10: raise ValueError('Undefined 180-degree orthogonal twist')
    angle = 2*math.atan2(projection/length, q[3]/length)
    # q = swing * twist, so dot(q, twist) is the scalar of residual swing.
    residual_w = length
    swing = 2*math.atan2(math.sqrt(max(0, dot(q[:3], q[:3])-projection*projection)), residual_w)
    return {'twist_rad': angle, 'swing_rad': swing, 'delta_leg_local': delta, 'axis_leg_local_bind': axis}


def schedule():
    rows = [{'motion': 'rest', 'frame': 0}]
    for motion, start, end in [('walk', .8, 25.6), ('run', .8, 16)]:
        rows += [{'motion': motion, 'frame': f} for f in sorted({start, end} | {i/4 for i in range(math.ceil(start*4), math.floor(end*4)+1)})]
    return rows


def position(m): return [m[i][3] for i in range(3)]
def subtract(a, b): return [x-y for x, y in zip(a, b)]


def measure_side(world, bind, side):
    foot, leg, toe, hip = [side+name for name in ['Foot', 'Leg', 'ToeBase', 'UpLeg']]
    forward = unit(subtract(position(bind[toe]), position(bind[foot])))
    up = unit(subtract(position(bind[leg]), position(bind[foot])))
    result = measure(bind[leg], bind[foot], world[leg], world[foot], cross(forward, up))
    a = subtract(position(world[leg]), position(world[hip])); b = subtract(position(world[foot]), position(world[leg]))
    knee = math.acos(max(-1, min(1, dot(unit(a), unit(b)))))
    result.update(knee_angle_rad=knee, knee_value=min(1, max(0, (knee-.25)/1.55)), axis_world_bind=unit(cross(forward, up)))
    return result


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin)
        if data.get('operation') == 'schedule': result = schedule()
        elif data.get('operation') == 'side': result = measure_side(data['world'], data['bind'], data['side'])
        else: result = measure(**data)
        print(json.dumps(result, allow_nan=False))
    except (ValueError, TypeError, KeyError, ZeroDivisionError) as error:
        print(str(error), file=sys.stderr); sys.exit(1)
