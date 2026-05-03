"""Inspect avatar lower-foot and shoe bounds for fitting generated footwear."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    return parser.parse_args(argv)


def bounds_from_points(points: list[Vector]) -> tuple[Vector, Vector] | None:
    if not points:
        return None
    mins = Vector((float("inf"), float("inf"), float("inf")))
    maxs = Vector((float("-inf"), float("-inf"), float("-inf")))
    for point in points:
        mins.x = min(mins.x, point.x)
        mins.y = min(mins.y, point.y)
        mins.z = min(mins.z, point.z)
        maxs.x = max(maxs.x, point.x)
        maxs.y = max(maxs.y, point.y)
        maxs.z = max(maxs.z, point.z)
    return mins, maxs


def print_bounds(label: str, bounds: tuple[Vector, Vector] | None) -> None:
    if bounds is None:
        print(f"{label}: none")
        return
    mins, maxs = bounds
    size = maxs - mins
    print(
        f"{label}: min=({mins.x:.5f}, {mins.y:.5f}, {mins.z:.5f}) "
        f"max=({maxs.x:.5f}, {maxs.y:.5f}, {maxs.z:.5f}) "
        f"size=({size.x:.5f}, {size.y:.5f}, {size.z:.5f})"
    )


def main() -> None:
    args = parse_args()
    if not Path(args.input).exists():
        raise FileNotFoundError(args.input)

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.import_scene.gltf(filepath=args.input)
    bpy.context.view_layer.update()

    body = bpy.data.objects.get("body_underlayer_male")
    if body is None:
        raise RuntimeError("body_underlayer_male not found")

    left_foot: list[Vector] = []
    right_foot: list[Vector] = []
    for vertex in body.data.vertices:
        point = body.matrix_world @ vertex.co
        if point.z > 0.18:
            continue
        if point.x < 0:
            left_foot.append(point)
        else:
            right_foot.append(point)

    print_bounds("left foot z<=0.18", bounds_from_points(left_foot))
    print_bounds("right foot z<=0.18", bounds_from_points(right_foot))

    for name in ("shoes_blue_sneaker_left_Mesh_0", "shoes_blue_sneaker_right_Mesh_0"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            print_bounds(name, None)
            continue
        points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        print_bounds(name, bounds_from_points(points))


if __name__ == "__main__":
    main()
