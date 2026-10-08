"""Compare directed polygon inventories independently of Blender face order."""
from collections import Counter
import json
import sys


def inventory(faces):
    result = Counter()
    for face in faces:
        if len(face) < 3 or len(set(face)) != len(face) or any(type(v) != int or v < 0 for v in face):
            raise ValueError('Distinct nonnegative polygon indices required')
        points = tuple(face)
        result[min(points[i:]+points[:i] for i in range(len(points)))] += 1
    return result


if __name__ == '__main__':
    data = json.load(sys.stdin)
    print(json.dumps(inventory(data['expected']) == inventory(data['actual'])))
