"""Partition saved authored geometry by mesh edges, preserving vertex indices."""
import json
import sys


def components(vertex_count, edges):
    neighbors = [set() for _ in range(vertex_count)]
    for a, b in edges:
        neighbors[a].add(b)
        neighbors[b].add(a)
    unseen = set(range(vertex_count))
    result = []
    while unseen:
        pending = [min(unseen)]
        group = set()
        while pending:
            vertex = pending.pop()
            if vertex in group:
                continue
            group.add(vertex)
            pending.extend(neighbors[vertex] - group)
        unseen -= group
        result.append(sorted(group))
    return result


if __name__ == '__main__':
    print(json.dumps(components(**json.load(sys.stdin))))
