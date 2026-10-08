"""Plan a continuous returned hem from its paired existing cloth boundaries."""
import json
import math
import sys
from collections import Counter


def export_skin_weights(weights):
    """Use the established glTF cutoff on newly constructed cloth only."""
    if not weights or len(weights) > 4 or any(not math.isfinite(w) or w <= 0 for w in weights.values()):
        raise ValueError('Finite positive source influences required')
    retained = {group: weight for group, weight in weights.items() if weight > .0001}
    if not retained: raise ValueError('No influence survives the exporter cutoff')
    total = sum(retained.values())
    return {group: weight/total for group, weight in retained.items()}


def returned_band_deltas(plan, deep_return_height_m):
    """Keep a positive returned band while compressing only its free upper rows."""
    rest = plan['return_height_m']
    if not isinstance(deep_return_height_m, (int, float)) or not math.isfinite(deep_return_height_m) or not .010 <= deep_return_height_m <= rest:
        raise ValueError('Positive bounded deep-fold return height required')
    result = {f'knee_clearance_{side}': [] for side in ('Left', 'Right')}
    for row in plan['new_vertices']:
        for side in ('Left', 'Right'):
            dz = (deep_return_height_m-rest)*(row['row']-3)/3 if row['side'] == side and row['row'] >= 4 else 0
            result[f'knee_clearance_{side}'].append([0, 0, dz])
    return result


def hem_anchor_bindings(plan, skin):
    """Continue the skin field of the actual sewn hem, through every fold row."""
    if len(skin) != plan['original_vertex_count']: raise ValueError('Complete original skin required')
    result = []
    for row in plan['new_vertices']:
        index = row['source_hem_vertex']
        if type(index) != int or not 0 <= index < len(skin): raise ValueError('Original hem anchor required')
        weights = skin[index]
        if not weights or len(weights) > 4: raise ValueError('One to four source influences required')
        if any(not name.startswith(row['side']) or not math.isfinite(value) or value <= 0 for name, value in weights.items()): raise ValueError('Finite same-side source skin required')
        total = sum(weights.values())
        if abs(total-1) > 1e-6: raise ValueError('Normalized original hem skin required')
        result.append({'source_hem_vertex': index, 'weights': {name: value/total for name, value in weights.items()}})
    return result


def plan_cuffs(points, normals, cap_faces, centers, bend_radius_m=.003, return_height_m=.025):
    if len(points) != len(normals) or not points: raise ValueError('Complete positions/normals required')
    if any(len(p) != 3 or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in p) for p in points+normals): raise ValueError('Finite xyz required')
    if not .002 <= bend_radius_m <= .005 or not .018 <= return_height_m <= .030: raise ValueError('Bounded rolled-cuff construction required')
    ids = set(i for f in cap_faces for i in f)
    if not ids or any(type(i) != int or not 0 <= i < len(points) for i in ids): raise ValueError('Existing hem indices required')
    if any(not .130 <= points[i][2] <= .140 for i in ids): raise ValueError('Only the measured ankle hem may change')
    role, side, radial = {}, {}, {}
    for i in ids:
        p = points[i]; side[i] = 'Left' if p[0] >= 0 else 'Right'; c = centers[side[i]]
        dx, dy = p[0]-c[0], p[1]-c[1]; length = math.hypot(dx, dy)
        if length < .04: raise ValueError('Degenerate hem radius')
        u = (dx/length, dy/length); radial[i] = u
        dot = u[0]*normals[i][0]+u[1]*normals[i][1]
        if abs(dot) < .5: raise ValueError('Ambiguous original inner/outer boundary')
        role[i] = 'outer' if dot > 0 else 'inner'
    pairs, edges = {}, []
    for face in cap_faces:
        if len(face) != 4 or len(set(face)) != 4 or len({side[i] for i in face}) != 1: raise ValueError('Paired quad hem caps required')
        if Counter(role[i] for i in face) != {'outer': 2, 'inner': 2}: raise ValueError('Two cloth boundaries required')
        links = list(zip(face, face[1:]+face[:1]))
        outer = [(a, b) for a, b in links if role[a] == role[b] == 'outer']
        if len(outer) != 1: raise ValueError('Ordered cap required')
        edges.append(outer[0])
        for a, b in links:
            if role[a] == role[b]: continue
            a, b = (a, b) if role[a] == 'outer' else (b, a)
            if a in pairs and pairs[a] != b: raise ValueError('Ambiguous cloth thickness pairing')
            pairs[a] = b
    if set(pairs) != {i for i in ids if role[i] == 'outer'} or set(pairs.values()) != {i for i in ids if role[i] == 'inner'}: raise ValueError('Complete one-to-one pairing required')
    degrees = Counter(i for e in edges for i in e)
    if any(degrees[i] != 2 for i in pairs) or set(side.values()) != {'Left', 'Right'}: raise ValueError('Two closed hem boundaries required')
    for label in ('Left', 'Right'):
        expected = {i for i in pairs if side[i] == label}; reached = set(); pending = [min(expected)]
        while pending:
            i = pending.pop()
            if i in reached: continue
            reached.add(i); pending += [b if a == i else a for a, b in edges if a == i or b == i]
        if reached != expected: raise ValueError('Disconnected hem boundary')
    new, rings = [], []
    for row in range(7):
        ring = {}
        for outer in sorted(pairs):
            inner = pairs[outer]; u = radial[outer]
            thickness = sum((points[outer][j]-points[inner][j])*u[j] for j in range(2))
            if not .0015 <= thickness <= .0035: raise ValueError('Measured cloth thickness outside scope')
            for i, radius in ((outer, bend_radius_m), (inner, bend_radius_m+thickness)):
                if row < 4:
                    angle = (row+1)*math.pi/4; dr = radius*(1-math.cos(angle)); dz = -radius*math.sin(angle)
                else: dr = 2*radius; dz = return_height_m*(row-3)/3
                p = [points[i][0]+dr*u[0], points[i][1]+dr*u[1], points[i][2]+dz]
                if p[2] < .125 or p[2] > .170: raise ValueError('Fold exceeds measured ankle envelope')
                ring[i] = len(points)+len(new)
                new.append({'point': p, 'source_hem_vertex': i, 'side': side[i], 'surface': role[i], 'row': row})
        rings.append(ring)
    faces = []; previous = {i: i for i in ids}
    for ring in rings:
        for a, b in edges:
            ia, ib = pairs[a], pairs[b]
            faces.append([previous[a], previous[b], ring[b], ring[a]])
            faces.append([previous[ib], previous[ia], ring[ia], ring[ib]])
        previous = ring
    for a, b in edges: faces.append([previous[a], previous[b], previous[pairs[b]], previous[pairs[a]]])
    return {'original_vertex_count': len(points), 'original_positions_changed': False,
            'removed_cap_faces': cap_faces, 'new_vertices': new, 'new_faces': faces,
            'bend_radius_m': bend_radius_m, 'return_height_m': return_height_m,
            'scope': 'Extend paired hem boundaries only. Existing vertices/keys/skin and all body/rig/gait data remain fixed; new cloth requires source-triangle skin and full-cycle proof.'}


if __name__ == '__main__':
    try: print(json.dumps(plan_cuffs(**json.load(sys.stdin)), allow_nan=False))
    except (ValueError, TypeError, KeyError) as error: print(str(error), file=sys.stderr); sys.exit(1)
