"""Plan the bounded B04 coordinate reset without importing Blender."""
import json
import math
import sys


def plan_repair(basis, left, right, expected_count=263,
                expected_intended_count=263,
                expected_max_delta=0.026239174317096707, tolerance=1e-7):
    assert len(basis) == len(left) == len(right), 'Shape topology differs'
    corrected = [list(point) for point in right]
    changes, intended = [], []
    for index, point in enumerate(basis):
        distance = math.dist(right[index], point)
        if point[0] < -.04 and distance > tolerance:
            intended.append(index)
        if point[0] <= .04 or distance <= tolerance:
            continue
        assert math.dist(right[index], left[index]) <= tolerance, ('Unexpected inherited delta', index)
        changes.append({'index': index, 'before': list(right[index]),
                        'after': list(point), 'removed_delta_m': distance})
        corrected[index] = list(point)
    assert len(changes) == expected_count, ('Audited opposite-side count changed', len(changes))
    assert len(intended) == expected_intended_count, ('Audited intended-side count changed', len(intended))
    maximum = max((change['removed_delta_m'] for change in changes), default=0)
    assert abs(maximum - expected_max_delta) <= tolerance, ('Audited maximum delta changed', maximum)
    return {'corrected': corrected, 'changes': changes, 'intended': intended,
            'max_removed_opposite_delta_m': maximum}


if __name__ == '__main__':
    print(json.dumps(plan_repair(**json.load(sys.stdin))))
