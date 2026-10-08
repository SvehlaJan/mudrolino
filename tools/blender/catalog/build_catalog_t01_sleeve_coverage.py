"""Coverage revision: short-sleeve tops (T01 by default, T03 with --id) or shorts thighs (--region thigh).

The canonical short-top coverage hides arm skin inside the sleeve and beside the torso,
leaving jagged cuts visible through the sleeve opening and below it. This revision
keeps the garment and every other canonical byte of geometry, rig and gait, and only
changes coverage: hidden arm skin that a standard camera can see is released
(catalog_coverage_visibility.release_visible with catalog_tee_underarm.arm_skin),
and released skin that touches the tee anywhere in the walk/run sweep is re-hidden.
Skin kept hidden because it touches the tee is recorded as `contact_<ID>`; its cut
edge is the known defect the user accepted (2026-10-08).

--region thigh (B03): the canonical shorts hide only the pelvis, so thigh skin under
the leg tube is live geometry that pokes through the cloth in the run. The thigh
above the hem opening is hidden first, then the same release/re-hide loop shows any
of it a camera can see, at rest and in every gait pose (the legs gape as they swing).
Both regions report posed holes; only the thigh releases by them.
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
from catalog_coverage_visibility import visible_hidden_faces, settle_coverage, gait_samples, release_posed, posed_visible_hidden_faces
from catalog_tee_underarm import arm_skin, dominant

HEM_MARGIN = .015  # Thigh skin this far above the shorts' hem ring is hidden before release.


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def visibility(body, shirt, hidden, contact=frozenset()):
    points = [body.matrix_world @ v.co for v in body.data.vertices]
    faces = [tuple(f.vertices) for f in body.data.polygons]
    exposed, removed = visible_hidden_faces(points, faces, hidden, [BVHTree.FromPolygons(*world_mesh(shirt))])
    accepted = [i for i in exposed if any(v in contact for v in faces[i])]
    return {'removed_faces': removed, 'visible_faces': len(exposed) - len(accepted), 'accepted_contact_faces': len(accepted)}


def thigh_under(body, garment, top):
    """Thigh/hip skin between the garment's hem ring (plus HEM_MARGIN) and `top`."""
    zs = [(garment.matrix_world @ v.co).z for v in garment.data.vertices]
    hem = max(z for z in zs if z < min(zs) + .02) + HEM_MARGIN
    thigh = {v.index for v in body.data.vertices if (dominant(body, v).endswith('UpLeg') or dominant(body, v) == 'Hips')
             and hem < (body.matrix_world @ v.co).z < top}
    return thigh, hem


