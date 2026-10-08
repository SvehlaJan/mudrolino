"""Diagnostic: detail-to-shell and shell-to-shell intersections, one rule for every garment.

Splits a garment into connected components (shared vertices). A component holding at
least 15% of the faces is shell, anything smaller is a detail (pocket, seam tube,
button, loop, heel tab). Over rest and the quarter-frame walk/run sweep it counts
nonincident overlapping face pairs between a detail and a shell, and between shells.

This is a measurement, not a gate. On 2026-10-08 no passing garment cleared it:
B01 392 rest / 940 worst detail pairs, F01 2,164 / 2,374, T02 0 / 257. Most pairs
are deliberate construction, such as pocket backs sunk into the cloth thickness and
soles or collars overlapping the upper. The B04/F02 "detail-own-shell" blocks
(172 and 1,608 here) are therefore the same class as the passing pieces, not a
B04/F02 defect. Compare a candidate with its passing sibling, not with zero.

Usage: blender_cli.py audit_catalog_detail_shell.py --report OUT.json NAME:PIECE.blend:OBJECT ...
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh

SHELL_SHARE = .15


def components(faces, vertex_count):
    parent = list(range(vertex_count))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for face in faces:
        for v in face[1:]:
            a, b = find(face[0]), find(v)
            if a != b:
                parent[a] = b
    return [find(face[0]) for face in faces]


def audit(blend, garment):
    bpy.ops.wm.open_mainfile(filepath=str(Path(blend).resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    obj = bpy.data.objects[garment]
    reset(arm)
    faces = [tuple(f.vertices) for f in obj.data.polygons]
    comp = components(faces, len(obj.data.vertices))
    sizes = {}
    for c in comp:
        sizes[c] = sizes.get(c, 0) + 1
    shell = {c for c, n in sizes.items() if n >= SHELL_SHARE * len(faces)}
    sets = [set(f) for f in faces]
    materials = [obj.data.materials[p.material_index].name for p in obj.data.polygons]

    def count(points):
        tree = BVHTree.FromPolygons(points, faces)
        detail = shells = 0
        by_material = {}
        for a, b in tree.overlap(tree):
            if a >= b or sets[a] & sets[b] or comp[a] == comp[b]:
                continue
            a_shell, b_shell = comp[a] in shell, comp[b] in shell
            if a_shell and b_shell:
                shells += 1
            elif a_shell or b_shell:
                detail += 1
                name = materials[b if a_shell else a]
                by_material[name] = by_material.get(name, 0) + 1
        return detail, shells, by_material

    rows = [('rest', 0, *count(world_mesh(obj)[0]))]
    for motion in ('walk', 'run'):
        action = bpy.data.actions[motion]
        reset(arm)
        arm.animation_data.action = action
        arm.animation_data.action_slot = action.slots[0]
        start, end = action.frame_range
        for frame in sorted({round(start, 5), round(end, 5)} | {i / 4 for i in range(math.ceil(start * 4), math.floor(end * 4) + 1)}):
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
            bpy.context.view_layer.update()
            rows.append((motion, frame, *count(world_mesh(obj)[0])))
    reset(arm)
    worst = max(rows, key=lambda r: r[2])
    return {'blend': str(blend), 'blend_sha256': hashlib.sha256(Path(blend).read_bytes()).hexdigest(), 'garment': garment,
            'components': len(sizes), 'shell_components': len(shell), 'samples': len(rows),
            'rest_detail_shell_pairs': rows[0][2], 'max_detail_shell_pairs': worst[2], 'worst_pose': [worst[0], worst[1]],
            'worst_by_detail_material': worst[4], 'poses_with_detail_shell_pairs': sum(1 for r in rows if r[2]),
            'rest_shell_shell_pairs': rows[0][3], 'max_shell_shell_pairs': max(r[3] for r in rows)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('pieces', nargs='+', help='NAME:PIECE.blend:OBJECT')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    report = {'tool_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'shell_share': SHELL_SHARE,
              'scope': 'Diagnostic; not a gate. Compare with the passing sibling garment.', 'pieces': {}}
    for spec in args.pieces:
        name, blend, garment = spec.split(':')
        report['pieces'][name] = audit(blend, garment)
        print('DETAIL_SHELL', name, json.dumps({k: v for k, v in report['pieces'][name].items() if k not in ('blend', 'blend_sha256')}), flush=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
