"""Check saved repair coordinates, rig, gait, drivers and material invariants."""
import hashlib
import json
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path.cwd()/'tools/blender/catalog'))
from repair_catalog_f02_corrective_sides import mesh_state
revision = Path(__file__).resolve().parent.relative_to(Path.cwd())
report = json.loads((revision/'repair-report.json').read_text())

def curves(action):
    if hasattr(action, 'fcurves'):
        return list(action.fcurves)
    return [curve for layer in action.layers for strip in layer.strips for bag in strip.channelbags for curve in bag.fcurves]

def signature(path):
    bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    state = {'meshes': {obj.name: mesh_state(obj) for obj in bpy.data.objects if obj.type=='MESH'},
             'rig': {bone.name: {'matrix': [list(row) for row in bone.matrix_local], 'parent': bone.parent.name if bone.parent else None, 'deform': bone.use_deform} for bone in arm.data.bones},
             'gait': {name: [{'path': curve.data_path, 'index': curve.array_index, 'points': [{'co':list(point.co), 'left':list(point.handle_left), 'right':list(point.handle_right), 'interpolation':point.interpolation} for point in curve.keyframe_points]} for curve in curves(bpy.data.actions[name])] for name in ['walk','run']},
             'materials': {material.name: {'diffuse':list(material.diffuse_color), 'roughness':material.roughness, 'metallic':material.metallic, 'nodes': {node.name: {'type':node.bl_idname, 'inputs': {socket.name: list(socket.default_value) if hasattr(socket.default_value,'__len__') and not isinstance(socket.default_value,str) else socket.default_value for socket in node.inputs if hasattr(socket,'default_value') and (isinstance(socket.default_value,(int,float,bool,str)) or hasattr(socket.default_value,'__len__'))}} for node in material.node_tree.nodes} if material.node_tree else {}} for material in bpy.data.materials if material.users},
             'drivers': {obj.name: [{'path':curve.data_path, 'expression':curve.driver.expression, 'variables': [{'name':variable.name, 'type':variable.type, 'targets': [{'id':target.id.name if target.id else None, 'bone':target.bone_target, 'path':target.data_path, 'space':target.transform_space, 'transform':target.transform_type} for target in variable.targets]} for variable in curve.driver.variables]} for curve in obj.data.shape_keys.animation_data.drivers] for obj in bpy.data.objects if obj.type=='MESH' and obj.data.shape_keys and obj.data.shape_keys.animation_data}}
    return json.loads(json.dumps(state))

before = signature(Path(report['source']))
expected = json.loads(json.dumps(before))
for change in report['changed_vertices']:
    expected['meshes']['F02_slip_ons']['keys']['knee_clearance_Right'][change['index']] = change['after']
after = signature(revision/'F02.blend')
checks = {name: expected[name] == after[name] for name in expected}
assert all(checks.values()), checks
result = {'status':'passed', 'source':report['source'], 'source_sha256':report['source_sha256'], 'blend':str(revision/'F02.blend'), 'blend_sha256':hashlib.sha256((revision/'F02.blend').read_bytes()).hexdigest(), 'changed_coordinates':len(report['changed_vertices']), 'checks':checks, 'gait_curves':{name:len(before['gait'][name]) for name in before['gait']}}
(revision/'preservation-report.json').write_text(json.dumps(result,indent=2)+'\n')
print('F02_PRESERVATION',json.dumps(result))