def posed_holes(body, garment, arm, hidden, select, poses):
    rows, seen = posed_visible_hidden_faces(body, [garment], arm, hidden, poses, select=select)
    return [{k: r[k] for k in ('motion', 'frame', 'visible_faces')} for r in rows], seen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', default='T01', help='Piece ID')
    parser.add_argument('--region', choices=('arm', 'thigh'), default='arm', help='arm: short sleeves; thigh: shorts')
    parser.add_argument('--top', type=float, default=.835, help='thigh region: upper bound of the newly hidden skin (canonical pelvis mask starts here)')
    parser.add_argument('--garment', default='T01_crew_tee', help='Garment object in the piece master')
    parser.add_argument('--source', type=Path, help='Piece master; defaults to assets/avatar/catalog-a/<ID>/<ID>.blend')
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.source = args.source or Path(f'assets/avatar/catalog-a/{args.id}/{args.id}.blend')
    if args.output_dir.resolve() == args.source.parent.resolve():
        raise ValueError('Write the revision beside the canonical source, never over it')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    source_sha = digest(args.source)

    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    body = bpy.data.objects['body_underlayer_male']
    shirt = bpy.data.objects[args.garment]
    signatures = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    rig_before, motion_before = rig_signature(arm), motion_signature()

    group = body.vertex_groups['covered_' + args.id]
    canonical = {v.index for v in body.data.vertices if any(w.group == group.index and w.weight > .5 for w in v.groups)}
    before = visibility(body, shirt, canonical)
    faces = [tuple(f.vertices) for f in body.data.polygons]
    start, select, region, thigh = canonical, arm_skin(body, faces), {}, None
    if args.region == 'thigh':
        thigh, hem = thigh_under(body, shirt, args.top)
        start = canonical | thigh
        select = lambda index: any(v in thigh for v in faces[index])
        region = {'hem_plus_margin_z': hem, 'top_z': args.top, 'thigh_vertices': len(thigh - canonical)}
    # The male sleeve sits close to the arm, so only skin within 1.5 mm stays hidden up
    # front; released skin that touches the garment in the gait is re-hidden as contact.
    hidden, released, contact = settle_coverage(body, shirt, arm, start, select, gait_samples(), inside=.0015)
    posed_released = 0
    if args.region == 'thigh':
        # Shorts legs gape as the legs swing, so also release thigh skin visible in any gait
        # pose; the canonical pelvis is never released. Not used for sleeves: a loose sleeve
        # moves against the arm, so the same skin is visible in some poses and touches the
        # tee in others (2026-10-08 trial: contact 385 -> 1,308 vertices, rest holes 0 -> 26).
        hidden, contact, posed_released = release_posed(body, shirt, arm, hidden, contact, select, gait_samples(), removable=thigh)
    pose_holes, seen = posed_holes(body, shirt, arm, hidden, select, gait_samples())
    posed_contact_faces = sum(1 for i in seen if any(v in contact for v in faces[i]))
    group.remove(sorted(canonical - hidden))
    group.add(sorted(hidden - canonical), 1.0, 'REPLACE')
    body.vertex_groups.new(name='contact_' + args.id).add(sorted(contact), 1.0, 'REPLACE')
    after = visibility(body, shirt, hidden, contact)

    # Only the coverage group changed: garment, body geometry, rig and gaits are canonical.
    assert {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}.keys() == signatures.keys()
    assert geometry_signature(shirt) == signatures[shirt.name], 'Garment changed'
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before
    body_parts = [o for o in bpy.data.objects if o.type == 'MESH' and o not in (body, shirt)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('body_underlayer_male_' + args.id, bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.parent = arm
    masked.modifiers.new('Canonical skin', 'ARMATURE').object = arm
    export(args.output_dir / f'{args.id}.glb', [arm, shirt])
    export(args.output_dir / f'body-{args.id}.glb', [arm, masked, *body_parts])
    export(args.output_dir / 'outfit.glb', [arm, masked, *body_parts, shirt])  # Gallery preview of the piece on its body.
    bpy.data.objects.remove(masked, do_unlink=True)
    blend = args.output_dir / f'{args.id}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    report = {'stage': f'{args.id} coverage revision; garment unchanged; outfit gates required', 'id': args.id, 'region': args.region, 'region_detail': region, 'source': str(args.source),
              'source_sha256': source_sha, 'builder_sha256': digest(__file__),
              'helpers': {name: digest(Path(__file__).with_name(name)) for name in ('catalog_coverage_visibility.py', 'catalog_tee_underarm.py')},
              'covered_vertices': {'canonical': len(canonical), 'revision': len(hidden), 'released_arm_vertices': released, 'posed_released_vertices': posed_released, 'contact_vertices': len(contact)},
              'visibility': {'canonical': before, 'revision': after},
              'posed_visibility': {'poses': len(pose_holes), 'max_visible_faces': max((r['visible_faces'] for r in pose_holes), default=None),
                                   'visible_contact_faces': posed_contact_faces, 'samples': pose_holes},
              'blend': {str(blend): digest(blend)},
              'exports': {name: digest(args.output_dir / name) for name in (f'{args.id}.glb', f'body-{args.id}.glb', 'outfit.glb')}}
    (args.output_dir / 'revision-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('SLEEVE_COVERAGE', args.id, json.dumps({k: report[k] for k in ('region_detail', 'covered_vertices', 'visibility')}), json.dumps({k: v for k, v in report['posed_visibility'].items() if k != 'samples'}))


if __name__ == '__main__':
    main()
