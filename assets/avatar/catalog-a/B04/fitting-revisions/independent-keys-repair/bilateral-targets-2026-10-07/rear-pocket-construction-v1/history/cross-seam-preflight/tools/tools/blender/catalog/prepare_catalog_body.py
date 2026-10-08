"""Build a metre-scale canonical rest rig from the accepted uncompressed source.

The new edit-bone matrices preserve the source's rest orientation, without its
0.01 object scale or importer-generated bone lengths. Mesh positions and weights
are preserved in world coordinates. This is a fitting foundation, not final art.
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def action_curves(action):
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag = strip.channelbag(slot)
                if bag:
                    yield from bag.fcurves


def clean_motion(path, target, name):
    before = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [o for o in bpy.data.objects if o not in before]
    source = next(o for o in imported if o.type == "ARMATURE")
    action = source.animation_data.action
    output = bpy.data.actions.new(name)
    target.animation_data_create()
    target.animation_data.action = output
    for curve in action_curves(action):
        if not curve.data_path.endswith("rotation_quaternion"):
            continue
        dest = output.fcurve_ensure_for_datablock(
            target, curve.data_path, index=curve.array_index)
        dest.keyframe_points.add(len(curve.keyframe_points) - len(dest.keyframe_points))
        for a, b in zip(dest.keyframe_points, curve.keyframe_points):
            a.co = b.co
            a.interpolation = "LINEAR"
        dest.update()
    target.animation_data.action_slot = output.slots[0]
    output.use_fake_user = True
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        if action not in before_actions and action != output:
            bpy.data.actions.remove(action)
    return output


def export(path, objects, animated=False):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_animations=animated, export_animation_mode="ACTIVE_ACTIONS",
        export_force_sampling=False, export_nla_strips=False,
        export_bake_animation=False, export_apply=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--walk", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(args.source))
    source_arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    source_mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("char"))
    bpy.context.view_layer.update()
    records = []
    for bone in source_arm.data.bones:
        world = source_arm.matrix_world @ bone.matrix_local
        rotation = world.to_3x3().normalized().to_4x4()
        rotation.translation = world.translation
        child_lengths = [(source_arm.matrix_world @ child.head_local - world.translation).length
                         for child in bone.children]
        length = min((v for v in child_lengths if v > .005), default=.05)
        records.append((bone.name, bone.parent.name if bone.parent else None, rotation, length))
    reference_positions = [source_mesh.matrix_world @ v.co for v in source_mesh.data.vertices]
    mesh = source_mesh.data.copy()
    mesh.transform(source_mesh.matrix_world)
    body = bpy.data.objects.new("body_underlayer_male", mesh)
    bpy.context.collection.objects.link(body)
    # Blender 5.1 carries the group definitions and deform weights with
    # Mesh.copy(); adding them again creates unused *.001 duplicate groups.
    assert [g.name for g in body.vertex_groups] == [g.name for g in source_mesh.vertex_groups]
    data = bpy.data.armatures.new("CatalogRig")
    arm = bpy.data.objects.new("Armature_Catalog", data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, parent, matrix, length in records:
        bone = data.edit_bones.new(name)
        bone.head = matrix.translation
        bone.tail = bone.head + matrix.col[1].to_3d().normalized() * length
        bone.matrix = matrix
        bone.length = length
    for name, parent, matrix, length in records:
        if parent:
            data.edit_bones[name].parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    modifier = body.modifiers.new("Canonical skin", "ARMATURE")
    modifier.object = arm
    body.parent = arm
    body.matrix_world = Matrix.Identity(4)
    material = bpy.data.materials.new("Catalog warm skin")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (.68, .36, .20, 1)
    shader.inputs["Roughness"].default_value = .82
    body.data.materials.clear()
    body.data.materials.append(material)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    for obj in list(bpy.data.objects):
        if obj not in {arm, body}:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    evaluated = body.evaluated_get(dg)
    evaluated_mesh = evaluated.to_mesh()
    delta = max((body.matrix_world @ v.co - reference_positions[v.index]).length
                for v in evaluated_mesh.vertices)
    evaluated.to_mesh_clear()
    assert delta < .0001, f"Normalization changed rest mesh by {delta}m"
    assert len(arm.data.bones) == 24
    assert all(abs(v - 1) < 1e-7 for v in arm.scale)
    export(args.output_dir / "canonical-body.glb", [arm, body])
    actions = {}
    for name, path in [("walk", args.walk), ("run", args.run)]:
        action = clean_motion(path, arm, name)
        actions[name] = action
        bpy.context.scene.frame_set(int(action.frame_range[0]))
        export(args.output_dir / f"canonical-body-{name}.glb", [arm, body], True)
    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = 25
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output_dir / "canonical-body.blend"))
    report = {"source": str(args.source), "stage": "canonical fitting foundation; final character art pending",
              "bones": len(arm.data.bones), "vertex_groups": len(body.vertex_groups), "vertices": len(body.data.vertices),
              "normalization_max_rest_delta_m": delta,
              "object_scales": {o.name: list(o.scale) for o in [arm, body]},
              "motions": {n: {"frames": list(a.frame_range), "curves": len(list(action_curves(a)))}
                          for n, a in actions.items()}}
    (args.output_dir / "foundation-report.json").write_text(json.dumps(report, indent=2))
    print("CATALOG_FOUNDATION", json.dumps(report))


if __name__ == "__main__":
    main()
