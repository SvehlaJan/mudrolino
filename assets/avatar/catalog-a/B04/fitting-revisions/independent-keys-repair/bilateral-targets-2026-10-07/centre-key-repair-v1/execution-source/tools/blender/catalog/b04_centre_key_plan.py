"""Reset only proven inherited coordinates, using the builder's signed side mask."""
import json
import math
import sys


def plan_centre_repair(basis, left, right, expected_count, tolerance=1e-7):
    assert len(basis) == len(left) == len(right) and len(basis) > 0
    assert 0 < tolerance <= 1e-7
    assert isinstance(expected_count, int) and expected_count >= 0
    assert all(len(p) == 3 and all(math.isfinite(x) for x in p) for values in (basis,left,right) for p in values)
    changes, intended = [], []
    corrected = [list(p) for p in right]
    for i, p in enumerate(basis):
        ld, rd = math.dist(p,left[i]), math.dist(p,right[i])
        assert not (p[0] < 0 and ld > tolerance), ('Left key moves the opposite side',i)
        assert p[0] != 0 or max(ld,rd) <= tolerance, ('Nonzero centre-axis corrective',i)
        if p[0] < 0 and rd > tolerance:
            intended.append(i)
        if p[0] > 0 and rd > tolerance:
            assert math.dist(left[i],right[i]) <= tolerance, ('Right coordinate is not inherited from Left',i)
            changes.append({'vertex':i,'before':list(right[i]),'after':list(p),'removed_delta_m':rd})
            corrected[i] = list(p)
    assert len(changes) == expected_count, ('Audited inherited count changed',len(changes))
    assert all(math.dist(corrected[i],basis[i]) <= tolerance for i,p in enumerate(basis) if p[0] >= 0)
    return {'changes':changes,'corrected_right':corrected,'intended_right':intended,
        'max_removed_delta_m':max((r['removed_delta_m'] for r in changes),default=0),
        'side_exclusion_m':0,'tolerance_m':tolerance}


if __name__ == '__main__':
    print(json.dumps(plan_centre_repair(**json.load(sys.stdin))))
