"""Palette-A navy slip-ons: continuous vamp, side gores and orange heel tabs."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_head import material
from build_catalog_t01 import select
from catalog_bottom_details import mesh_object
from catalog_footwear_geometry import loft, ring, bind_foot_parts, join_footwear, low_top_coverage, add_soft_heel_tab_correctives
from catalog_piece import build_piece, inherit_detail_weights


def create_slip_ons(arm, body):
    navy = material('A navy slip-on upper', (.026, .049, .106), .88)
    collar_mat = material('A navy slip-on collar', (.021, .040, .090), .90)
    ivory = material('A ivory slip-on sole', (.77, .735, .655), .90)
    elastic = material('A dark slip-on elastic gores', (.015, .025, .050), .94)
    orange = material('A orange slip-on heel tabs', (.92, .25, .055), .88)
    shoes = []
    for sign in [1, -1]:
        sole = loft('F02 rounded ivory sole', [ring(z, rx, ry, cy) for z, rx, ry, cy in [
            (-.005, .070, .139, -.063), (.002, .078, .147, -.063),
            (.030, .078, .147, -.063), (.038, .074, .143, -.063)]], ivory, True)
        upper = loft('F02 continuous navy vamp', [ring(z, rx, ry, cy) for z, rx, ry, cy in [
            (.034, .074, .143, -.063), (.051, .074, .141, -.062),
            (.076, .072, .136, -.059), (.095, .067, .112, -.037),
            (.104, .061, .085, -.008), (.113, .063, .073, .011),
            (.117, .063, .073, .011)]], navy)
        select(upper)
        sub = upper.modifiers.new('Rounded navy upper', 'SUBSURF'); sub.levels = 1
        bpy.ops.object.modifier_apply(modifier=sub.name)
        thick = upper.modifiers.new('Slip-on upper thickness', 'SOLIDIFY'); thick.thickness = .0025; thick.offset = 0
        bpy.ops.object.modifier_apply(modifier=thick.name)
        rows = [ring(.118, .064, .074, .011), ring(.112, .064, .074, .011),
                ring(.112, .060, .070, .011), ring(.118, .060, .070, .011)]
        collar = loft('F02 smooth collar rim', rows+[rows[0]], collar_mat)
        # Two restrained elastic panels follow the actual outer side surface.
        tree = BVHTree.FromPolygons([v.co for v in upper.data.vertices], [tuple(p.vertices) for p in upper.data.polygons])
        parts = [sole, upper, collar]
        for side in [-1, 1]:
            vertices = []; faces = []
            for row in range(5):
                for col in range(5):
                    y = -.043+col*.0045; z = .092+row*.004
                    point, normal, _, _ = tree.ray_cast(Vector((side*.25, y, z)), Vector((-side, 0, 0)))
                    assert point is not None, (side, y, z)
                    if normal.x*side < 0: normal.negate()
                    vertices.append(tuple(point+normal*.0012))
            for row in range(4):
                for col in range(4):
                    i = row*5+col; faces.append((i, i+1, i+6, i+5))
            gore = mesh_object('F02 concealed stretch side panel', vertices, faces, elastic)
            select(gore); thick = gore.modifiers.new('Elastic edge thickness', 'SOLIDIFY'); thick.thickness = .0008; thick.offset = 0
            bpy.ops.object.modifier_apply(modifier=thick.name); parts.append(gore)
        # A thin heel ribbon lies on the rear upper and extends just above its
        # rim; the first standing block intruded into the jogger in deep kicks.
        vertices = []; faces = []
        for row, z in enumerate([.096, .103, .110, .116, .124]):
            for col, x in enumerate([-.006, 0, .006]):
                sample_z = min(z, .116)
                point, normal, _, _ = tree.ray_cast(Vector((x, .25, sample_z)), Vector((0, -1, 0)))
                assert point is not None, (x, sample_z)
                if normal.y < 0: normal.negate()
                point += normal*.0015
                if z > sample_z:
                    point.z += z-sample_z
                    if col != 1: point.z -= .001
                vertices.append(tuple(point))
        for row in range(4):
            for col in range(2):
                i = row*3+col; faces.append((i, i+1, i+4, i+3))
        tab = mesh_object('F02 flat orange heel ribbon', vertices, faces, orange)
        select(tab); thick = tab.modifiers.new('Thin heel tab', 'SOLIDIFY'); thick.thickness = .0015; thick.offset = 0
        bpy.ops.object.modifier_apply(modifier=thick.name); parts.append(tab)
        bind_foot_parts(parts, arm, body, sign)
        # Projected details are sewn to the actual shoe shell. Independent
        # ankle-body sampling gave the taller heel tab different skin weights
        # from its attachment and increased separation during the back kick.
        shell = join_footwear(parts[:3], 'F02 fitted low-top shell')
        for detail in parts[3:]:
            for group in list(detail.vertex_groups): detail.vertex_groups.remove(group)
            inherit_detail_weights(detail, shell, arm)
        shoes.append(join_footwear([shell, *parts[3:]], 'F02 anatomical slip-on'))
    obj = join_footwear(shoes, 'F02_slip_ons')
    add_soft_heel_tab_correctives(obj, arm, orange.name)
    return obj


if __name__ == '__main__':
    build_piece('F02', create_slip_ons, low_top_coverage,
                review_target_z=.12, review_ortho_scale=.62)
