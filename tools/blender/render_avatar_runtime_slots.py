"""Render an avatar base + separate garment GLB at key animation frames.

This mirrors the runtime slot system: load the base and garment separately,
attach garment roots to foot bones by X-position (matching AvatarModel.tsx),
import a walk/run animation clip, then render selected frames.

Usage example:
  '/Applications/Blender.app/Contents/MacOS/Blender' \
    --background --factory-startup --enable-autoexec \
    --python tools/blender/render_avatar_runtime_slots.py \
    -- \
    --base public/avatar/modular/male-base-plain.glb \
    --garment public/avatar/garments/shoes_blue_sneakers_v1.glb \
    --animation public/avatar/modular/male-base-plain-walking.glb \
    --output-dir /tmp/shoe-runtime-debug \
    --frames 1 7 13 19 25 \
    --views front side
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Vector


FOOT_BONE_NAMES = ("LeftFoot", "RightFoot")


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--garment", type=Path, required=True)
    parser.add_argument("--animation", type=Path, required=False)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", nargs="+", type=int, default=[1, 7, 13, 19, 25])
    parser.add_argument("--views", nargs="+", choices=["front", "side", "three-quarter"],
                        default=["front"])
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=900)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def find_armature() -> bpy.types.Object | None:
    for obj in bpy.context.scene.objects:
        if obj.type == "ARMATURE":
            return obj
    return None


def world_center_x(obj: bpy.types.Object) -> float:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return sum(c.x for c in corners) / len(corners)


def attach_garment_to_bones(armature: bpy.types.Object, garment_roots: list[bpy.types.Object]) -> None:
    """Attach each garment root to the foot bone whose X-side it's on.

    Positive X → LeftFoot (character's anatomical left).
    Negative X → RightFoot (character's anatomical right).
    Matches the runtime logic in AvatarModel.tsx attachShoeSceneToFootBones.
    """
    for root in garment_roots:
        cx = world_center_x(root)
        bone_name = "LeftFoot" if cx >= 0 else "RightFoot"
        if bone_name not in armature.data.bones:
            print(f"  WARN: bone {bone_name} not found, skipping {root.name}")
            continue
        world_before = root.matrix_world.copy()
        root.parent = armature
        root.parent_type = "BONE"
        root.parent_bone = bone_name
        # matrix_parent_inverse defaults to identity; setting matrix_world after
        # parenting adjusts matrix_local so the object keeps its world position.
        bpy.context.view_layer.update()
        root.matrix_world = world_before
        print(f"  {root.name} (cx={cx:.3f}) → {bone_name}")


def transfer_animation(animation_path: Path, armature: bpy.types.Object) -> None:
    """Import a walk/run GLB, steal its action, retarget it to the scene armature."""
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(animation_path))
    new_actions = [a for a in bpy.data.actions if a not in before_actions]

    # Remove the imported armature duplicate
    for obj in list(bpy.context.scene.objects):
        if obj.type == "ARMATURE" and obj is not armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    if not new_actions:
        print("WARN: no new action found in animation GLB")
        return

    action = new_actions[0]
    frame_range = action.frame_range
    print(f"  Using action: {action.name} range {frame_range[0]:.0f}–{frame_range[1]:.0f}")
    armature.animation_data_create()
    armature.animation_data.action = action
    # Blender 5.x layered-action system: bind the slot so the action evaluates.
    if hasattr(armature.animation_data, "action_slot") and len(action.slots) > 0:
        armature.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_start = int(action.frame_range[0])
    bpy.context.scene.frame_end = int(action.frame_range[1])


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(location: tuple[float, float, float], target: Vector, name: str) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = 58
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = Vector(location)
    look_at(cam, target)
    return cam


VIEW_CAMERAS = {
    "front": (0, -4.2, 1.05),
    "side": (4.2, 0, 1.05),
    "three-quarter": (3.0, -3.0, 1.2),
}


def setup_scene(width: int, height: int) -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -3, 4))
    key = bpy.context.object
    key.data.energy = 420
    key.data.size = 4

    bpy.ops.object.light_add(type="POINT", location=(-2.2, -2.4, 2.4))
    fill = bpy.context.object
    fill.data.energy = 70

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    if hasattr(bpy.context.scene, "eevee"):
        bpy.context.scene.eevee.taa_render_samples = 64
    bpy.context.scene.render.resolution_x = width
    bpy.context.scene.render.resolution_y = height
    bpy.context.scene.world.color = (0.93, 0.96, 1.0)
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"


def main() -> None:
    args = parse_args()
    clear_scene()

    print(f"Importing base: {args.base}")
    import_glb(args.base)

    armature = find_armature()
    if armature is None:
        raise RuntimeError("No armature found in base GLB")
    print(f"Armature: {armature.name}")

    print(f"Importing garment: {args.garment}")
    garment_before = set(bpy.context.scene.objects)
    import_glb(args.garment)
    garment_roots = [
        obj for obj in bpy.context.scene.objects
        if obj not in garment_before and obj.parent is None and obj.type in {"EMPTY", "MESH"}
    ]
    print(f"Garment roots: {[r.name for r in garment_roots]}")

    bpy.context.view_layer.update()
    attach_garment_to_bones(armature, garment_roots)

    if args.animation:
        print(f"Importing animation: {args.animation}")
        transfer_animation(args.animation, armature)

    target = Vector((0, 0, 0.92))
    cameras = {view: add_camera(loc, target, f"cam_{view}") for view, loc in VIEW_CAMERAS.items()
               if view in args.views}

    setup_scene(args.width, args.height)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    for frame in args.frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for view, cam in cameras.items():
            bpy.context.scene.camera = cam
            output = args.output_dir / f"frame_{frame:03d}_{view}.png"
            bpy.context.scene.render.filepath = str(output)
            bpy.ops.render.render(write_still=True)
            print(f"Rendered frame {frame} ({view}): {output}")


if __name__ == "__main__":
    main()
