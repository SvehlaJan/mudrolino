"""Translate only diagnosed sewn details outward in a separate B04 study."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_catalog_b04_corrective_sides import REVISION, OBJECT, signature, normalized, digest
from build_catalog_t01 import export, reset
from b04_detail_translation_plan import plan_details


def translated_signature(before, moves):
    expected = normalized(before)
    mesh = expected['meshes'][OBJECT]
    for move in moves:
        for index in move['vertices']:
            for coordinates in [mesh['vertices'], *mesh['keys'].values()]:
                coordinates[index] = [value + delta for value, delta in zip(coordinates[index], move['offset_m'])]
    return expected


def compare(expected, after, moves):
    # Blender stores coordinates in float32; compare only coordinate arrays with
    # a 0.1 micrometre serialization allowance. All other fields remain exact.
    expected, after = normalized(expected), normalized(after)
    e, a = expected['meshes'][OBJECT], after['meshes'][OBJECT]
    moved = {index for move in moves for index in move['vertices']}
    maximum = 0
    for field in ['vertices', *e['keys']]:
        original = e['vertices'] if field == 'vertices' else e['keys'][field]
        current = a['vertices'] if field == 'vertices' else a['keys'][field]
        assert len(original) == len(current)
        assert all(p == q for index, (p, q) in enumerate(zip(original, current)) if index not in moved), 'An unchanged cloth/belt-loop coordinate differs'
        maximum = max(maximum, max(abs(x - y) for p, q in zip(original, current) for x, y in zip(p, q)))
        if field == 'vertices':
            a['vertices'] = original
        else:
            a['keys'][field] = original
    assert maximum < 1e-7, ('Unexpected detail coordinate change', maximum)
    assert expected == after, 'Topology, weights, cloth, bind, drivers or another invariant changed'
    return maximum


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=REVISION / 'detail-clearance-study')
    parser.add_argument('--front-offset', type=float, default=.0015)
    parser.add_argument('--pocket-offset', type=float, default=.0025)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert args.output_dir.resolve().is_relative_to((REVISION / 'detail-clearance-study').resolve())
    assert not any((args.output_dir / name).exists() for name in ('B04.blend', 'B04.glb', 'body-B04.glb', 'detail-repair-report.json')), 'Preserve the previous failed source; choose a separate revision path'
    source = REVISION / 'B04.blend'
    diagnosis = json.loads((REVISION / 'own-shell-diagnosis.json').read_text())
    side = json.loads((REVISION / 'repair-report.json').read_text())
    assert digest(source) == diagnosis['blend_sha256'] == side['blend_sha256']
    assert all(digest(Path(path)) == sha for path, sha in side['canonical_hashes'].items())
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    before = signature()
    obj = bpy.data.objects[OBJECT]
    moves = plan_details(diagnosis['components'], args.front_offset, args.pocket_offset)
    assert len(moves) == 6 and sum(len(move['vertices']) for move in moves) == 942
    for move in moves:
        offset = Vector(move['offset_m'])
        for index in move['vertices']:
            obj.data.vertices[index].co += offset
            for key in obj.data.shape_keys.key_blocks:
                key.data[index].co += offset
    expected = translated_signature(before, moves)
    serialization_error = compare(expected, signature(), moves)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / 'B04.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()))
    report = {'status': 'bounded detail-clearance study; fitting gates pending',
        'blender': bpy.app.version_string,
        'source': str(source), 'source_sha256': digest(source), 'blend': str(output), 'blend_sha256': digest(output),
        'diagnosis_sha256': digest(REVISION / 'own-shell-diagnosis.json'),
        'tool_hashes': {str(Path('tools/blender/catalog') / name): digest(Path('tools/blender/catalog') / name)
            for name in ('repair_catalog_b04_detail_clearance.py', 'diagnose_catalog_b04_own_shell.py',
                         'verify_catalog_b04_detail_preservation.py', 'b04_detail_translation_plan.py',
                         'b04_detail_components.py', 'repair_catalog_b04_corrective_sides.py')},
        'canonical_hashes': side['canonical_hashes'], 'moves': moves,
        'preserved_fields': list(before), 'max_coordinate_serialization_error_m': serialization_error,
        'scope': 'Uniform component translations applied identically to rest/Basis/both keys; no cloth, belt-loop, topology, weight, binding or driver change. Shape and morph deltas remain unchanged.'}
    (args.output_dir / 'detail-repair-report.json').write_text(json.dumps(report, indent=2) + '\n')
    arm, body = bpy.data.objects['Armature_Catalog'], bpy.data.objects['body_underlayer_male']
    reset(arm)
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj, body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('body_underlayer_male_B04', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export(args.output_dir / 'B04.glb', [arm, obj])
    export(args.output_dir / 'body-B04.glb', [arm, masked, *parts])
    assert digest(source) == report['source_sha256']
    assert all(digest(Path(path)) == sha for path, sha in side['canonical_hashes'].items())
    print('B04_DETAIL_CLEARANCE_STUDY', json.dumps({key: value for key, value in report.items() if key != 'moves'}))


if __name__ == '__main__':
    main()
