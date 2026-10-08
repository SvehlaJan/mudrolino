"""Build a smooth lowered T02 hood against the fixed female outfit cloth.

The new sheet is monotone in x/z. Only a fresh parameter grid is sampled on the
back cloth; no folded hood vertices are projected. The upper seam is attached,
the lower bowl is free, and thickness is applied after the surface is complete.
All actual gait/head/own-shell acceptance belongs to the source-bound outfit
verifier. This helper neither modifies the cloth nor the female foundation.
"""
import math


def hood_sheet_samples(*, seam_z=1.380, bottom_z=1.235, half_width=.100,
                       depth=.015, bowl_start_z=1.300, side_arch=.015,
                       segments=32, rows=16, bottom_bulge=0.0):
    """Return ordered sheet rows with an attached upper seam and low bowl.

    Each sample defines x/z, posterior bulge and its attachment role. The lower
    boundary rounds upward at its sides; bowl bulge stays zero in the measured
    upper/central hair contact band. A finite nondegenerate grid is required.
    bottom_bulge keeps that fraction of the depth at the lower rim, so a full
    bowl hangs off the back as a pouch instead of tapering into the cloth.
    """
    values = (seam_z, bottom_z, half_width, depth, bowl_start_z, side_arch)
    if not all(math.isfinite(value) for value in values):
        raise ValueError('Hood parameters must be finite')
    if not bottom_z < bowl_start_z < seam_z:
        raise ValueError('Require bottom_z < bowl_start_z < seam_z')
    if half_width <= 0 or depth < 0 or side_arch < 0 or not 0 <= bottom_bulge <= 1:
        raise ValueError('Require positive width and nonnegative depth/side arch')
    if not isinstance(segments, int) or not isinstance(rows, int) or segments < 8 or rows < 4:
        raise ValueError('Require at least eight segments and four rows')
    grid = []
    for row in range(rows + 1):
        v = row / rows
        width = half_width * (1 - .22 * v)
        samples = []
        for column in range(segments + 1):
            u = 2 * column / segments - 1
            edge = u * u
            top = seam_z + side_arch * edge
            bottom = bottom_z + .025 * edge
            if not bottom < top:
                raise ValueError('Side arch must preserve descending sheet rows')
            z = (1 - v) * top + v * bottom
            t = max(0, min(1, (bowl_start_z - z) / (bowl_start_z - bottom_z)))
            profile = math.sin(math.pi * t) ** 2 if t <= .5 else 1 - (1 - bottom_bulge) * math.sin(math.pi * (t - .5)) ** 2
            bulge = depth * profile * (1 - edge) ** 2
            samples.append({'x': width * u, 'z': z,
                            'bulge': bulge, 'anchor': row == 0})
        grid.append(samples)
    return grid


