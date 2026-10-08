"""Apply a bounded vertex revision without thousands of repeated group removals."""


def apply_pocket_edits(obj, changes):
    indices = [r['vertex'] for r in changes]
    assert len(indices) == len(set(indices)) and indices
    assert all(0 <= i < len(obj.data.vertices) for i in indices)
    assert all(set(r['keys']) == {k.name for k in obj.data.shape_keys.key_blocks} for r in changes)
    # Clear only eligible indices, once per group. Other cloth, body and cuffs
    # retain their exact influences. Adding individual interpolated weights
    # remains necessary because each point has its own barycentric binding.
    for group in obj.vertex_groups:
        group.remove(indices)
    for row in changes:
        i = row['vertex']
        obj.data.vertices[i].co = row['point']
        for name, point in row['keys'].items():
            obj.data.shape_keys.key_blocks[name].data[i].co = point
        for group, weight in row['weights']:
            obj.vertex_groups[group].add([i], weight, 'REPLACE')
    obj.data.update()
