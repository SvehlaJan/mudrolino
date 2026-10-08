"""Reject accidental gait poses captured as an adapter's native rest matrices."""
import json
import math
import sys


def validate_runtime_rest(captured, expected):
    assert captured and set(captured) == set(expected), 'Captured rig inventory differs'
    error = 0
    for name in expected:
        for matrix in (captured[name], expected[name]):
            assert len(matrix) == 4 and all(len(row) == 4 for row in matrix)
            assert all(math.isfinite(x) for row in matrix for x in row)
        error = max(error, max(abs(captured[name][i][j] - expected[name][i][j]) for i in range(4) for j in range(4)))
    assert error < 1e-6, ('Captured runtime rest is posed', error)
    return error


if __name__ == '__main__':
    print(json.dumps(validate_runtime_rest(**json.load(sys.stdin))))
