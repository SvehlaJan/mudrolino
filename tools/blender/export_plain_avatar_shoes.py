"""Export a plain avatar base and a first shoe-pair garment GLB.

This is intentionally asset-prep code, not runtime code. It removes current
top-slot meshes from the modular avatar and converts the Meshy single-shoe
output into a simple left/right pair positioned near the male base feet.
"""

from __future__ import annotations

import argparse
import sys
from math import pi
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--shoe", required=True)
    parser.add_argument("--plain-output", required=True)
    parser.add_argument("--shoes-output", required=True)
    parser.add_argument("--combined-output")
    return parser.parse_args(argv)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    purge_orphans()


def purge_orphans() -> None:
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def import_glb(path: str) -> None:
    bpy.ops.import_scene.gltf(filepath=path)


def export_glb(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    purge_orphans()
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_animations=False,
    )


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    mins = Vector((float("inf"), float("inf"), float("inf")))
    maxs = Vector((float("-inf"), float("-inf"), float("-inf")))

    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            mins.x = min(mins.x, world.x)
            mins.y = min(mins.y, world.y)
            mins.z = min(mins.z, world.z)
            maxs.x = max(maxs.x, world.x)
            maxs.y = max(maxs.y, world.y)
            maxs.z = max(maxs.z, world.z)

    return mins, maxs


def export_plain_base(base_path: str, output_path: str) -> None:
    clear_scene()
    import_glb(base_path)

    for obj in list(bpy.data.objects):
        if obj.name.startswith("top_"):
            bpy.data.objects.remove(obj, do_unlink=True)

    export_glb(output_path)


def prepare_shoe_source(shoe_path: str, clear_existing: bool = True) -> list[bpy.types.Object]:
    if clear_existing:
        clear_scene()
    before = set(bpy.context.scene.objects)
    import_glb(shoe_path)
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    shoe_meshes = [obj for obj in imported if obj.type == "MESH"]
    if not shoe_meshes:
        raise RuntimeError("No shoe meshes found in source GLB")

    root = bpy.data.objects.new("shoe_blue_sneaker_source", None)
    bpy.context.collection.objects.link(root)
    for obj in shoe_meshes:
        obj.parent = root

    mins, maxs = mesh_bounds(shoe_meshes)
    center = (mins + maxs) * 0.5
    length = maxs.x - mins.x
    target_length = 0.26
    scale = target_length / length if length > 0 else 1

    root.location = Vector((-center.x, -center.y, -mins.z))
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()

    for obj in shoe_meshes:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world.identity()
    bpy.context.view_layer.update()

    shoe_forward_rotation = Matrix.Rotation(pi / 2, 4, "Z")
    for obj in shoe_meshes:
        obj.data.transform(shoe_forward_rotation)
        obj.data.transform(Matrix.Diagonal((1.4, 1.08, 1.45, 1.0)))
    bpy.context.view_layer.update()

    post_mins, _ = mesh_bounds(shoe_meshes)
    for obj in shoe_meshes:
        obj.data.transform(Matrix.Translation((0, 0, -post_mins.z)))
    bpy.context.view_layer.update()

    return shoe_meshes


def duplicate_shoe_pair(shoe_meshes: list[bpy.types.Object]) -> None:
    left_collection = bpy.data.collections.new("shoes_blue_sneakers")
    bpy.context.scene.collection.children.link(left_collection)

    foot_y = -0.002
    foot_z = 0.0
    foot_gap = 0.158

    for side, x, mirror in (
        ("left", -foot_gap, False),
        ("right", foot_gap, True),
    ):
        parent = bpy.data.objects.new(f"shoes_blue_sneaker_{side}", None)
        left_collection.objects.link(parent)
        parent.location = (x, foot_y, foot_z)
        parent.rotation_euler = (0, 0, 0)
        parent.scale = (-1, 1, 1) if mirror else (1, 1, 1)

        for source in shoe_meshes:
            mesh = source.data.copy()
            obj = bpy.data.objects.new(f"{parent.name}_{source.name}", mesh)
            obj.matrix_world = source.matrix_world.copy()
            obj.parent = parent
            for material in source.data.materials:
                obj.data.materials.append(material)
            left_collection.objects.link(obj)


def export_shoe_pair(shoe_path: str, output_path: str) -> None:
    shoe_meshes = prepare_shoe_source(shoe_path)
    duplicate_shoe_pair(shoe_meshes)

    for obj in list(bpy.context.scene.objects):
        if obj.name == "shoe_blue_sneaker_source" or obj.parent and obj.parent.name == "shoe_blue_sneaker_source":
            bpy.data.objects.remove(obj, do_unlink=True)

    export_glb(output_path)


def export_combined_plain_with_shoes(plain_base_path: str, shoes_path: str, output_path: str) -> None:
    clear_scene()
    import_glb(plain_base_path)
    import_glb(shoes_path)
    export_glb(output_path)


def main() -> None:
    args = parse_args()
    export_plain_base(args.base, args.plain_output)
    export_shoe_pair(args.shoe, args.shoes_output)
    if args.combined_output:
        export_combined_plain_with_shoes(args.plain_output, args.shoes_output, args.combined_output)
    print(f"Exported plain base: {args.plain_output}")
    print(f"Exported shoes: {args.shoes_output}")
    if args.combined_output:
        print(f"Exported combined preview: {args.combined_output}")


if __name__ == "__main__":
    main()
