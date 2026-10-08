"""Build an isolated head-scale revision of a painted head; sources stay unchanged.

The user chose +30% heads on both bases (2026-10-07). Head (and separate hair)
meshes scale uniformly about the Head bone bind anchor, so the neck seam, UVs,
painted face, weights, rig, body and gaits are unchanged. Writes the scaled
.blend, the same GLB set as the source study, face fixtures, head landmarks and a
source-bound study report.

Run: python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py \
  tools/blender/catalog/build_catalog_head_scale_study.py --base male --scale 1.3 \
  --output-dir assets/avatar/catalog-a/H01/style-revisions/painted-face-scale-130
"""
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, setup_render
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_plan import scaled_point, head_landmarks, hair_hang_scale, shorten_rear_hair

ROOT = Path('assets/avatar/catalog-a')
BASES = {
    'male': {
        'head_id': 'H01',
        'source_dir': ROOT / 'H01/style-revisions/painted-face',
        'blend': 'H01.blend',
        'heads': ['H01_head'],
        'body': 'body_underlayer_male',
        'face_files': ['sample-face.png', 'canonical-face-layout.json'],
    },
    'female': {
        'head_id': 'H02',
        'source_dir': ROOT / 'female/foundation/studies/h02-envelope',
        'blend': 'female-foundation.blend',
        'heads': ['H02_head', 'H02_hair'],
        'body': 'body_underlayer_female',
        'face_files': ['sample-face.png', 'canonical-face-layout.json', 'canonical-face-mask.png'],
    },
}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def masked_body(body, arm):
    """Evaluated copy of the body with its garment coverage masks applied."""
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups] == [g.name for g in body.vertex_groups]
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    return masked


