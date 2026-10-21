"""Check saved bear rig/rigid attachments and solid-material glTF transport."""
import argparse
import json
from pathlib import Path
import struct
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'blender/catalog'))
from bear_companion_common import digest, write_json
from build_catalog_head_style_study import rig_signature

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--blend', type=Path, required=True)
parser.add_argument('--glb', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
arm = bpy.data.objects['Armature_Catalog']
inventory = json.loads(Path('assets/avatar/catalog-a/companions/bear-v1/source-inventory.json').read_text())
errors = []
if rig_signature(arm) != inventory['rig_sha256']:
    errors.append('Shared rest rig changed')
attachments = {}
for name, bone in [('Bear_head', 'Head'), ('Bear_neck', 'neck'), ('Bear_left_paw', 'LeftHand'), ('Bear_right_paw', 'RightHand')]:
    obj = bpy.data.objects[name]
    failures = []
    for vertex in obj.data.vertices:
        weights = {obj.vertex_groups[g.group].name: g.weight for g in vertex.groups if g.weight > 0}
        if weights != {bone: 1.0}:
            failures.append(vertex.index)
    attachments[name] = {'bone': bone, 'vertices': len(obj.data.vertices), 'invalid': failures[:10]}
    if failures:
        errors.append(f'Non-rigid attachment: {name}')
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any(mod.type == 'ARMATURE' and mod.use_deform_preserve_volume for mod in obj.modifiers):
        errors.append(f'Preserve Volume differs from glTF LBS: {obj.name}')
raw = args.glb.read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + length])
materials = []
for exported in gltf.get('materials', []):
    source = bpy.data.materials.get(exported['name'])
    if not source or not source.use_nodes:
        errors.append(f'Missing material {exported["name"]}')
        continue
    shader = source.node_tree.nodes.get('Principled BSDF')
    if not shader:
        errors.append(f'Unsupported material {source.name}')
        continue
    pbr = exported.get('pbrMetallicRoughness', {})
    reference = list(shader.inputs['Base Color'].default_value)
    color_error = max(abs(a - b) for a, b in zip(reference, pbr.get('baseColorFactor', [1, 1, 1, 1])))
    roughness_error = abs(shader.inputs['Roughness'].default_value - pbr.get('roughnessFactor', 1))
    metallic_error = abs(shader.inputs['Metallic'].default_value - pbr.get('metallicFactor', 1))
    if max(color_error, roughness_error, metallic_error) > 1e-6:
        errors.append(f'Material mismatch {source.name}')
    if any(node.type == 'TEX_IMAGE' and node.image for node in source.node_tree.nodes):
        errors.append(f'Textured material needs corner/image proof: {source.name}')
    materials.append({'name': source.name, 'base_color': reference, 'roughness': shader.inputs['Roughness'].default_value,
                      'color_error': color_error, 'roughness_error': roughness_error, 'metallic_error': metallic_error})
if gltf.get('images') or gltf.get('textures'):
    errors.append('Unexpected texture payload in geometric-face bear')
report = {'status': 'failed' if errors else 'passed', 'errors': errors, 'blend': str(args.blend), 'blend_sha256': digest(args.blend),
          'glb': str(args.glb), 'glb_sha256': digest(args.glb), 'verifier_sha256': digest(Path(__file__)),
          'rig_sha256': rig_signature(arm), 'attachments': attachments, 'materials': materials,
          'texture_scope': 'All used surfaces are solid Principled colors; existing UVs retained, no texture image transport to prove'}
write_json(args.report, report)
print(json.dumps({'status': report['status'], 'materials': len(materials), 'errors': errors}))
if errors:
    raise RuntimeError('Bear structure/material proof failed')
