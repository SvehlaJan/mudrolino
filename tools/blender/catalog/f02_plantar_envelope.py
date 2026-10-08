"""One conservative F02 plantar envelope; fixed base, rigid free-row offsets."""
import copy
import json
import math
import sys


def plantar_weight(twist_rad):
    if not math.isfinite(twist_rad): raise ValueError('Nonfinite ankle angle')
    return min(1, max(0, -twist_rad/.8))


def calibrate(samples, row_count=5):
    if not isinstance(row_count, int) or row_count < 2: raise ValueError('Invalid row inventory')
    coefficients = {side: [0.0]*row_count for side in ['Left', 'Right']}; witnesses = {side: [None]*row_count for side in coefficients}
    inactive, basal = [], []
    for sample in samples:
        side, row, required = sample['side'], sample['row'], sample['required_rest_shift_m']
        if side not in coefficients or not isinstance(row, int) or not 0 <= row < row_count or not math.isfinite(required): raise ValueError('Invalid calibration sample')
        weight = plantar_weight(sample['twist_rad']); required = max(0, required)
        if required <= 1e-7: continue
        if row == 0: basal.append(copy.deepcopy(sample)); continue
        if weight <= 1e-8: inactive.append(copy.deepcopy(sample)); continue
        coefficient = required/weight
        if coefficient > coefficients[side][row]:
            coefficients[side][row] = coefficient; witnesses[side][row] = {**copy.deepcopy(sample), 'weight': weight, 'target_coefficient_m': coefficient}
    return {'coefficients': coefficients, 'witnesses': witnesses, 'inactive_constraints': inactive, 'fixed_base_constraints': basal,
            'rule': 'One maximum required rear target per side/free row; clamp(-twist/0.8,0,1). No search, basal target zero.'}


def plan(coordinates, rows, rear, coefficients, rest_shift_m=.002, expected_detail_vertices=60):
    if set(coordinates) != {'Basis', 'knee_clearance_Left', 'knee_clearance_Right'}: raise ValueError('Unexpected source key inventory')
    count = len(coordinates['Basis'])
    if any(len(points) != count or any(len(p) != 3 or any(not math.isfinite(v) for v in p) for p in points) for points in coordinates.values()): raise ValueError('Changed topology or nonfinite coordinates')
    if set(rows) != set(rear) or set(rows) != set(coefficients) or set(rows) != {'Left', 'Right'}: raise ValueError('Missing side')
    if not math.isfinite(rest_shift_m) or not 0 <= rest_shift_m <= .002: raise ValueError('Standing free-row offset exceeds 2 mm bound')
    ids = [i for side_rows in rows.values() for row in side_rows for i in row]
    if len(ids) != len(set(ids)) or len(ids) != expected_detail_vertices or any(not isinstance(i, int) or not 0 <= i < count for i in ids): raise ValueError('Changed audited detail inventory')
    result = copy.deepcopy(coordinates); basal = []; changed = []
    for side, side_rows in rows.items():
        if len(side_rows) < 2 or any(len(row) != len(side_rows[0]) for row in side_rows) or len(coefficients[side]) != len(side_rows): raise ValueError('Changed ordered row inventory')
        if len(rear[side]) != 3 or abs(math.dist(rear[side], [0, 0, 0])-1) > 1e-6: raise ValueError('Rear must be unit length')
        if coefficients[side][0] != 0 or any(not math.isfinite(v) or v < 0 for v in coefficients[side]): raise ValueError('Basal target must stay fixed and targets finite/nonnegative')
        if any(coordinates['Basis'][i][0]*(1 if side == 'Left' else -1) <= .04 for row in side_rows for i in row): raise ValueError('Opposite-side row membership')
        basal += side_rows[0]
        for row in side_rows[1:]:
            changed += row
            for points in result.values():
                for i in row: points[i] = [v+rest_shift_m*a for v, a in zip(points[i], rear[side])]
    for side, side_rows in rows.items():
        target = copy.deepcopy(result['Basis'])
        for row_index, row in enumerate(side_rows[1:], 1):
            for i in row: target[i] = [v+coefficients[side][row_index]*a for v, a in zip(target[i], rear[side])]
        result['ankle_envelope_'+side] = target
    return {'coordinates': result, 'changed_free_vertices': sorted(changed), 'preserved_basal_vertices': sorted(basal), 'coefficients': coefficients,
            'rest_shift_m': rest_shift_m, 'weights_changed': False, 'scope': 'Basal and all unaffected coordinates fixed; uniform row translations preserve width/thickness and existing knee deltas. Two side-isolated ankle targets.'}


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin); operation = data.pop('operation')
        if operation == 'calibrate': result = calibrate(**data)
        elif operation == 'plan': result = plan(**data)
        else: raise ValueError('Unknown operation')
        print(json.dumps(result, allow_nan=False))
    except (ValueError, TypeError, KeyError) as error:
        print(str(error), file=sys.stderr); sys.exit(1)