def render_reviews(output_dir, heads):
    camera = setup_render()
    scene = bpy.context.scene
    scene.display.shading.color_type = 'TEXTURE'
    centre = sum((h.matrix_world @ Vector(c) for h in heads for c in h.bound_box), Vector()) / (8 * len(heads))
    reviews = {}
    for label, offset, ortho, target in [
        ('front-full', (0, -4, 0), 2.3, Vector((0, 0, .98))),
        ('side-full', (-4, 0, 0), 2.3, Vector((0, 0, .98))),
        ('front-head', (0, -3, 0), .62, centre),
        ('side-head', (-3, 0, 0), .62, centre),
        ('three-quarter-head', (-2.1, -2.1, .15), .62, centre),
        ('back-head', (0, 3, 0), .62, centre),
    ]:
        camera.data.ortho_scale = ortho
        camera.location = target + Vector(offset)
        camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
        path = output_dir / f'{label}-review.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        reviews[label] = str(path)
    return reviews


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', choices=sorted(BASES), required=True)
    parser.add_argument('--scale', type=float, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--hair-taper', help='z_full,z_tip,tip_scale for separate hanging hair (see hair_hang_scale)')
    parser.add_argument('--rear-shorten', help='z_from,fraction,y_start,y_full: shorten rear locks below the scaled z_from (see shorten_rear_hair)')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    config = BASES[args.base]
    source = config['source_dir'] / config['blend']
    if args.output_dir.resolve() == config['source_dir'].resolve():
        raise ValueError('Write the scaled revision beside its source, never over it')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    source_hashes = {str(config['source_dir'] / name): digest(config['source_dir'] / name)
                     for name in [config['blend'], *config['face_files']]}

    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    heads = [bpy.data.objects[name] for name in config['heads']]
    pivot = tuple(arm.matrix_world @ arm.data.bones['Head'].head_local)
    unchanged = {obj.name: geometry_signature(obj) for obj in bpy.data.objects
                 if obj.type == 'MESH' and obj not in heads}
    rig_before, motion_before = rig_signature(arm), motion_signature()
    head_before = {h.name: geometry_signature(h) for h in heads}

    taper = dict(zip(('z_full', 'z_tip', 'tip_scale'), map(float, args.hair_taper.split(',')))) if args.hair_taper else None
    shorten = dict(zip(('z_from', 'fraction', 'y_start', 'y_full'), map(float, args.rear_shorten.split(',')))) if args.rear_shorten else None
    assert shorten is None or taper is not None, '--rear-shorten applies to tapered hanging hair'
    for head in heads:
        inverse = head.matrix_world.inverted()
        hanging = taper is not None and 'hair' in head.name.lower()
        for vertex in head.data.vertices:
            world = head.matrix_world @ vertex.co
            scale = hair_hang_scale(world.z, args.scale, **taper) if hanging else args.scale
            point = Vector(scaled_point(world, pivot, scale))
            if hanging and shorten:
                # z_from is an unscaled height; shorten below where it lands after the taper.
                z_from = scaled_point((0, 0, shorten['z_from']), pivot, hair_hang_scale(shorten['z_from'], args.scale, **taper))[2]
                point.z = shorten_rear_hair(point.z, point.y, z_from, shorten['fraction'], shorten['y_start'], shorten['y_full'])
            vertex.co = inverse @ point
        head.data.update()
    bpy.context.view_layer.update()

    assert rig_signature(arm) == rig_before, 'Head scale changed the rig'
    assert motion_signature() == motion_before, 'Head scale changed the gaits'
    assert all(geometry_signature(bpy.data.objects[name]) == sig for name, sig in unchanged.items()), \
        'Head scale changed a non-head mesh'

    for name in config['face_files']:
        shutil.copyfile(config['source_dir'] / name, args.output_dir / name)
    layout_path = args.output_dir / 'canonical-face-layout.json'
    layout = json.loads(layout_path.read_text())
    layout['head_scale'] = {'scale': args.scale, 'pivot_world_m': list(pivot),
                            'surface': 'pivot + scale * (surface - pivot); UVs and image unchanged'}
    layout_path.write_text(json.dumps(layout, indent=2) + '\n')
    landmarks = head_landmarks(config['head_id'], pivot, args.scale)
    (args.output_dir / 'head-landmarks.json').write_text(json.dumps(landmarks, indent=2) + '\n')

    blend_out = args.output_dir / config['blend']
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    body = bpy.data.objects[config['body']]
    if args.base == 'male':
        exports = {'H01.glb': [arm, *heads]}
        export_uv(args.output_dir / 'H01.glb', exports['H01.glb'])
        masked = masked_body(body, arm)
        garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
        assert len(garments) == 3, [o.name for o in garments]
        export_uv(args.output_dir / 'outfit.glb', [arm, masked, *heads, *garments])
        bpy.data.objects.remove(masked, do_unlink=True)
        names = ['H01.glb', 'outfit.glb']
    else:
        head, hair = heads
        for filename, objects in [('female-foundation.glb', [arm, body, head, hair]),
                                  ('H02.glb', [arm, head, hair]), ('hair-H02.glb', [arm, hair])]:
            export_uv(args.output_dir / filename, objects)
        names = ['female-foundation.glb', 'H02.glb', 'hair-H02.glb']
    reset(arm)
    reviews = render_reviews(args.output_dir, heads)

    report = {
        'stage': 'Isolated head-scale revision; fit, art and acceptance are separate gates',
        'decision': 'User chose +30% heads on both bases, 2026-10-07',
        'base': args.base, 'head_id': config['head_id'], 'scale': args.scale, 'pivot_world_m': list(pivot),
        'hair_taper': taper, 'rear_shorten': shorten,
        'source': str(source), 'source_hashes': source_hashes, 'builder_sha256': digest(__file__),
        'plan_sha256': digest(Path(__file__).with_name('catalog_headwear_plan.py')),
        'blender': bpy.app.version_string,
        'baseline': {'rig': rig_before, 'motion': motion_before, 'unchanged_geometry': unchanged,
                     'source_head_geometry': head_before},
        'scaled_head_geometry': {h.name: geometry_signature(h) for h in heads},
        'landmarks': landmarks,
        'blend': {str(blend_out): digest(blend_out)},
        'exports': {name: digest(args.output_dir / name) for name in names},
        'reviews': reviews,
    }
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEAD_SCALE_STUDY', json.dumps({k: report[k] for k in ('base', 'scale', 'pivot_world_m', 'exports')}))


if __name__ == '__main__':
    main()
