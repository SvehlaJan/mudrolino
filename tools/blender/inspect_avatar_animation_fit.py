"""Inspect animated foot and shoe bounds at selected frames."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--frames", nargs="+", type=int, default=[1, 13, 25])
    return parser.parse_args(argv)


def evaluated_bounds(obj: bpy.types.Object, depsgraph: bpy.types.Depsgraph) -> tuple[Vector, Vector]:
    evaluated = obj.evaluated_get(depsgraph)
    corners = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    mins = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    maxs = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return mins, maxs


def print_bounds(label: str, obj: bpy.types.Object, depsgraph: bpy.types.Depsgraph) -> None:
    mins, maxs = evaluated_bounds(obj, depsgraph)
    size = maxs - mins
    center = (mins + maxs) * 0.5
    print(
        f"{label}: center=({center.x:.4f}, {center.y:.4f}, {center.z:.4f}) "
        f"size=({size.x:.4f}, {size.y:.4f}, {size.z:.4f})"
    )


def main() -> None:
    args = parse_args()
    if not Path(args.input).exists():
        raise FileNotFoundError(args.input)

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=args.input)

    names = [
        "body_underlayer_male",
        "shoes_blue_sneaker_left_Mesh_0",
        "shoes_blue_sneaker_right_Mesh_0",
    ]
    objects = {name: bpy.data.objects.get(name) for name in names}
    missing = [name for name, obj in objects.items() if obj is None]
    if missing:
        raise RuntimeError(f"Missing objects: {', '.join(missing)}")

    for frame in args.frames:
        bpy.context.scene.frame_set(frame)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        print(f"Frame {frame}")
        for name in names:
            print_bounds(f"  {name}", objects[name], depsgraph)


if __name__ == "__main__":
    main()
