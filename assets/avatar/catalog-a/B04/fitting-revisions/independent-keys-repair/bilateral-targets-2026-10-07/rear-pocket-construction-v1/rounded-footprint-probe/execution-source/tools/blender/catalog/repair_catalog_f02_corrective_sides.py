"""Repair only inherited opposite-side F02 Right-key coordinates in an isolated study."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import export, reset

SOURCE_SHA256 = 'a0a4998aea312b2eb9c5ee14d6bc7fd121bb670e80b780f049a34d810a6fa7d7'
TOLERANCE = 1e-7


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mesh_state(obj):
    mesh = obj.data
    return {
        'vertices': [list(v.co) for v in mesh.vertices],
        'weights': [[(w.group, w.weight) for w in v.groups] for v in mesh.vertices],
        'groups': [g.name for g in obj.vertex_groups],
        'edges': [list(edge.vertices) for edge in mesh.edges],
        'faces': [(list(face.vertices), face.material_index) for face in mesh.polygons],
        'materials': [material.name if material else None for material in mesh.materials],
        'matrix': [list(row) for row in obj.matrix_world],
        'modifiers': [(m.name, m.type) for m in obj.modifiers],
        'keys': {key.name: [list(v.co) for v in key.data] for key in mesh.shape_keys.key_blocks} if mesh.shape_keys else {},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('assets/avatar/catalog-a/F02/F02.blend'))
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--review-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    allowed = Path('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair').resolve()
    assert args.output_dir.resolve().is_relative_to(allowed), 'Keep the repair inside the isolated revision'
    assert args.source.resolve() != (args.output_dir / 'F02.blend').resolve()
    assert digest(args.source) == SOURCE_SHA256, 'Re-audit a changed canonical source before repairing'
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.review_dir.mkdir(parents=True, exist_ok=True)
    protected = [args.source, args.source.with_suffix('.glb'), args.source.with_name('body-F02.glb')]
    hashes = {str(path): digest(path) for path in protected}
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    obj = bpy.data.objects['F02_slip_ons']
    before = {mesh.name: mesh_state(mesh) for mesh in bpy.data.objects if mesh.type == 'MESH'}
    keys = obj.data.shape_keys.key_blocks
    basis, left, right = keys['Basis'], keys['knee_clearance_Left'], keys['knee_clearance_Right']
    changed = []
    for index, point in enumerate(basis.data):
        delta = right.data[index].co - point.co
        if point.co.x > .04 and delta.length > TOLERANCE:
            inherited = left.data[index].co - point.co
            assert (delta - inherited).length <= TOLERANCE, ('Unexpected Right-key delta', index)
            changed.append({'index': index, 'before': list(right.data[index].co), 'after': list(point.co), 'removed_delta_m': delta.length})
    assert len(changed) == 12, ('Expected the audited twelve inherited coordinates', len(changed))
    intended = [index for index, point in enumerate(basis.data) if point.co.x < -.04 and (right.data[index].co - point.co).length > TOLERANCE]
    assert len(intended) == 12
    for change in changed:
        right.data[change['index']].co = basis.data[change['index']].co
    expected = json.loads(json.dumps(before))
    for change in changed:
        expected[obj.name]['keys']['knee_clearance_Right'][change['index']] = change['after']
    after = {mesh.name: mesh_state(mesh) for mesh in bpy.data.objects if mesh.type == 'MESH'}
    assert json.dumps(after, sort_keys=True) == json.dumps(expected, sort_keys=True), 'A field outside the audited Right coordinates changed'
    assert all((right.data[i].co - basis.data[i].co).length <= TOLERANCE for i, point in enumerate(basis.data) if point.co.x > .04)
    arm = bpy.data.objects['Armature_Catalog']
    body = bpy.data.objects['body_underlayer_male']
    reset(arm)
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj, body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    masked = bpy.data.objects.new('body_underlayer_male_F02', mesh)
    bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups] == [g.name for g in body.vertex_groups]
    skin = masked.modifiers.new('Shared body skin', 'ARMATURE')
    skin.object = arm
    masked.parent = arm
    export(args.output_dir / 'F02.glb', [arm, obj])
    export(args.output_dir / 'body-F02.glb', [arm, masked, *parts])
    bpy.data.objects.remove(masked, do_unlink=True)
    reset(arm)
    source = args.output_dir / 'F02.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()))
    assert all(digest(Path(path)) == sha for path, sha in hashes.items()), 'Canonical assets changed'
    report = {
        'status': 'side-only isolated repair; fitting and acceptance pending',
        'blender': bpy.app.version_string,
        'source': str(args.source), 'source_sha256': SOURCE_SHA256,
        'blend': str(source), 'blend_sha256': digest(source),
        'canonical_hashes': hashes, 'changed_key': right.name,
        'changed_vertices': changed, 'intended_right_vertices_preserved': intended,
        'preserved_mesh_fields': list(before[obj.name]),
        'tolerance_m': TOLERANCE,
        'max_removed_opposite_delta_m': max(change['removed_delta_m'] for change in changed),
    }
    (args.output_dir / 'repair-report.json').write_text(json.dumps(report, indent=2) + '\n')
    camera = bpy.context.scene.camera
    bpy.context.scene.render.resolution_x = 320
    bpy.context.scene.render.resolution_y = 320
    bpy.context.scene.render.resolution_percentage = 100
    camera.data.ortho_scale = .62
    for label, motion, frame, position in [('rest-front', None, 0, (0, -3, .20)), ('rest-back', None, 0, (0, 3, .20)), ('rest-side', None, 0, (3, 0, .20)), ('right-deep-kick', 'run', 7.25, (0, 3, .20)), ('left-deep-kick', 'run', 15.25, (0, 3, .20))]:
        reset(arm)
        if motion:
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(int(frame), subframe=frame-int(frame))
        bpy.context.view_layer.update()
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, .12)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.scene.render.filepath = str((args.review_dir / (label + '-review.png')).resolve())
        bpy.ops.render.render(write_still=True)
    print('F02_REPAIR', json.dumps(report))


if __name__ == '__main__':
    main()
