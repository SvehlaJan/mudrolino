"""Prove seeded outer/inner vertex correspondence by full oriented topology."""
import json
import sys
from collections import Counter


def cycle(face):
    face=tuple(face)
    return min(face[i:]+face[:i] for i in range(len(face)))


def neighbors(faces):
    result={v:set() for f in faces for v in f}
    for face in faces:
        assert len(face)>=3 and len(set(face))==len(face), 'Degenerate layer polygon'
        for a,b in zip(face,face[1:]+face[:1]):
            result[a].add(b);result[b].add(a)
    return result


def pair_layers(outer,inner,seeds):
    a,b=neighbors(outer),neighbors(inner)
    assert len(a)==len(b) and len(outer)==len(inner), 'Layer inventory sizes differ'
    mapping={int(k):v for k,v in seeds.items()}
    assert mapping and set(mapping)<=set(a) and set(mapping.values())<=set(b), 'Invalid seed inventory'
    assert len(set(mapping.values()))==len(mapping), 'Seed mapping is not one-to-one'
    assert all(len(a[i])==len(b[j]) for i,j in mapping.items()), 'Seed topology differs'
    while len(mapping)<len(a):
        previous=len(mapping)
        for i in sorted(set(a)-set(mapping)):
            mapped_neighbors={mapping[n] for n in a[i] if n in mapping}
            if not mapped_neighbors:continue
            candidates=set.intersection(*(b[j] for j in mapped_neighbors))-set(mapping.values())
            candidates={j for j in candidates if len(a[i])==len(b[j])}
            if len(candidates)==1:mapping[i]=next(iter(candidates))
        assert len(mapping)>previous, 'Ambiguous layer correspondence'
    assert all({mapping[n] for n in a[i]}==b[j] for i,j in mapping.items()), 'Complete edge inventory differs'
    expected=Counter(cycle(tuple(mapping[v] for v in reversed(f))) for f in outer)
    actual=Counter(cycle(f) for f in inner)
    assert expected==actual, 'Reversed face inventory differs'
    return {'vertex_pairs':sorted([i,j] for i,j in mapping.items()),'paired_faces':len(outer),
        'seed_count':len(seeds),'scope':'Complete bijection, adjacency equality and reversed cyclic face inventory including multiplicity.'}


if __name__=='__main__':print(json.dumps(pair_layers(**json.load(sys.stdin))))
