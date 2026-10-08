"""Bound the target-only Right-key attachment repair to two audited B04 details."""
import json
import math
import sys


def vector(row):
    assert isinstance(row, (list, tuple)) and len(row) == 3
    assert all(isinstance(value, (int, float)) and math.isfinite(value) for value in row), 'Invalid coordinate'
    return list(row)


def plan_targets(basis, right, components, front_deltas, host_deltas):
    assert len(basis) == len(right), 'Coordinate inventory changed'
    basis, right = [vector(row) for row in basis], [vector(row) for row in right]
    expected = {0: ('front pocket opening tube', 104), 4: ('rounded back pocket patch', 242)}
    assert len(components) == 2 and {row['component'] for row in components} == set(expected), 'Target component inventory changed'
    seen, changes = set(), []
    result = [row[:] for row in right]
    for row in components:
        role, count = expected[row['component']]
        indices = set(row['vertices'])
        assert row['role'] == role and len(row['vertices']) == len(indices) == count, 'Target component inventory changed'
        assert not seen & indices, 'Overlapping target components'
        seen |= indices
        assert row['materials'] == ['A ivory tapered trouser pockets and seams'], 'Unexpected detail material'
        values = {int(index): vector(delta) for index, delta in (front_deltas if row['component'] == 0 else host_deltas).items()}
        assert set(values) == indices, 'Delta membership differs'
        for index in sorted(indices):
            assert 0 <= index < len(basis), 'Invalid target index'
            assert basis[index][0] < 0, 'Opposite-side target'
            delta = values[index]
            after = [v + d for v, d in zip(right[index] if row['component'] == 0 else basis[index], delta)]
            distance = math.dist(right[index], after)
            if row['component'] == 0:
                assert 0 < distance <= .00055, 'Front corrective exceeds bound'
            else:
                assert distance <= .007, 'Host morph change exceeds bound'
            result[index] = after
            if after != right[index]:
                changes.append({'vertex': index, 'component': row['component'], 'role': role,
                                'before': right[index], 'after': after, 'change_m': distance})
    assert len(seen) == 346 and len([r for r in changes if r['component'] == 0]) == 104
    return {'right': result, 'changes': changes, 'eligible_vertices': sorted(seen)}


if __name__ == '__main__':
    print(json.dumps(plan_targets(**json.load(sys.stdin))))
