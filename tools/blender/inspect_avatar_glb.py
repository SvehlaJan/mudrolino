"""Inspect armatures, actions, and animation tracks in an avatar GLB."""

from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
import sys

import bpy


def iter_action_fcurves(action: bpy.types.Action):
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return

    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                channelbag = strip.channelbag(slot)
                if channelbag is None:
                    continue
                yield from channelbag.fcurves


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def track_kind(data_path: str) -> str:
    if data_path.endswith("rotation_quaternion"):
        return "rotation_quaternion"
    if data_path.endswith("rotation_euler"):
        return "rotation_euler"
    if data_path.endswith("location"):
        return "location"
    if data_path.endswith("scale"):
        return "scale"
    return data_path.rsplit(".", 1)[-1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("glb", type=Path)
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)

    clear_scene()
    import_glb(args.glb)

    print(f"GLB: {args.glb}")
    print("Objects:")
    for obj in sorted(bpy.context.scene.objects, key=lambda item: item.name):
        print(f"  - {obj.name} ({obj.type})")

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    print(f"Armatures: {len(armatures)}")
    for armature in armatures:
        bones = list(armature.data.bones)
        print(f"  - {armature.name}: {len(bones)} bones")
        print("    " + ", ".join(bone.name for bone in bones[:40]))

    print(f"Actions: {len(bpy.data.actions)}")
    for action in bpy.data.actions:
        fcurves = list(iter_action_fcurves(action))
        kinds = Counter(track_kind(fcurve.data_path) for fcurve in fcurves)
        print(
            f"  - {action.name}: frame {action.frame_range[0]:.0f}-{action.frame_range[1]:.0f}, "
            f"{len(fcurves)} fcurves, layered={action.is_action_layered}, "
            f"legacy={action.is_action_legacy}, slots={len(action.slots)}"
        )
        for kind, count in sorted(kinds.items()):
            print(f"    {kind}: {count}")


if __name__ == "__main__":
    main()
