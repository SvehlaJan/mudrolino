"""Bound only anatomical-left B04 back-patch existing Left morph targets."""
import json
import math
import sys
from b04_target_repair_plan import vector


def plan_left_patch(basis, left, component, host_deltas):
    assert len(basis) == len(left), 'Coordinate inventory changed'
    basis, left = [vector(row) for row in basis], [vector(row) for row in left]
    indices = set(component['vertices'])
    assert component['component'] == 5 and component['role'] == 'rounded back pocket patch' and len(component['vertices']) == len(indices) == 242, 'Left patch inventory changed'
    assert component['materials'] == ['A ivory tapered trouser pockets and seams'], 'Unexpected detail material'
    values = {int(index): vector(delta) for index, delta in host_deltas.items()}
    assert set(values) == indices, 'Delta membership differs'
    result, changes = [row[:] for row in left], []
    for index in sorted(indices):
        assert 0 <= index < len(basis), 'Invalid target index'
        assert basis[index][0] > 0, 'Opposite-side target'
        after = [v+d for v, d in zip(basis[index], values[index])]
        distance = math.dist(left[index], after)
        assert distance <= .0045, 'Left patch target change exceeds bound'
        result[index] = after
        if after != left[index]:
            changes.append({'vertex': index, 'component': 5, 'role': component['role'],
                'before': left[index], 'after': after, 'change_m': distance})
    return {'left': result, 'changes': changes, 'eligible_vertices': sorted(indices)}


if __name__ == '__main__':
    print(json.dumps(plan_left_patch(**json.load(sys.stdin))))
