"""Render selected frames from an animated avatar GLB."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", nargs="+", type=int, default=[1, 13, 25])
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=900)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_scene(width: int, height: int) -> None:
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -4.2, 1.05)
    camera_data.lens = 58
    look_at(camera, Vector((0, 0, 0.92)))
    bpy.context.scene.camera = camera

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
    bpy.ops.import_scene.gltf(filepath=str(args.input))
    setup_scene(args.width, args.height)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    for frame in args.frames:
        bpy.context.scene.frame_set(frame)
        output = args.output_dir / f"frame_{frame:03d}.png"
        bpy.context.scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered frame {frame}: {output}")


if __name__ == "__main__":
    main()