def create_lowered_hood(cloth, arm, outer_material, lining_material, *,
                        seam_z=1.380, bottom_z=1.235, half_width=.100,
                        depth=.015, bowl_start_z=1.300, side_arch=.015,
                        clearance=.0025, thickness=.002, segments=32, rows=16, bottom_bulge=0.0):
    """Return a separate skinned hood with role 2 and explicit seam anchors.

    `cloth` must be in identity rest space and carry female_detail_role; role 0
    triangles define the main fabric. Posterior -Y rays select its exterior back
    surface, avoiding nearest-surface jumps onto sleeves or interior lining.
    Skin weights are interpolated on each actual sampled cloth triangle.
    """
    import bpy
    import bmesh
    from mathutils import Matrix, Vector
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import barycentric_transform

    if not math.isfinite(clearance) or not math.isfinite(thickness) or thickness <= 0 or clearance <= thickness / 2:
        raise ValueError('Positive thickness needs exterior clearance above its half-thickness')
    if max(abs(cloth.matrix_world[i][j] - (1 if i == j else 0)) for i in range(4) for j in range(4)) > 1e-7:
        raise ValueError('Hood cloth must use identity rest-space transform')
    grid = hood_sheet_samples(seam_z=seam_z, bottom_z=bottom_z,
                              half_width=half_width, depth=depth,
                              bowl_start_z=bowl_start_z, side_arch=side_arch,
                              segments=segments, rows=rows, bottom_bulge=bottom_bulge)
    roles = cloth.data.attributes['female_detail_role']
    if roles.domain != 'POINT' or roles.data_type != 'INT':
        raise ValueError('Cloth role attribute must be POINT/INT')
    cloth.data.calc_loop_triangles()
    triangles = [tuple(t.vertices) for t in cloth.data.loop_triangles
                 if all(roles.data[i].value == 0 for i in t.vertices)]
    points = [v.co.copy() for v in cloth.data.vertices]
    if not triangles:
        raise ValueError('Main cloth has no role-0 triangles')
    surface = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    vertices, weights, anchors = [], [], []
    for row in grid:
        for sample in row:
            point, normal, triangle, _ = surface.ray_cast(
                Vector((sample['x'], 1, sample['z'])), Vector((0, -1, 0)), 2)
            if point is None or normal.y <= 0:
                raise ValueError('Missing exterior upper-back cloth sample: ' + str(sample))
            indices = triangles[triangle]
            a, b, c = [points[i] for i in indices]
            if (b-a).cross(c-a).length < 1e-12:
                raise ValueError('Degenerate cloth triangle at hood sample')
            bary = barycentric_transform(point, a, b, c,
                                         Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
            factors = [max(0, min(1, value)) for value in bary]
            total = sum(factors)
            if total <= 0:
                raise ValueError('Invalid cloth barycentric weights')
            skin = {}
            for i, factor in zip(indices, factors):
                for group in cloth.data.vertices[i].groups:
                    name = cloth.vertex_groups[group.group].name
                    if name in arm.data.bones:
                        skin[name] = skin.get(name, 0) + factor * group.weight / total
            retained = sorted(((name, value) for name, value in skin.items() if value > .0001),
                              key=lambda item: -item[1])[:4]
            total = sum(value for _, value in retained)
            if total <= 0:
                raise ValueError('Hood sample has no skeletal cloth weights')
            vertices.append((point.x, point.y + clearance + sample['bulge'], point.z))
            weights.append([(name, value / total) for name, value in retained])
            anchors.append(sample['anchor'])
    faces = []
    stride = segments + 1
    for row in range(rows):
        for column in range(segments):
            i = row * stride + column
            faces.append((i, i+1, i+stride+1, i+stride))
    mesh = bpy.data.meshes.new('T02 smooth lowered hood sheet')
    mesh.from_pydata(vertices, [], faces); mesh.update()
    obj = bpy.data.objects.new('T02 lowered hanging hood', mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(outer_material); mesh.materials.append(lining_material)
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    # Recalculation can choose either winding for an open sheet. Orient its
    # connected surface explicitly before thickness assigns outer/lining faces.
    if sum(face.normal.y for face in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        bm.normal_update()
    if sum(face.normal.y for face in bm.faces) <= 0:
        bm.free()
        raise ValueError('Lowered hood sheet has no posterior exterior')
    bm.to_mesh(mesh); bm.free(); mesh.update()
    for face in mesh.polygons:
        face.use_smooth = True
    # The regular winding points posteriorly (+Y); preserve it for orange outer
    # fabric and a darker inner surface after centered controlled thickness.
    if sum(face.normal.y for face in mesh.polygons) <= 0:
        raise ValueError('Lowered hood sheet points away from its exterior')
    for bone in arm.data.bones:
        obj.vertex_groups.new(name=bone.name)
    for i, skin in enumerate(weights):
        for name, weight in skin:
            obj.vertex_groups[name].add([i], weight, 'REPLACE')
    role = mesh.attributes.new(name='female_detail_role', type='INT', domain='POINT')
    anchor = mesh.attributes.new(name='female_hood_anchor', type='BOOLEAN', domain='POINT')
    for i, is_anchor in enumerate(anchors):
        role.data[i].value = 2; anchor.data[i].value = is_anchor
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    solid = obj.modifiers.new('Controlled lowered hood thickness', 'SOLIDIFY')
    solid.thickness = thickness; solid.offset = 0
    solid.use_even_offset = True; solid.material_offset = 1; solid.material_offset_rim = 1
    bpy.ops.object.modifier_apply(modifier=solid.name)
    obj.parent = arm; obj.matrix_world = Matrix.Identity(4)
    skin = obj.modifiers.new('Actual upper-back cloth skin', 'ARMATURE'); skin.object = arm
    obj['hood_construction'] = 'monotone fresh sheet; lower rounded bowl; no folded projection'
    obj['hood_parameters'] = str({'seam_z': seam_z, 'bottom_z': bottom_z, 'half_width': half_width,
                                   'depth': depth, 'bowl_start_z': bowl_start_z, 'side_arch': side_arch,
                                   'clearance': clearance, 'thickness': thickness,
                                   'segments': segments, 'rows': rows, 'bottom_bulge': bottom_bulge})
    return obj
