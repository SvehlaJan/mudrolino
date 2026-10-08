"""T06 revision: broad placket, four large navy buttons and an orange collar facing.

The canonical henley carries the user-chosen four buttons (2026-10-06) but as 11 mm
dots on a 22 mm placket, which read as specks at runtime size. This revision follows
the four-button reference: a 38 mm placket with a rounded bottom, 21 mm rounded
navy buttons and the subtle orange facing inside the neckline. The shell is the
canonical T05-based sweatshirt; details inherit its skinning as before.

Run through build_piece (same arguments as the canonical builders), ideally on the
+30% head foundation: --foundation H01/style-revisions/painted-face-scale-130/foundation.blend
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t05 import create_sweatshirt
from build_catalog_t02 import mesh_object
from build_catalog_head import material, sphere
from catalog_piece import build_piece, long_top_coverage, inherit_detail_weights

PLACKET_HALF_WIDTH = .019
PLACKET_TOP, PLACKET_BOTTOM = 1.405, 1.283
BUTTON_RADIUS, BUTTON_DEPTH = .0105, .0042
BUTTON_ROWS = (1.389, 1.362, 1.335, 1.308)
FACING_DEPTH = .06  # Orange facing: rib faces within this distance below the highest neckline point.


def create_henley(arm, body):
    obj = create_sweatshirt(arm, body)
    obj.name = 'T06_henley'
    obj.data.name = 'T06 ivory henley shell'
    ivory = material('A ivory henley fabric', (.82, .76, .64), .88)
    rib = material('A ivory henley ribbing', (.74, .68, .57), .9)
    placket_mat = material('A ivory henley placket', (.78, .715, .60), .88)
    navy = material('A navy henley buttons', (.026, .049, .106), .8)
    facing = material('A orange henley collar facing', (.86, .30, .07), .88)
    obj.data.materials[0] = ivory
    obj.data.materials[1] = rib
    obj.data.materials.append(facing)
    facing_index = len(obj.data.materials) - 1

    # Orange facing: the rib's upward-facing top rim and its inward surface around the
    # neck opening; the inner surface alone lies against the neck and never shows.
    neck_top = max(v.co.z for v in obj.data.vertices if abs(v.co.x) < .12)
    neck_centre = Vector((0, sum(v.co.y for v in obj.data.vertices if v.co.z > neck_top - .01) /
                          max(1, sum(1 for v in obj.data.vertices if v.co.z > neck_top - .01)), 0))
    faced = 0
    for polygon in obj.data.polygons:
        centre = polygon.center
        if polygon.material_index != 1 or centre.z < neck_top - FACING_DEPTH:
            continue
        radial = Vector((centre.x - neck_centre.x, centre.y - neck_centre.y, 0))
        inward = radial.length > 1e-6 and polygon.normal.dot(radial.normalized()) < 0
        # The reference shows orange inside and along the back of the collar; the front rib stays ivory.
        if inward or (polygon.normal.z > .45 and centre.y > neck_centre.y):
            polygon.material_index = facing_index
            faced += 1
    assert faced, 'No collar facing faces found'

    tree = BVHTree.FromPolygons([v.co for v in obj.data.vertices], [tuple(p.vertices) for p in obj.data.polygons])

    def front(x, z, offset):
        point, normal, _, _ = tree.ray_cast(Vector((x, -.45, z)), Vector((0, 1, 0)))
        assert point is not None, (x, z)
        if normal.y > 0:
            normal.negate()
        return point + normal * offset

    # Placket: a raised strip whose bottom rounds off over its last rows.
    rows, columns = 31, 7
    vertices, faces = [], []
    for row in range(rows):
        t = row / (rows - 1)
        z = PLACKET_TOP - (PLACKET_TOP - PLACKET_BOTTOM) * t
        round_off = math.sqrt(max(0.0, 1 - max(0.0, (t - .82) / .18) ** 2))
        half = PLACKET_HALF_WIDTH * max(.15, round_off)
        for column in range(columns):
            vertices.append(tuple(front(-half + 2 * half * column / (columns - 1), z, .0022)))
    for row in range(rows - 1):
        for column in range(columns - 1):
            a = row * columns + column
            faces.append((a, a + 1, a + columns + 1, a + columns))
    parts = [mesh_object('T06 button placket', vertices, faces, placket_mat)]
    for z in BUTTON_ROWS:
        parts.append(sphere('T06 navy button', front(0, z, .0022 + BUTTON_DEPTH * .55),
                            (BUTTON_RADIUS, BUTTON_DEPTH, BUTTON_RADIUS), navy, segments=24, rings=10))
    for part in parts:
        inherit_detail_weights(part, obj, arm)
    bpy.ops.object.select_all(action='DESELECT')
    for part in [obj, *parts]:
        part.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for layer in list(obj.data.uv_layers):  # Untextured; sphere UVs would export unused TEXCOORDs.
        obj.data.uv_layers.remove(layer)
    return obj


if __name__ == '__main__':
    build_piece('T06', create_henley, long_top_coverage)
