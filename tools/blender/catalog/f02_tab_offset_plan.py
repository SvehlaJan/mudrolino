"""Plan a bounded rigid rear offset of F02 heel tabs without importing Blender."""
import json
import math
import sys


def plan_offset(coordinates, detail_ids, rear_vectors, offset_m, expected_detail_vertices=60):
    assert isinstance(offset_m, (int, float)) and math.isfinite(offset_m) and 0 < offset_m <= .004, 'Offset must be positive and at most 4 mm'
    assert set(coordinates) == {'Basis', 'knee_clearance_Left', 'knee_clearance_Right'}, 'Unexpected target inventory'
    count = len(coordinates['Basis'])
    assert all(len(points) == count and all(len(point) == 3 and all(math.isfinite(value) for value in point) for point in points) for points in coordinates.values()), 'Shape topology or coordinates differ'
    assert len(detail_ids) == len(set(detail_ids)) == expected_detail_vertices, 'Audited heel-tab inventory changed'
    assert all(isinstance(index, int) and 0 <= index < count for index in detail_ids), 'Invalid detail vertex'
    assert set(rear_vectors) == {'Left', 'Right'} and all(len(vector) == 3 and abs(math.dist(vector, [0, 0, 0]) - 1) < 1e-6 for vector in rear_vectors.values()), 'Rear directions must be unit vectors'
    result = {name: [list(point) for point in points] for name, points in coordinates.items()}
    for index in detail_ids:
        x = coordinates['Basis'][index][0]
        assert abs(x) > .04, 'Heel tab cannot cross centerline'
        rear = rear_vectors['Left' if x > 0 else 'Right']
        for points in result.values():
            points[index] = [value + axis * offset_m for value, axis in zip(points[index], rear)]
    return {'coordinates': result, 'changed_indices': sorted(detail_ids), 'offset_m': offset_m,
            'scope': 'Rigid tab translation in every target; topology, tab shape, corrective deltas and skin weights unchanged.'}


if __name__ == '__main__':
    print(json.dumps(plan_offset(**json.load(sys.stdin))))
