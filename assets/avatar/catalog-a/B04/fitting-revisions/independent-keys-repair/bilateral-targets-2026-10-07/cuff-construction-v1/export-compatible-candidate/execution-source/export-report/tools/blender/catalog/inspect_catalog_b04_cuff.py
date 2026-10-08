"""Read-only geometry/bind inspection for one B04 rolled-cuff construction."""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh, setup_render
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot

SOURCE = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/B04.blend')
SOURCE_SHA = 'ec735203dc0379557fde1467abd75bd5dab9f59f47ceaf99cdd254c01fed5ea2'
SHELL = {'A ivory tapered trouser fabric', 'A ivory tapered trouser trim'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir', type=Path, required=True)
    a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert a.output_dir.resolve().is_relative_to(SOURCE.parent.resolve())
    assert not a.output_dir.exists(), 'Preserve previous evidence'
    assert digest(SOURCE) == SOURCE_SHA
    tools = local_dependencies(Path('tools/blender/catalog'), [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/f for f in ('blender_cli.py', 'blender_queue.py')))
    protected = {str(SOURCE): SOURCE_SHA}
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    before = normalized(signature())
    obj, arm, body = (bpy.data.objects[n] for n in ('B04_ivory_trousers', 'Armature_Catalog', 'body_underlayer_male'))
    reset(arm)
    shell_faces = [tuple(f.vertices) for f in obj.data.polygons if obj.data.materials[f.material_index].name in SHELL]
    shell_ids = {i for f in shell_faces for i in f}
    cuff = [v for v in obj.data.vertices if v.index in shell_ids and v.co.z < .205]
    keys = obj.data.shape_keys.key_blocks
    rows = [{'index': v.index, 'co': list(v.co), 'normal': list(v.normal),
             'skin': {obj.vertex_groups[w.group].name: w.weight for w in v.groups},
             'key_deltas': {k.name: list(k.data[v.index].co-keys['Basis'].data[v.index].co) for k in keys if k.name != 'Basis'}} for v in cuff]
    pts, faces = world_mesh(obj)
    masks = [(m, m.show_viewport, m.show_render) for m in body.modifiers if m.type == 'MASK']
    masked, mf = world_mesh(body)
    masked_pairs = len(BVHTree.FromPolygons(pts, faces).overlap(BVHTree.FromPolygons(masked, mf)))
    for m, _, _ in masks: m.show_viewport = False
    bpy.context.view_layer.update(); full, ff = world_mesh(body)
    full_pairs = BVHTree.FromPolygons(pts, faces).overlap(BVHTree.FromPolygons(full, ff))
    low_ids = {i for i, f in enumerate(faces) if min(pts[v].z for v in f) < .205}
    low_pairs = [pair for pair in full_pairs if pair[0] in low_ids]
    for m, viewport, render in masks: m.show_viewport = viewport; m.show_render = render
    bpy.context.view_layer.update()
    assert normalized(signature()) == before
    a.output_dir.mkdir(parents=True)
    camera = setup_render(); camera.data.ortho_scale = .33
    for view, location in [('front', (0, -3, .16)), ('back', (0, 3, .16)), ('side', (3, 0, .16))]:
        camera.location = location; camera.rotation_euler = (Vector((0, 0, .16))-camera.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.scene.render.filepath = str((a.output_dir/(view+'-review320.png')).resolve())
        bpy.ops.render.render(write_still=True)
    assert normalized(signature()) == before and digest(SOURCE) == SOURCE_SHA
    assert_snapshot(tools)
    report = {'scope': 'Read-only source/bind geometry; no construction or fitting acceptance.',
        'blender': bpy.app.version_string, 'source': str(SOURCE), 'source_sha256': SOURCE_SHA, 'source_unchanged': True,
        'tool_hashes': tools, 'protected_hashes': protected, 'invariant_groups': list(before),
        'cuff_region_upper_z_m': .205, 'cuff_vertex_count': len(cuff), 'cuff_vertices': rows,
        'material_face_counts': dict(Counter(obj.data.materials[f.material_index].name for f in obj.data.polygons)),
        'bone_heads': {n: list(arm.data.bones[n].head_local) for n in ('LeftLeg', 'LeftFoot', 'RightLeg', 'RightFoot')},
        'rest_contacts': {'masked_body': masked_pairs, 'full_body': len(full_pairs), 'full_body_cuff_region': len(low_pairs)},
        'body_masks': [m.name for m, _, _ in masks], 'review_width': 320}
    (a.output_dir/'inspection-report.json').write_text(json.dumps(report, indent=2)+'\n')
    print('B04_CUFF_INSPECTION', json.dumps({k: v for k, v in report.items() if k not in ('cuff_vertices', 'tool_hashes')}))


if __name__ == '__main__': main()
