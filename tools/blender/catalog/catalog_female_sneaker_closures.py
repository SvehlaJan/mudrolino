"""Fresh female F01 closure sheets fitted to the finished upper.

Call after the front-opening relief and before garment normalization/export.
Only role-4 tongue/strap topology is replaced; the cleared role-0 upper, collar
and sole are retained. Full animated fit remains the assembly verifier's job.
"""
from __future__ import annotations

import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from catalog_footwear_geometry import foot_rest_transform

_UPPER_MATERIALS = {'A ivory sneaker upper', 'A cornflower sneaker panels'}


def _surface_weights(point, triangle, points, vertices):
    a, b, c = [points[i] for i in triangle]
    assert (b - a).cross(c - a).length > 1e-12, 'Degenerate upper skin triangle'
    factors = barycentric_transform(point, a, b, c,
                                   Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    factors = [max(0.0, min(1.0, factor)) for factor in factors]
    total = sum(factors)
    assert total > 0, 'No barycentric upper contribution'
    weights = {}
    for index, factor in zip(triangle, factors):
        for group in vertices[index].groups:
            weights[group.group] = weights.get(group.group, 0.0) + group.weight * factor / total
    rows = sorted(((index, weight) for index, weight in weights.items() if weight > 1e-7),
                  key=lambda row: (-row[1], row[0]))[:4]
    total = sum(weight for _, weight in rows)
    assert total > 0, 'Upper sample has no skin weights'
    return {index: weight / total for index, weight in rows}


def _sheet(surface, triangles, points, vertices, transform, *, width, front, rear,
           columns, rows, corner, gap, thickness, material):
    """Sample one regular sheet, then add parallel vertical thickness layers.

    Vertical rays select the outside of the actual upper. The dense regular
    x/y grid cannot fold like per-vertex projection of an existing solid. A
    modest positive gap also keeps triangulated chords above the curved shell.
    """
    samples = []
    minimum_normal_z = 1.0
    for row in range(rows):
        along = row / (rows - 1)
        y = front + (rear - front) * along
        # Round the four corners without a bevel modifier changing bindings.
        edge = min(along, 1.0 - along)
        taper = corner * max(0.0, 1.0 - edge / .16) ** 2
        half_width = width - taper
        for column in range(columns):
            x = half_width * (2.0 * column / (columns - 1) - 1.0)
            origin = transform @ Vector((x, y, .25))
            point, normal, index, _ = surface.ray_cast(origin, Vector((0, 0, -1)), .30)
            assert point is not None, f'Closure sample misses finished upper: x={x:.6f}, y={y:.6f}'
            assert normal.z > .05, f'Closure sample hit inner/vertical upper: {tuple(normal)}'
            minimum_normal_z = min(minimum_normal_z, normal.z)
            weights = _surface_weights(point, triangles[index], points, vertices)
            samples.append((point.copy(), weights))
    count = len(samples)
    coordinates = [point + Vector((0, 0, offset))
                   for offset in [gap, gap + thickness] for point, _ in samples]
    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            i = row * columns + column
            quad = (i, i + 1, i + 1 + columns, i + columns)
            faces.append(tuple(reversed(quad)))
            faces.append(tuple(index + count for index in quad))
    boundary = (list(range(columns)) +
                [row * columns + columns - 1 for row in range(1, rows)] +
                list(range(count - 2, count - columns - 1, -1)) +
                [row * columns for row in range(rows - 2, 0, -1)])
    for i, j in zip(boundary, boundary[1:] + boundary[:1]):
        faces.append((i, j, j + count, i + count))
    return {'coordinates': coordinates, 'weights': [weights for _, weights in samples] * 2,
            'faces': faces, 'material': material,
            'metadata': {'vertices': len(coordinates), 'faces': len(faces),
                         'width_m': width * 2, 'local_y_m': [front, rear],
                         'lower_gap_m': gap, 'thickness_m': thickness,
                         'minimum_sample_normal_z': minimum_normal_z}}


def replace_female_sneaker_closures(shoes, arm):
    """Replace role-4 F01 details and return measured construction metadata.

    The study contract uses applied world-meter mesh and armature transforms.
    Samples bind to current upper triangles, never to body or stale male detail
    weights. All input checks and surface samples precede destructive edits.
    """
    assert shoes.type == 'MESH' and arm.type == 'ARMATURE'
    assert not shoes.data.shape_keys, 'F01 closure replacement requires no shape keys'
    for obj in [shoes, arm]:
        assert all(abs(obj.matrix_world[row][column] - Matrix.Identity(4)[row][column]) < 1e-7
                   for row in range(4) for column in range(4)), 'Apply world-meter transforms first'
    roles = shoes.data.attributes.get('female_detail_role')
    anchors = shoes.data.attributes.get('female_hood_anchor')
    assert roles and roles.domain == 'POINT' and roles.data_type == 'INT'
    assert anchors and anchors.domain == 'POINT' and anchors.data_type == 'BOOLEAN'
    old_indices = {v.index for v in shoes.data.vertices if roles.data[v.index].value == 4}
    assert old_indices, 'No F01 tongue/strap role-4 topology to replace'
    assert all(all(i in old_indices for i in face.vertices) or
               all(i not in old_indices for i in face.vertices) for face in shoes.data.polygons), \
        'Closure shares a face with retained shell'
    material_indices = {material.name: index for index, material in enumerate(shoes.data.materials) if material}
    assert _UPPER_MATERIALS <= material_indices.keys(), 'Expected canonical F01 upper materials'
    shoes.data.calc_loop_triangles()
    triangles = [tuple(triangle.vertices) for triangle in shoes.data.loop_triangles
                 if shoes.data.materials[triangle.material_index].name in _UPPER_MATERIALS and
                 all(roles.data[i].value == 0 for i in triangle.vertices)]
    assert triangles, 'No finished upper triangles'
    points = [vertex.co.copy() for vertex in shoes.data.vertices]
    surface = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    sheets = []
    records = []
    for sign, label in [(1, 'Left'), (-1, 'Right')]:
        transform = foot_rest_transform(arm, sign)
        tongue = _sheet(surface, triangles, points, shoes.data.vertices, transform,
                        width=.032, front=-.130, rear=-.078, columns=25, rows=25,
                        corner=.005, gap=.0025, thickness=.0015,
                        material=material_indices['A cornflower sneaker panels'])
        strap = _sheet(surface, triangles, points, shoes.data.vertices, transform,
                       width=.058, front=-.112, rear=-.087, columns=41, rows=13,
                       corner=.003, gap=.0065, thickness=.002,
                       material=material_indices['A ivory sneaker upper'])
        sheets.extend([tongue, strap])
        records.append({'side': label, 'tongue': tongue['metadata'], 'strap': strap['metadata']})
    bm = bmesh.new()
    try:
        bm.from_mesh(shoes.data)
        role_layer = bm.verts.layers.int.get('female_detail_role')
        assert role_layer is not None
        deform = bm.verts.layers.deform.verify()
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v[role_layer] == 4], context='VERTS')
        fresh_faces = []
        for sheet in sheets:
            fresh = []
            for coordinate, weights in zip(sheet['coordinates'], sheet['weights']):
                vertex = bm.verts.new(coordinate)
                vertex[role_layer] = 4
                for group, weight in weights.items():
                    vertex[deform][group] = weight
                fresh.append(vertex)
            for indices in sheet['faces']:
                face = bm.faces.new([fresh[i] for i in indices])
                face.material_index = sheet['material']
                face.smooth = True
                fresh_faces.append(face)
        bmesh.ops.recalc_face_normals(bm, faces=fresh_faces)
        bm.to_mesh(shoes.data)
    finally:
        bm.free()
    shoes.data.update()
    roles = shoes.data.attributes['female_detail_role']
    anchors = shoes.data.attributes['female_hood_anchor']
    for vertex in shoes.data.vertices:
        if roles.data[vertex.index].value == 4:
            anchors.data[vertex.index].value = False
    return {'method': 'regular upper-ray sheets, then vertical outward thickness',
            'removed_role4_vertices': len(old_indices),
            'new_role4_vertices': sum(len(sheet['coordinates']) for sheet in sheets),
            'upper_sample_triangles': len(triangles), 'sides': records,
            'skin': 'actual current upper triangle barycentric interpolation; top 4 normalized',
            'scope': 'Only role-4 topology replaced; animated clearance requires fresh outfit proof'}
