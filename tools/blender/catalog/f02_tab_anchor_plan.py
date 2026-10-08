"""Bound F02 detail-only basal-shell weight transfers without importing Blender."""
import copy
import json
import math
import sys


def plan_anchor_weights(detail_ids, original_weights, anchors, expected_detail_vertices=60):
    assert len(detail_ids) == len(set(detail_ids)) == expected_detail_vertices, 'Audited tab inventory changed'
    assert all(isinstance(i, int) and i >= 0 and str(i) in original_weights for i in detail_ids), 'Missing original tab weights'
    result = copy.deepcopy(original_weights)
    covered = set(); changes = []
    for anchor in anchors:
        side = anchor['side']; assert side in ['Left', 'Right'], 'Unknown anatomical side'
        triangle, factors, weights, vertices = [anchor[key] for key in ['triangle', 'factors', 'weights', 'vertices']]
        assert len(triangle) == len(set(triangle)) == 3 and all(isinstance(i, int) and i >= 0 for i in triangle), 'Invalid underlying triangle'
        assert len(factors) == 3 and all(math.isfinite(value) and 0 <= value <= 1 for value in factors) and abs(sum(factors)-1) < 1e-6, 'Invalid barycentric identity'
        assert 1 <= len(weights) <= 4 and all(name.startswith(side) and math.isfinite(value) and value > .0001 for name, value in weights.items()) and abs(sum(weights.values())-1) < 1e-6, 'Invalid anatomical normalized skin'
        assert vertices and len(vertices) == len(set(vertices)) and all(i in detail_ids and i not in covered for i in vertices), 'Invalid or duplicate column membership'
        for i in vertices:
            covered.add(i)
            if original_weights[str(i)] != weights:
                changes.append({'index': i, 'old': copy.deepcopy(original_weights[str(i)]), 'new': copy.deepcopy(weights), 'side': side, 'triangle': list(triangle), 'factors': list(factors)})
            result[str(i)] = copy.deepcopy(weights)
    assert covered == set(detail_ids), 'Incomplete basal column coverage'
    return {'weights': result, 'changes': sorted(changes, key=lambda row: row['index']), 'detail_vertices': sorted(covered),
            'scope': 'Only audited heel-tab weights; actual basal shell triangle identities retained. No geometry, morph, driver or body changes.'}


if __name__ == '__main__':
    print(json.dumps(plan_anchor_weights(**json.load(sys.stdin))))
