"""Recover the real two-layer patch grid and propose a rounded reference footprint."""
import json
import math
import sys
from collections import Counter, deque

DEFAULT_DIMENSIONS = {'inner_x': .033, 'width': .1, 'top': .92, 'height': .1, 'radius': .035}


def distances(neighbors, start):
    result = {start: 0}
    queue = deque([start])
    while queue:
        vertex = queue.popleft()
        for other in neighbors[vertex]:
            if other not in result:
                result[other] = result[vertex] + 1
                queue.append(other)
    return result


def plan_patch(patch, dimensions=None):
    d = DEFAULT_DIMENSIONS if dimensions is None else dimensions
    assert set(d) == set(DEFAULT_DIMENSIONS)
    assert all(math.isfinite(v) for v in d.values())
    assert d['inner_x'] > 0 and d['width'] > 0 and d['height'] > 0
    assert 0 < d['radius'] < min(d['width'] / 2, d['height'])
    assert patch['side'] in ('Left', 'Right')
    points = {v['index']: v['point'] for v in patch['vertices']}
    assert len(points) == len(patch['vertices']) == 242
    sign = 1 if patch['side'] == 'Left' else -1
    assert all(len(p) == 3 and all(math.isfinite(v) for v in p) and p[0] * sign > 0 for p in points.values())
    outer = [f['vertices'] for f in patch['faces'] if f['normal'][1] > .5]
    inner = [f['vertices'] for f in patch['faces'] if f['normal'][1] < -.5]
    assert len(patch['faces']) == 240 and len(outer) == len(inner) == 100, 'Expected complete paired surfaces'
    outer_ids = {i for f in outer for i in f}
    inner_ids = {i for f in inner for i in f}
    assert len(outer_ids) == len(inner_ids) == 121 and not outer_ids & inner_ids
    assert outer_ids | inner_ids == set(points)
    neighbors = {i: set() for i in outer_ids}
    edges = Counter()
    for face in outer:
        assert len(face) == len(set(face)) == 4
        for a, b in zip(face, face[1:] + face[:1]):
            neighbors[a].add(b); neighbors[b].add(a)
            edges[tuple(sorted((a, b)))] += 1
    assert len(edges) == 220 and all(n in (1, 2) for n in edges.values())
    assert Counter(map(len, neighbors.values())) == {2: 4, 3: 36, 4: 81}
    corners = sorted((i for i, ns in neighbors.items() if len(ns) == 2), key=lambda i: points[i][2], reverse=True)
    top_inner, top_outer = sorted(corners[:2], key=lambda i: abs(points[i][0]))
    a, b = distances(neighbors, top_inner), distances(neighbors, top_outer)
    assert len(a) == len(b) == 121 and a[top_outer] == 10
    paired = {}
    for i in outer_ids:
        ordered = sorted((sum((points[i][axis] - points[j][axis]) ** 2 for axis in range(3)), j) for j in inner_ids)
        assert .0008 ** 2 < ordered[0][0] < .0016 ** 2 and ordered[1][0] > .003 ** 2, 'Ambiguous layer pairing'
        paired[i] = ordered[0][1]
    assert len(set(paired.values())) == 121
    # Matching cyclic winding, rather than an index offset, identifies the inner faces.
    def cycle(face):
        return min(tuple(face[n:] + face[:n]) for n in range(len(face)))
    assert Counter(cycle([paired[i] for i in reversed(f)]) for f in outer) == Counter(cycle(f) for f in inner)
    side_faces = [f['vertices'] for f in patch['faces'] if abs(f['normal'][1]) <= .5]
    boundary = {edge for edge, count in edges.items() if count == 1}
    assert len(side_faces) == len(boundary) == 40
    assert Counter(frozenset(f) for f in side_faces) == Counter(frozenset((x, y, paired[x], paired[y])) for x, y in boundary)
    nodes = []
    for i in outer_ids:
        row = (a[i] + b[i] - 10) / 2
        col = (a[i] - b[i] + 10) / 2
        assert row.is_integer() and col.is_integer() and 0 <= row <= 10 and 0 <= col <= 10
        z = d['top'] - d['height'] * row / 10
        bottom = d['top'] - d['height']
        inset = 0
        if z < bottom + d['radius']:
            inset = d['radius'] - math.sqrt(max(0, d['radius'] ** 2 - (z - bottom - d['radius']) ** 2))
        x = sign * (d['inner_x'] + inset + (d['width'] - 2 * inset) * col / 10)
        nodes.append({'outer': i, 'inner': paired[i], 'row': int(row), 'col': int(col), 'xz': [x, z]})
    assert len({(n['row'], n['col']) for n in nodes}) == 121
    return {'side': patch['side'], 'dimensions_m': d, 'nodes': sorted(nodes, key=lambda n: (n['row'], n['col']))}


if __name__ == '__main__':
    args = json.load(sys.stdin)
    print(json.dumps(plan_patch(args['patch'], args.get('dimensions'))))
