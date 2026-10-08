"""T01 revision: unhide the arm skin a camera can see around the sleeve.

The canonical T01 coverage hides arm skin inside the sleeve and beside the torso,
leaving jagged cuts visible through the sleeve opening and below it. This revision
keeps the garment and every other canonical byte of geometry, rig and gait, and only
changes coverage: hidden arm skin that a standard camera can see is released
(catalog_coverage_visibility.release_visible with catalog_tee_underarm.arm_skin),
and released skin that touches the tee anywhere in the walk/run sweep is re-hidden.
Skin kept hidden because it touches the tee is recorded as `contact_T01`; its cut
edge is the known defect the user accepted (2026-10-08).
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, export, world_mesh
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from catalog_coverage_visibility import visible_hidden_faces, settle_coverage, gait_samples
from catalog_tee_underarm import arm_skin


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def visibility(body, shirt, hidden, contact=frozenset()):
    points = [body.matrix_world @ v.co for v in body.data.vertices]
    faces = [tuple(f.vertices) for f in body.data.polygons]
    exposed, removed = visible_hidden_faces(points, faces, hidden, [BVHTree.FromPolygons(*world_mesh(shirt))])
    accepted = [i for i in exposed if any(v in contact for v in faces[i])]
    return {'removed_faces': removed, 'visible_faces': len(exposed) - len(accepted), 'accepted_contact_faces': len(accepted)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('assets/avatar/catalog-a/T01/T01.blend'))
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.output_dir.resolve() == args.source.parent.resolve():
        raise ValueError('Write the revision beside the canonical source, never over it')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    source_sha = digest(args.source)

    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    body = bpy.data.objects['body_underlayer_male']
    shirt = bpy.data.objects['T01_crew_tee']
    signatures = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    rig_before, motion_before = rig_signature(arm), motion_signature()

    group = body.vertex_groups['covered_T01']
    canonical = {v.index for v in body.data.vertices if any(w.group == group.index and w.weight > .5 for w in v.groups)}
    before = visibility(body, shirt, canonical)
    # The male sleeve sits close to the arm, so only skin within 1.5 mm stays hidden up
    # front; released skin that touches the tee in the gait is re-hidden as contact.
    faces = [tuple(f.vertices) for f in body.data.polygons]
    hidden, released, contact = settle_coverage(body, shirt, arm, canonical, arm_skin(body, faces), gait_samples(), inside=.0015)
    group.remove(sorted(canonical - hidden))
    body.vertex_groups.new(name='contact_T01').add(sorted(contact), 1.0, 'REPLACE')
    after = visibility(body, shirt, hidden, contact)

    # Only the coverage group changed: garment, body geometry, rig and gaits are canonical.
    assert {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}.keys() == signatures.keys()
    assert geometry_signature(shirt) == signatures[shirt.name], 'Garment changed'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before
    body_parts = [o for o in bpy.data.objects if o.type == 'MESH' and o not in (body, shirt)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('body_underlayer_male_T01', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.parent = arm
    masked.modifiers.new('Canonical skin', 'ARMATURE').object = arm
    export(args.output_dir / 'T01.glb', [arm, shirt])
    export(args.output_dir / 'body-T01.glb', [arm, masked, *body_parts])
    export(args.output_dir / 'outfit.glb', [arm, masked, *body_parts, shirt])  # Gallery preview of the piece on its body.
    bpy.data.objects.remove(masked, do_unlink=True)
    blend = args.output_dir / 'T01.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    report = {'stage': 'T01 coverage revision; garment unchanged; outfit gates required', 'source': str(args.source),
              'source_sha256': source_sha, 'builder_sha256': digest(__file__),
              'helpers': {name: digest(Path(__file__).with_name(name)) for name in ('catalog_coverage_visibility.py', 'catalog_tee_underarm.py')},
              'covered_vertices': {'canonical': len(canonical), 'revision': len(hidden), 'released_arm_vertices': released, 'contact_vertices': len(contact)},
              'visibility': {'canonical': before, 'revision': after},
              'blend': {str(blend): digest(blend)},
              'exports': {name: digest(args.output_dir / name) for name in ('T01.glb', 'body-T01.glb', 'outfit.glb')}}
    (args.output_dir / 'revision-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('T01_SLEEVE_COVERAGE', json.dumps({k: report[k] for k in ('covered_vertices', 'visibility')}))


if __name__ == '__main__':
    main()
