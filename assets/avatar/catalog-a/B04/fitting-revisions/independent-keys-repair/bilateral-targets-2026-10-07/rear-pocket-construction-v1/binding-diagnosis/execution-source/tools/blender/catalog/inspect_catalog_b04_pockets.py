"""Read the actual saved rear-patch layers before a bounded construction change."""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b04_detail_components import components
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import digest
from build_catalog_t01 import reset, setup_render

SOURCE = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/cuff-construction-v1/export-compatible-candidate/B04.blend')
SOURCE_SHA = '291d4927ef628ff300a7e3c3ed950776bc32944de6273f5d2fa915b9f7ace42d'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert not args.output_dir.exists(), 'Preserve earlier inspections'
    assert args.output_dir.resolve().is_relative_to(SOURCE.parent.parent.parent.resolve())
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar') / name for name in ('blender_cli.py', 'blender_queue.py')))
    assert digest(SOURCE) == SOURCE_SHA
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj = bpy.data.objects['B04_ivory_trousers']
    reset(bpy.data.objects['Armature_Catalog'])
    obj.data.update()
    parts = components(len(obj.data.vertices), [tuple(e.vertices) for e in obj.data.edges])
    patches = []
    for indices in parts:
        if len(indices) != 242:
            continue
        ids = set(indices)
        faces = [p for p in obj.data.polygons if set(p.vertices) <= ids]
        assert {obj.data.materials[p.material_index].name for p in faces} == {'A ivory tapered trouser pockets and seams'}
        patches.append({
            'side': 'Left' if min(obj.data.vertices[i].co.x for i in indices) > 0 else 'Right',
            'vertices': [{'index': i, 'point': list(obj.data.vertices[i].co), 'normal': list(obj.data.vertices[i].normal),
                'weights': {obj.vertex_groups[w.group].name: w.weight for w in obj.data.vertices[i].groups},
                'keys': {k.name: list(k.data[i].co) for k in obj.data.shape_keys.key_blocks}} for i in indices],
            'faces': [{'index': p.index, 'vertices': list(p.vertices), 'normal': list(p.normal)} for p in faces],
            'edges': [list(e.vertices) for e in obj.data.edges if set(e.vertices) <= ids],
        })
    assert len(patches) == 2
    args.output_dir.mkdir(parents=True)
    camera = setup_render()
    camera.data.ortho_scale = .38
    camera.location = (0, 3, .9)
    camera.rotation_euler = (Vector((0, 0, .9)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = str((args.output_dir / 'current-back-review320.png').resolve())
    bpy.ops.render.render(write_still=True)
    assert_snapshot(tools)
    assert digest(SOURCE) == SOURCE_SHA
    report = {'status': 'read-only inspection', 'source': str(SOURCE), 'source_sha256': SOURCE_SHA,
        'source_unchanged': True, 'tool_hashes': tools, 'patches': patches,
        'vertex_count': len(obj.data.vertices), 'review_width': 320,
        'scope': 'Saved patch topology, actual coordinates, skin and key values; no fitting claim or source save.'}
    (args.output_dir / 'pocket-inspection.json').write_text(json.dumps(report, indent=2) + '\n')
    print('B04_POCKET_INSPECTION', json.dumps({'source_sha256': SOURCE_SHA, 'patches': len(patches),
        'bounds': {p['side']: [[min(v['point'][a] for v in p['vertices']), max(v['point'][a] for v in p['vertices'])] for a in range(3)] for p in patches}}))


if __name__ == '__main__':
    main()
