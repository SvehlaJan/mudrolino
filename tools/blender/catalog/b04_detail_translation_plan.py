"""Bound B04 detail translations by audited component topology and material."""
from collections import Counter
import json
import sys


def plan_details(components, front_offset_m=.0015, pocket_offset_m=.0025):
    assert 0 <= front_offset_m <= .0025, 'Front-detail shift exceeds bound'
    assert 0 <= pocket_offset_m <= .0035, 'Pocket shift exceeds bound'
    counts = {'front pocket opening tube': (2, 104), 'fly seam tube': (1, 136),
              'waist button': (1, 114), 'rounded back pocket patch': (2, 242),
              'belt loop': (5, 20)}
    assert Counter(row['role'] for row in components) == Counter({role: count for role, (count, _) in counts.items()}), 'Authored component count changed'
    seen = set()
    for row in components:
        assert len(row['vertices']) == counts[row['role']][1], 'Authored component count changed'
        expected = 'A navy tapered trouser button' if row['role'] == 'waist button' else 'A ivory tapered trouser pockets and seams'
        assert row['materials'] == [expected], 'Unexpected detail material'
        indices = set(row['vertices'])
        assert len(indices) == len(row['vertices']) and not seen & indices, 'Overlapping detail components'
        seen |= indices
    offsets = {'front pocket opening tube': (0, -front_offset_m, 0),
               'fly seam tube': (0, -.0015, 0), 'waist button': (0, -.0012, 0),
               'rounded back pocket patch': (0, pocket_offset_m, 0)}
    return [{'role': row['role'], 'component': row['component'], 'vertices': row['vertices'],
             'offset_m': offsets[row['role']]} for row in components if row['role'] in offsets]


if __name__ == '__main__':
    print(json.dumps(plan_details(**json.load(sys.stdin))))
