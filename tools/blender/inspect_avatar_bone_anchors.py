"""Inspect rest-pose bone anchor positions for avatar fitting work."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Vector


TARGET_BONES = ("LeftFoot", "LeftToeBase", "RightFoot", "RightToeBase")


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--body", default="body_underlayer_male")
    return parser.parse_args(argv)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    mins = Vector((float("inf"), float("inf"), float("inf")))
    maxs = Vector((float("-inf"), float("-inf"), float("-inf")))

    for vertex in obj.data.vertices:
        world = obj.matrix_world @ vertex.co
        mins.x = min(mins.x, world.x)
        mins.y = min(mins.y, world.y)
        mins.z = min(mins.z, world.z)
        maxs.x = max(maxs.x, world.x)
        maxs.y = max(maxs.y, world.y)
        maxs.z = max(maxs.z, world.z)

    return mins, maxs


def weighted_bounds(obj: bpy.types.Object, group_names: set[str]) -> tuple[Vector, Vector, int]:
    group_indexes = {group.index for group in obj.vertex_groups if group.name in group_names}
    mins = Vector((float("inf"), float("inf"), float("inf")))
    maxs = Vector((float("-inf"), float("-inf"), float("-inf")))
    count = 0

    for vertex in obj.data.vertices:
        if not any(group.group in group_indexes and group.weight > 0.01 for group in vertex.groups):
            continue
        world = obj.matrix_world @ vertex.co
        mins.x = min(mins.x, world.x)
        mins.y = min(mins.y, world.y)
        mins.z = min(mins.z, world.z)
        maxs.x = max(maxs.x, world.x)
        maxs.y = max(maxs.y, world.y)
        maxs.z = max(maxs.z, world.z)
        count += 1

    return mins, maxs, count


def print_vec(label: str, value: Vector) -> None:
    print(f"{label}=({value.x:.5f}, {value.y:.5f}, {value.z:.5f})")


def main() -> None:
    args = parse_args()
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(args.input))

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {len(armatures)}")
    armature = armatures[0]

    print(f"GLB: {args.input}")
    print(f"Armature: {armature.name}")
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()

    for bone_name in TARGET_BONES:
        bone = armature.data.bones[bone_name]
        head = armature.matrix_world @ bone.head_local
        tail = armature.matrix_world @ bone.tail_local
        center = (head + tail) * 0.5
        print(f"{bone_name}:")
        print_vec("  head", head)
        print_vec("  tail", tail)
        print_vec("  center", center)

    body = bpy.data.objects.get(args.body)
    if body is None:
        return

    body_mins, body_maxs = world_bounds(body)
    print("Body bounds:")
    print_vec("  min", body_mins)
    print_vec("  max", body_maxs)

    for side, groups in (
        ("left foot weights", {"LeftFoot", "LeftToeBase"}),
        ("right foot weights", {"RightFoot", "RightToeBase"}),
    ):
        mins, maxs, count = weighted_bounds(body, groups)
        center = (mins + maxs) * 0.5
        print(f"{side}: count={count}")
        print_vec("  min", mins)
        print_vec("  max", maxs)
        print_vec("  center", center)


if __name__ == "__main__":
    main()
