"""Measure paths along actual cloth edges from explicit lower-leg seeds."""
import heapq
import json
import math
import sys


def branch_distances(points, edges, seeds):
    assert points and all(len(p) == 3 and all(math.isfinite(v) for v in p) for p in points)
    neighbors = [[] for _ in points]
    for a, b in edges:
        assert 0 <= a < len(points) and 0 <= b < len(points) and a != b
        length = math.dist(points[a], points[b])
        neighbors[a].append((b, length))
        neighbors[b].append((a, length))
    result = {}
    for side, indices in seeds.items():
        assert indices, 'Empty branch seeds'
        assert len(set(indices)) == len(indices) and all(0 <= i < len(points) for i in indices)
        distances = [math.inf] * len(points)
        pending = [(0, i) for i in indices]
        heapq.heapify(pending)
        for i in indices:
            distances[i] = 0
        while pending:
            distance, i = heapq.heappop(pending)
            if distance != distances[i]:
                continue
            for j, length in neighbors[i]:
                value = distance + length
                if value < distances[j]:
                    distances[j] = value
                    heapq.heappush(pending, (value, j))
        assert all(math.isfinite(v) for v in distances), 'Unreachable fabric vertex'
        result[side] = distances
    return result


if __name__ == '__main__':
    print(json.dumps(branch_distances(**json.load(sys.stdin))))
