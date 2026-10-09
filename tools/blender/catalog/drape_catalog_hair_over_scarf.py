"""Wear a hair variant with the A06 scarf: swap it into a scarf outfit and drape it over.

The scarf outfit (build_catalog_a06.py) already holds the base hair with its own
over_A06 key. This replaces that hair with a hair-variant object from its study
(build_catalog_hair_variant.py) and gives the variant its own over_A06 key with the
same rule (build_catalog_a06.drape_hair): hair inside the scarf's swept tube, in the
Head rest frame over every gait pose and gesture, rises onto the tube's top. Body,
garments, scarf, rig and gaits stay exact. Run the outfit motion/head/export gates.

Usage: blender_cli.py drape_catalog_hair_over_scarf.py --outfit-blend A06/.../female/outfit.blend
  --hair-blend H03/fitting-revisions/selfie-head-v1/female/H03.blend --hair H03_hair --output-dir DIR
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from build_catalog_a06 import ANGLES, BAND, TUBE, drape_hair
from catalog_headwear_geometry import render_reviews

SCARF = 'A06_loop_scarf_outfit'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit-blend', type=Path, required=True)
    parser.add_argument('--hair-blend', type=Path, required=True)
    parser.add_argument('--hair', required=True, help='Variant hair object, e.g. H03_hair')
    parser.add_argument('--base-hair', default='H02_hair', help='Hair object the variant replaces')
    parser.add_argument('--drop', default='', help='Comma-separated objects fitted to the base hair to leave out (A02_folded_beanie)')
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    scarf_report = json.loads((args.outfit_blend.parent / 'study-report.json').read_text())

    bpy.ops.wm.open_mainfile(filepath=str(args.outfit_blend.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig, motion = rig_signature(arm), motion_signature()
    # The base hair and anything fitted to it (a beanie's under-hat key) leave together;
    # headwear is fitted per hair in its own study.
    for name in [args.base_hair, *filter(None, args.drop.split(','))]:
        obj = bpy.data.objects[name]
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    with bpy.data.libraries.load(str(args.hair_blend.resolve()), link=False) as (source, data):
        if args.hair not in source.objects:
            raise RuntimeError(f'{args.hair} not in {args.hair_blend}')
        data.objects = [args.hair]
    hair = data.objects[0]
    bpy.context.collection.objects.link(hair)
    for modifier in hair.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = arm
    hair.parent = arm
    bpy.context.view_layer.update()
    drape = drape_hair(hair, bpy.data.objects[SCARF], arm, ANGLES,
                       max(TUBE['radius_horizontal'], TUBE['radius_vertical']) + BAND['extra'],
                       Vector(scarf_report['neck_centre']))
    assert rig_signature(arm) == rig and motion_signature() == motion, 'Rig or gaits changed'
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Outfit geometry changed'

    args.output_dir.mkdir(parents=True, exist_ok=True)
    blend_out = args.output_dir / 'outfit.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    body = next(o for o in bpy.data.objects if o.name.startswith('body_underlayer_'))
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    others = [o for o in bpy.data.objects if o.type == 'MESH' and o not in (body, masked)]
    export_uv(args.output_dir / 'outfit.glb', [arm, masked, *others])
    bpy.data.objects.remove(masked, do_unlink=True)
    reset(arm)
    reviews = render_reviews(args.output_dir, Vector(scarf_report['neck_centre']) + Vector((0, 0, .12)))
    report = {'stage': 'Hair variant draped over the A06 scarf; outfit motion/head/export gates required. Art review pending.',
              'outfit_source': str(args.outfit_blend), 'outfit_source_sha256': digest(args.outfit_blend),
              'hair_source': str(args.hair_blend), 'hair_source_sha256': digest(args.hair_blend), 'hair': args.hair,
              'replaced_hair': args.base_hair, 'dropped': list(filter(None, args.drop.split(','))), 'builder_sha256': digest(__file__),
              'drape_builder_sha256': digest(Path(__file__).with_name('build_catalog_a06.py')), 'hair_over': drape,
              'blend': {str(blend_out): digest(blend_out)}, 'exports': {'outfit.glb': digest(args.output_dir / 'outfit.glb')},
              'reviews': reviews}
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HAIR_DRAPED', json.dumps(drape))


if __name__ == '__main__':
    main()
