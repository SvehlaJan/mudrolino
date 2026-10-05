"""Verify a texture-ready head's UV/image transport through its GLB export.

Checks the embedded face image against the study's source PNG, TEXCOORD_0 on every
face primitive, reciprocal rest-position + face-corner UV identity after reimport,
and that a UV permutation which keeps the UV multiset is rejected. Candidate evidence only.
"""
import argparse, hashlib, json, sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset
from verify_catalog_female_foundation_study import digest, read_glb, uv_corner_rows, uv_corner_identity


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--glb', type=Path, required=True)
    parser.add_argument('--head', default='H01_head')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    failures = []
    def check(condition, label, details=None):
        if not condition: failures.append({'check': label, 'details': details})
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    arm = bpy.data.objects['Armature_Catalog']; head = bpy.data.objects[args.head]; reset(arm)
    model, binary = read_glb(args.glb)
    material_index = next(i for i, mat in enumerate(model['materials']) if mat['name'] == 'face_surface')
    texture_index = model['materials'][material_index]['pbrMetallicRoughness']['baseColorTexture']['index']
    image = model['images'][model['textures'][texture_index]['source']]
    view = model['bufferViews'][image['bufferView']]; offset = view.get('byteOffset', 0)
    image_hash = hashlib.sha256(binary[offset:offset + view['byteLength']]).hexdigest()
    source_png = args.blend.parent / 'sample-face.png'
    check(image_hash == digest(source_png), 'embedded_face_image_preserved', {'embedded_sha256': image_hash, 'mime': image['mimeType']})
    face_primitives = [p for mesh in model['meshes'] for p in mesh['primitives'] if p.get('material') == material_index]
    check(bool(face_primitives) and all('TEXCOORD_0' in p['attributes'] for p in face_primitives), 'face_TEXCOORD_0_preserved')
    check(not any('COLOR_0' in p['attributes'] for mesh in model['meshes'] for p in mesh['primitives']), 'no_COLOR_0_tint')
    source_corners = uv_corner_rows(head, head.data.uv_layers['canonical_face_uv'])
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    rig = next(obj for obj in imported if obj.type == 'ARMATURE'); rig.animation_data_create(); reset(rig)
    copy = next(obj for obj in imported if obj.type == 'MESH' and obj.name.startswith(args.head))
    bpy.context.view_layer.update()
    layer = copy.data.uv_layers.active
    imported_corners = uv_corner_rows(copy, layer)
    identity = uv_corner_identity(source_corners, imported_corners)
    check(identity['passed'], 'canonical_uv_corner_identity_preserved', identity)
    first = next(i for i, (_, uv) in enumerate(imported_corners) if uv.length > .1)
    second = next(i for i, (position, uv) in enumerate(imported_corners)
                  if (position - imported_corners[first][0]).length > .05 and (uv - imported_corners[first][1]).length > .1)
    first_uv = layer.data[first].uv.copy(); second_uv = layer.data[second].uv.copy()
    try:
        layer.data[first].uv = second_uv; layer.data[second].uv = first_uv
        permuted = uv_corner_rows(copy, layer)
        negative = uv_corner_identity(source_corners, permuted)
        unchanged = sorted(tuple(uv) for _, uv in permuted) == sorted(tuple(uv) for _, uv in imported_corners)
        check(unchanged and not negative['passed'], 'negative_uv_permutation_rejected', negative)
    finally:
        layer.data[first].uv = first_uv; layer.data[second].uv = second_uv
    restored = uv_corner_identity(source_corners, uv_corner_rows(copy, layer))
    check(restored['passed'], 'negative_uv_probe_restored', restored)
    report = {'blend': str(args.blend), 'blend_sha256': digest(args.blend), 'glb': str(args.glb), 'glb_sha256': digest(args.glb),
              'verifier_sha256': digest(__file__), 'face_image_sha256': digest(source_png), 'embedded_sha256': image_hash,
              'face_primitive_count': len(face_primitives), 'reimport_uv_corner_identity': identity,
              'negative_uv_permutation_probe': {'rejected': not negative['passed'], 'uv_multiset_unchanged': unchanged, 'restored_passed': restored['passed']},
              'failures': failures, 'status': 'failed' if failures else 'passed',
              'contract_limit': 'Fictional painted default face; no real selfie or identity proof.'}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print('HEAD_TEXTURE_TRANSPORT', json.dumps({k: v for k, v in report.items() if k != 'reimport_uv_corner_identity'}))
    if failures: sys.exit(1)


if __name__ == '__main__': main()
