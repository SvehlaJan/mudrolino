"""Report coverage holes a standard camera can see in an assembled outfit (rest pose).

Usage: blender_cli.py verify_catalog_coverage_visibility.py --blend OUTFIT.blend
  --body body_underlayer_male --garment T01:T01_crew_tee_outfit --garment B01:... --report OUT.json
  [--accept-contact T01]
Each --garment maps a coverage group (covered_<ID>) to its garment object. With
--accept-contact, visible faces of that piece are
reported separately instead of failing: faces cut by its contact_<ID> skin (skin that
touches the tee at rest or in the gait; user-accepted known defect, 2026-10-08).
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from catalog_coverage_visibility import visible_hidden_faces


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--body', required=True)
    parser.add_argument('--garment', action='append', required=True, help='ID:object')
    parser.add_argument('--accept-contact', help='Piece ID whose contact_<ID> skin cut edge is an accepted known defect')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    body = bpy.data.objects[args.body]
    garments = dict(item.split(':', 1) for item in args.garment)
    objects = {piece: bpy.data.objects[name] for piece, name in garments.items()}
    points = [body.matrix_world @ v.co for v in body.data.vertices]
    faces = [tuple(f.vertices) for f in body.data.polygons]
    covered = {}
    for piece in objects:
        group = body.vertex_groups['covered_' + piece]
        covered[piece] = {v.index for v in body.data.vertices if any(w.group == group.index and w.weight > .5 for w in v.groups)}
    trees = {piece: BVHTree.FromPolygons(*world_mesh(obj)) for piece, obj in objects.items()}
    exposed, removed = visible_hidden_faces(points, faces, set().union(*covered.values()), list(trees.values()))
    accepted = []
    if args.accept_contact:
        group = body.vertex_groups['contact_' + args.accept_contact]
        contact = {v.index for v in body.data.vertices if any(w.group == group.index and w.weight > .5 for w in v.groups)}
        accepted = [i for i in exposed if any(v in contact for v in faces[i])]
        exposed = [i for i in exposed if not any(v in contact for v in faces[i])]
    report = {'blend': str(args.blend), 'blend_sha256': hashlib.sha256(args.blend.read_bytes()).hexdigest(),
              'verifier_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'removed_faces': removed, 'visible_faces': len(exposed), 'sample': exposed[:12],
              'accepted_contact_faces': len(accepted), 'accepted_contact_piece': args.accept_contact,
              'cameras': '8 directions at 3 m, heights 0.9/1.2/1.5/2.2 m; rest pose',
              'status': 'passed' if not exposed else 'failed'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print('COVERAGE_VISIBILITY', json.dumps(report))
    if exposed:
        raise RuntimeError('Visible coverage holes; see report')


if __name__ == '__main__':
    main()
