"""Build an authored reference tee; save, export and review selected poses."""
import argparse
import json
import sys
from pathlib import Path
import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_tee_geometry import create_tee


def world_mesh(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    vertices = [obj.matrix_world @ v.co for v in mesh.vertices]
    faces = [tuple(p.vertices) for p in mesh.polygons]
    evaluated.to_mesh_clear()
    return vertices, faces


def bvh(obj):
    vertices, faces = world_mesh(obj)
    return BVHTree.FromPolygons(vertices, faces), vertices


def select(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def export(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    parent_records = []
    for obj in objects:
        obj.select_set(True)
        if obj.type == 'MESH':
            parent_records.append((obj, obj.parent, obj.matrix_world.copy()))
            obj.parent = None
            obj.matrix_world = parent_records[-1][2]
    bpy.context.view_layer.objects.active = objects[0]
    try:
        bpy.ops.outliner.orphans_purge(do_recursive=True)
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB",
            use_selection=True, export_animations=False, export_apply=False,
            export_texcoords=False)
    finally:
        for obj, parent, matrix in parent_records:
            obj.parent = parent
            obj.matrix_world = matrix


def reset(arm):
    arm.animation_data.action = None
    for bone in arm.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def setup_render():
    for obj in list(bpy.data.objects):
        if obj.type in {'LIGHT', 'CAMERA'}:
            bpy.data.objects.remove(obj, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.world.color = (.65, .65, .65)
    scene.view_settings.view_transform = "Standard"
    target = Vector((0, 0, 1.12))
    for location, energy, size in [((0, -3, 4), 180, 4), ((3, 1, 3), 100, 3)]:
        data = bpy.data.lights.new("QA softbox", "AREA")
        data.energy = energy
        data.size = size
        obj = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
    data = bpy.data.cameras.new("QA camera")
    camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera)
    data.type = "ORTHO"
    data.ortho_scale = 1.5
    scene.camera = camera
    return camera


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--foundation", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--review-dir", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.review_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.foundation))
    arm = bpy.data.objects["Armature_Catalog"]
    body = bpy.data.objects["body_underlayer_male"]
    reset(arm)
    # Styled foundations may contain independent head meshes. Include them in
    # the exported masked-body assembly rather than silently dropping the face.
    body_parts = [o for o in bpy.data.objects if o.type == 'MESH' and o != body]
    shirt = create_tee(arm, body)
    select(shirt)
    shader_material = bpy.data.materials.new("A cornflower blue matte")
    shader_material.use_nodes = True
    shader = shader_material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (.12, .285, .66, 1)
    shader.inputs["Roughness"].default_value = .85
    shader.inputs["Metallic"].default_value = 0
    shirt.data.materials.clear()
    shirt.data.materials.append(shader_material)
    trim = shader_material.copy()
    trim.name = 'A blue collar and hems'
    trim.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.09, .23, .58, 1)
    shirt.data.materials.append(trim)
    for polygon in shirt.data.polygons:
        polygon.use_smooth = True
        center = sum((shirt.data.vertices[i].co for i in polygon.vertices), Vector()) / len(polygon.vertices)
        is_trim = center.z > 1.411 or center.z < .944
        for prefix in ('Left', 'Right'):
            shoulder = arm.data.bones[prefix+'Arm'].head_local
            elbow = arm.data.bones[prefix+'ForeArm'].head_local
            axis = elbow - shoulder
            t = (center - shoulder).dot(axis) / axis.length_squared
            if abs(center.x) > .13 and center.z < 1.34 and .444 < t < .49:
                is_trim = True
        polygon.material_index = 1 if is_trim else 0
    # Exported skinning uses four influences. Enforce this on the master too,
    # so Blender and Three.js evaluate the same normalized weights.
    for vertex in shirt.data.vertices:
        weights = sorted([(w.group, w.weight) for w in vertex.groups], key=lambda w: w[1], reverse=True)[:4]
        total = sum(w for _, w in weights)
        assert total > 0, f'Unweighted shirt vertex {vertex.index}'
        for group in shirt.vertex_groups:
            group.remove([vertex.index])
        for index, weight in weights:
            shirt.vertex_groups[index].add([vertex.index], weight / total, 'REPLACE')
    skin = shirt.modifiers.new("Canonical skin", "ARMATURE")
    skin.object = arm
    shirt.parent = arm
    shirt.matrix_world = Matrix.Identity(4)
    garment_tree, garment_vertices = bvh(shirt)
    hem = min(v.z for v in garment_vertices)
    covered = body.vertex_groups.new(name="covered_T01")
    covered_indices = []
    for vertex in body.data.vertices:
        p = vertex.co
        point, normal, index, distance = garment_tree.find_nearest(p)
        if point is None or distance > .12 or p.z < hem + .008:
            continue
        # Keep the neck and cuffs conservatively visible. The garment's
        # silhouette and weight distribution determine the remaining coverage.
        if p.z >= 1.389:
            continue
        is_torso = abs(p.x) < .23 and p.z < 1.415
        is_sleeve = False
        for prefix in ("Left", "Right"):
            shoulder = arm.data.bones[prefix + "Arm"].head_local
            elbow = arm.data.bones[prefix + "ForeArm"].head_local
            axis = elbow - shoulder
            t = (p - shoulder).dot(axis) / axis.length_squared
            axis_point = shoulder + axis * t
            if -.20 <= t <= .39 and (p - axis_point).length < .13:
                is_sleeve = True
        if is_torso or is_sleeve:
            covered_indices.append(vertex.index)
    covered.add(covered_indices, 1, "REPLACE")
    mask = body.modifiers.new("Hide body beneath T01", "MASK")
    mask.vertex_group = covered.name
    mask.invert_vertex_group = True
    mask.threshold = .5
    # Export a real masked-body geometry candidate; the editable master keeps
    # a reversible modifier. Dynamic runtime slot masks remain a separate step.
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked_mesh = bpy.data.meshes.new_from_object(evaluated)
    masked_body = bpy.data.objects.new("body_underlayer_male_T01", masked_mesh)
    bpy.context.collection.objects.link(masked_body)
    assert [g.name for g in masked_body.vertex_groups] == [g.name for g in body.vertex_groups]
    masked_body.parent = arm
    masked_skin = masked_body.modifiers.new("Canonical skin", "ARMATURE")
    masked_skin.object = arm
    export(args.output_dir / "T01.glb", [arm, shirt])
    export(args.output_dir / "body-T01.glb", [arm, masked_body, *body_parts])
    bpy.data.objects.remove(masked_body, do_unlink=True)
    camera = setup_render()
    reset(arm)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output_dir / "T01.blend"))
    report = {"id": "T01", "stage": "candidate; visual/runtime acceptance pending",
              "source_geometry": "authored quad loft; catalog_tee_geometry.py", "vertices": len(shirt.data.vertices),
              "polygons": len(shirt.data.polygons), "masked_body_vertices": len(covered_indices),
              "bone_groups": [g.name for g in shirt.vertex_groups], "poses": []}
    for label, motion, frame, view in [("rest-front", None, 0, "front"),
        ("rest-side", None, 0, "side"), ("walk-13", "walk", 13, "front"),
        ("run-8", "run", 8, "front"), ("raised-arms", None, 0, "front")]:
        reset(arm)
        if motion:
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(frame)
        if label == "raised-arms":
            for name, angle in [("LeftArm", -1.05), ("RightArm", 1.05)]:
                bone = arm.pose.bones[name]
                rotation = bone.bone.matrix_local.to_quaternion()
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = rotation.inverted() @ Quaternion(Vector((0, 1, 0)), angle) @ rotation
        bpy.context.view_layer.update()
        body_tree, _ = bvh(body)
        shirt_tree, _ = bvh(shirt)
        overlaps = len(body_tree.overlap(shirt_tree))
        report["poses"].append({"pose": label, "body_garment_bvh_overlaps": overlaps})
        camera.location = (0, -3, 1.2) if view == "front" else (3, 0, 1.2)
        camera.rotation_euler = (Vector((0, 0, 1.12)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = str(args.review_dir / (label + "-review.png"))
        bpy.ops.render.render(write_still=True)
    (args.output_dir / "candidate-report.json").write_text(json.dumps(report, indent=2))
    print("T01_CANDIDATE", json.dumps(report))


if __name__ == "__main__":
    main()
