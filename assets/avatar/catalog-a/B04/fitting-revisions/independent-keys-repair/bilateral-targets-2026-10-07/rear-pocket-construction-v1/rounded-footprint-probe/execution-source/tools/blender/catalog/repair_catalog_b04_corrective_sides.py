"""Reset exactly the audited inherited Left deltas in an isolated B04 Right key."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b04_corrective_repair_plan import plan_repair
from repair_catalog_f02_corrective_sides import mesh_state
from prepare_catalog_body import action_curves
from build_catalog_t01 import export, reset

SOURCE_SHA256 = 'e4e14adf9e8da333b0c02e4d4690e56d38e63884de10676864646ba574983624'
REVISION = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair')
OBJECT = 'B04_ivory_trousers'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def properties(value):
    """Preserve active modifier/constraint settings and referenced datablock names."""
    result = {}
    for prop in value.bl_rna.properties:
        if (prop.identifier == 'rna_type' or prop.type == 'COLLECTION'
                or (prop.is_readonly and prop.identifier not in ('name', 'type'))):
            continue
        item = getattr(value, prop.identifier)
        if prop.type == 'POINTER':
            result[prop.identifier] = item.name if item and hasattr(item, 'name') else None
        elif getattr(prop, 'is_array', False):
            result[prop.identifier] = list(item)
        elif isinstance(item, (bool, int, float, str)):
            result[prop.identifier] = item
    return result


def signature():
    arm = bpy.data.objects['Armature_Catalog']
    return {
        'meshes': {obj.name: mesh_state(obj) for obj in bpy.data.objects if obj.type == 'MESH'},
        'mesh_surface': {obj.name: {
            'smooth_faces': [face.use_smooth for face in obj.data.polygons],
            'loops': [(loop.vertex_index, loop.edge_index) for loop in obj.data.loops],
            'uv_layers': {layer.name: [list(point.uv) for point in layer.data]
                          for layer in obj.data.uv_layers},
        } for obj in bpy.data.objects if obj.type == 'MESH'},
        'binding': {obj.name: {
            'parent': obj.parent.name if obj.parent else None,
            'parent_type': obj.parent_type, 'parent_bone': obj.parent_bone,
            'parent_inverse': [list(row) for row in obj.matrix_parent_inverse],
            'modifiers': [properties(modifier) for modifier in obj.modifiers],
            'constraints': [properties(constraint) for constraint in obj.constraints],
        } for obj in bpy.data.objects if obj.type in ('MESH', 'ARMATURE')},
        'rig': {bone.name: {'matrix': [list(row) for row in bone.matrix_local],
            'parent': bone.parent.name if bone.parent else None, 'deform': bone.use_deform,
            'inherit_scale': bone.inherit_scale} for bone in arm.data.bones},
        'gait': {name: [{'path': curve.data_path, 'index': curve.array_index,
            'points': [{'co': list(point.co), 'left': list(point.handle_left),
                'right': list(point.handle_right), 'interpolation': point.interpolation,
                'left_type': point.handle_left_type, 'right_type': point.handle_right_type}
                for point in curve.keyframe_points]} for curve in action_curves(bpy.data.actions[name])]
                for name in ('walk', 'run')},
        'shape_settings': {obj.name: {key.name: {
            'relative_key': key.relative_key.name, 'slider_min': key.slider_min,
            'slider_max': key.slider_max, 'mute': key.mute, 'vertex_group': key.vertex_group,
            'interpolation': key.interpolation} for key in obj.data.shape_keys.key_blocks}
            for obj in bpy.data.objects if obj.type == 'MESH' and obj.data.shape_keys},
        'drivers': {obj.name: [{'path': curve.data_path, 'index': curve.array_index,
            'mute': curve.mute, 'type': curve.driver.type,
            'expression': curve.driver.expression, 'use_self': curve.driver.use_self,
            'variables': [{'name': variable.name, 'type': variable.type,
                'targets': [properties(target) for target in variable.targets]}
                for variable in curve.driver.variables]} for curve in obj.data.shape_keys.animation_data.drivers]
            for obj in bpy.data.objects if obj.type == 'MESH' and obj.data.shape_keys
                and obj.data.shape_keys.animation_data},
        'materials': {material.name: {'diffuse': list(material.diffuse_color),
            'roughness': material.roughness, 'metallic': material.metallic,
            'nodes': {node.name: {'type': node.bl_idname,
                'inputs': {socket.name: list(socket.default_value)
                    if hasattr(socket.default_value, '__len__') and not isinstance(socket.default_value, str)
                    else socket.default_value for socket in node.inputs
                    if hasattr(socket, 'default_value') and (isinstance(socket.default_value, (int, float, bool, str))
                    or hasattr(socket.default_value, '__len__'))}} for node in material.node_tree.nodes}
                    if material.node_tree else {}} for material in bpy.data.materials if material.users},
    }


def normalized(state):
    return json.loads(json.dumps(state))


def corrected_signature(before, changes):
    expected = normalized(before)
    for change in changes:
        expected['meshes'][OBJECT]['keys']['knee_clearance_Right'][change['index']] = change['after']
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('assets/avatar/catalog-a/B04/B04.blend'))
    parser.add_argument('--output-dir', type=Path, default=REVISION)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert args.output_dir.resolve().is_relative_to(REVISION.resolve()), 'Use the isolated B04 revision'
    assert args.source.resolve() != (args.output_dir / 'B04.blend').resolve()
    assert digest(args.source) == SOURCE_SHA256, 'Re-audit a changed canonical B04 before repair'
    protected = [args.source, args.source.with_suffix('.glb'), args.source.with_name('body-B04.glb')]
    hashes = {str(path): digest(path) for path in protected}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    before = normalized(signature())
    obj = bpy.data.objects[OBJECT]
    keys = obj.data.shape_keys.key_blocks
    plan = plan_repair(*[[list(point.co) for point in keys[name].data]
                        for name in ('Basis', 'knee_clearance_Left', 'knee_clearance_Right')])
    for change in plan['changes']:
        keys['knee_clearance_Right'].data[change['index']].co = change['after']
    # Edit the existing block to preserve its driver and settings. No mixed key is created.
    assert normalized(signature()) == corrected_signature(before, plan['changes']), 'Unexpected source field changed'
    source = args.output_dir / 'B04.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()))
    report = {'status': 'isolated side repair; dependent fitting and acceptance pending',
        'tool_hashes': {str(Path('tools/blender/catalog') / name): digest(Path('tools/blender/catalog') / name)
            for name in ('repair_catalog_b04_corrective_sides.py', 'verify_catalog_b04_repair_preservation.py',
                         'b04_corrective_repair_plan.py', 'repair_catalog_f02_corrective_sides.py')},
        'blender': bpy.app.version_string, 'source': str(args.source), 'source_sha256': SOURCE_SHA256,
        'blend': str(source), 'blend_sha256': digest(source), 'canonical_hashes': hashes,
        'changed_key': 'knee_clearance_Right', 'changed_vertices': plan['changes'],
        'intended_right_vertices_preserved': plan['intended'], 'tolerance_m': 1e-7,
        'max_removed_opposite_delta_m': plan['max_removed_opposite_delta_m'],
        'preserved_fields': list(before)}
    (args.output_dir / 'repair-report.json').write_text(json.dumps(report, indent=2) + '\n')
    arm, body = bpy.data.objects['Armature_Catalog'], bpy.data.objects['body_underlayer_male']
    reset(arm)
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj, body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    masked = bpy.data.objects.new('body_underlayer_male_B04', mesh)
    bpy.context.collection.objects.link(masked)
    assert [group.name for group in masked.vertex_groups] == [group.name for group in body.vertex_groups]
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export(args.output_dir / 'B04.glb', [arm, obj])
    export(args.output_dir / 'body-B04.glb', [arm, masked, *parts])
    assert all(digest(Path(path)) == sha for path, sha in hashes.items()), 'Canonical B04 assets changed'
    print('B04_REPAIR', json.dumps({key: value for key, value in report.items()
        if key not in ('changed_vertices', 'intended_right_vertices_preserved')}))


if __name__ == '__main__':
    main()
