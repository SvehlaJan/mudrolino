"""Add fitted headwear (A01/A02) from its head-envelope study to an assembled outfit.

The headwear study and the outfit share the same head study, so the headwear object
copies across unchanged (rigid Head binding) and its under_<ID> hair key copies by vertex
index onto the outfit's hair, applied at 1. Body, garments, rig and gaits are unchanged.
Then run the outfit motion/export gates on the result.

Usage: blender_cli.py attach_catalog_headwear.py --outfit-blend OUTFIT.blend
  --headwear-blend A01/fitting-revisions/head-envelope-v1/male/A01.blend --object A01_baseball_cap
  --hair H01_head --key under_A01 --output-dir DIR
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit-blend', type=Path, required=True)
    parser.add_argument('--headwear-blend', type=Path, required=True)
    parser.add_argument('--object', required=True)
    parser.add_argument('--hair', required=True, help='Hair mesh carrying the under-hat key (H01_head or H02_hair)')
    parser.add_argument('--key', required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])

    # Read the key coordinates from the headwear study first.
    bpy.ops.wm.open_mainfile(filepath=str(args.headwear_blend.resolve()))
    study_hair = bpy.data.objects[args.hair]
    key_coords = [tuple(d.co) for d in study_hair.data.shape_keys.key_blocks[args.key].data]
    basis = [tuple(v.co) for v in study_hair.data.vertices]

    bpy.ops.wm.open_mainfile(filepath=str(args.outfit_blend.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig, motion = rig_signature(arm), motion_signature()
    hair = bpy.data.objects[args.hair]
    if len(hair.data.vertices) != len(key_coords):
        raise RuntimeError('Hair topology differs between the headwear study and the outfit')
    drift = max(max(abs(a - b) for a, b in zip(v.co, c)) for v, c in zip(hair.data.vertices, basis))
    if drift > 1e-6:
        raise RuntimeError(f'Hair rest positions differ from the headwear study by {drift} m')
    meshes = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}

    with bpy.data.libraries.load(str(args.headwear_blend.resolve()), link=False) as (source, data):
        if args.object not in source.objects:
            raise RuntimeError(f'{args.object} not in {args.headwear_blend}')
        data.objects = [args.object]
    item = data.objects[0]
    bpy.context.collection.objects.link(item)
    for modifier in item.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = arm
    item.parent = arm
    if not hair.data.shape_keys:
        hair.shape_key_add(name='Basis', from_mix=False)
    key = hair.shape_key_add(name=args.key, from_mix=False)
    for target, co in zip(key.data, key_coords):
        target.co = co
    key.value = 1.0
    assert rig_signature(arm) == rig and motion_signature() == motion, 'Rig or gaits changed'
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in meshes.items()), 'Outfit geometry changed'

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
    report = {'stage': 'Headwear added to an assembled outfit; outfit gates required.',
              'outfit_source': str(args.outfit_blend), 'outfit_source_sha256': digest(args.outfit_blend),
              'headwear_source': str(args.headwear_blend), 'headwear_source_sha256': digest(args.headwear_blend),
              'object': args.object, 'hair': args.hair, 'key': args.key, 'builder_sha256': digest(__file__),
              'blend': {str(blend_out): digest(blend_out)}, 'exports': {'outfit.glb': digest(args.output_dir / 'outfit.glb')}}
    (args.output_dir / 'headwear-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEADWEAR_ATTACHED', json.dumps({k: report[k] for k in ('object', 'key')}))


if __name__ == '__main__':
    main()
