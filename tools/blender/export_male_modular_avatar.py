"""Build and export the MVP male modular avatar GLB.

This imports a rigged Meshy underlayer, splits the head from the body, creates
two skinned top-slot shells by cropping duplicated body meshes, adds a face
anchor plane, and exports the required runtime object contract.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


REQUIRED_OBJECTS = [
    "Armature",
    "body_underlayer_male",
    "head",
    "face_anchor",
    "top_blue_tshirt",
    "top_green_hoodie",
]


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--working-blend", type=Path)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def make_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = 0.82
    material.diffuse_color = color
    return material


def find_body_mesh() -> bpy.types.Object:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in meshes:
        if obj.name.startswith("char"):
            return obj
    if len(meshes) == 1:
        return meshes[0]
    raise RuntimeError(f"Could not identify body mesh from {[obj.name for obj in meshes]}")


def duplicate_mesh(source: bpy.types.Object, name: str, material: bpy.types.Material) -> bpy.types.Object:
    duplicate = source.copy()
    duplicate.data = source.data.copy()
    duplicate.name = name
    duplicate.data.name = f"{name}_mesh"
    duplicate.data.materials.clear()
    duplicate.data.materials.append(material)
    bpy.context.collection.objects.link(duplicate)
    return duplicate


def normalized_bounds(obj: bpy.types.Object) -> tuple[float, float]:
    y_values = [vertex.co.y for vertex in obj.data.vertices]
    return min(y_values), max(y_values)


def crop_mesh(
    obj: bpy.types.Object,
    source_min_y: float,
    source_max_y: float,
    *,
    min_y: float,
    max_y: float,
    min_abs_x: float | None = None,
) -> None:
    height = source_max_y - source_min_y
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    def keep_vertex(vertex: bmesh.types.BMVert) -> bool:
        normalized_y = (vertex.co.y - source_min_y) / height if height else 0
        if normalized_y < min_y or normalized_y > max_y:
            return False
        if min_abs_x is not None and abs(vertex.co.x) < min_abs_x:
            return False
        return True

    faces_to_delete = [face for face in bm.faces if not all(keep_vertex(vertex) for vertex in face.verts)]
    bmesh.ops.delete(bm, geom=faces_to_delete, context="FACES")
    loose_verts = [vertex for vertex in bm.verts if not vertex.link_faces]
    bmesh.ops.delete(bm, geom=loose_verts, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def create_face_anchor(
    body: bpy.types.Object,
    material: bpy.types.Material,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new("face_anchor_mesh")
    # Meshy imports this character with large local coordinates plus tiny object
    # transforms. The exported GLB coordinate space is small, so keep this patch
    # explicitly tiny and forward of the head for later decal work.
    mesh.from_pydata(
        [
            (-0.00065, 0.0137, -0.00165),
            (0.00065, 0.0137, -0.00165),
            (0.00065, 0.0152, -0.00165),
            (-0.00065, 0.0152, -0.00165),
        ],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new("face_anchor", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def remove_unwanted_objects(keep: set[str]) -> None:
    for obj in list(bpy.context.scene.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)


def validate_scene() -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    for name in REQUIRED_OBJECTS:
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError(f"Missing required object: {name}")
        objects.append(obj)

    if bpy.data.objects["Armature"].type != "ARMATURE":
        raise RuntimeError("Armature object must have type ARMATURE")

    for name in REQUIRED_OBJECTS[1:]:
        if bpy.data.objects[name].type != "MESH":
            raise RuntimeError(f"{name} must be a mesh")

    return objects


def export_glb(output: Path, objects: list[bpy.types.Object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["Armature"]
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
    )


def main() -> None:
    args = parse_args()
    clear_scene()
    import_glb(args.input)

    armature = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
    if armature is None:
        raise RuntimeError("Imported GLB has no armature")
    armature.name = "Armature"

    source_body = find_body_mesh()
    source_body.name = "source_body_for_slots"
    source_min_y, source_max_y = normalized_bounds(source_body)

    skin = make_material("skin_tone_underlayer", (0.82, 0.58, 0.39, 1.0))
    face = make_material("placeholder_face_anchor", (0.93, 0.74, 0.58, 1.0))
    blue = make_material("top_blue_tshirt_material", (0.10, 0.42, 0.86, 1.0))
    green = make_material("top_green_hoodie_material", (0.12, 0.52, 0.32, 1.0))

    body = duplicate_mesh(source_body, "body_underlayer_male", skin)
    crop_mesh(body, source_min_y, source_max_y, min_y=0.0, max_y=0.79)

    head = duplicate_mesh(source_body, "head", skin)
    crop_mesh(head, source_min_y, source_max_y, min_y=0.75, max_y=1.0)

    tshirt = duplicate_mesh(source_body, "top_blue_tshirt", blue)
    crop_mesh(tshirt, source_min_y, source_max_y, min_y=0.39, max_y=0.73)

    hoodie = duplicate_mesh(source_body, "top_green_hoodie", green)
    crop_mesh(hoodie, source_min_y, source_max_y, min_y=0.36, max_y=0.76)

    create_face_anchor(source_body, face)
    remove_unwanted_objects(set(REQUIRED_OBJECTS))

    objects = validate_scene()
    if args.working_blend:
        args.working_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(args.working_blend))
    export_glb(args.output, objects)
    print(f"Exported male modular avatar: {args.output}")


if __name__ == "__main__":
    main()
