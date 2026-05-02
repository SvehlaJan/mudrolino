"""Render quick PNG previews for modular avatar GLBs in Blender."""

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
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=900)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def ensure_camera() -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -4.2, 1.05)
    camera.rotation_euler = (1.38, 0, 0)
    camera_data.lens = 58
    bpy.context.scene.camera = camera
    return camera


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -3, 4))
    key = bpy.context.object
    key.name = "PreviewKeyLight"
    key.data.energy = 420
    key.data.size = 4

    bpy.ops.object.light_add(type="POINT", location=(-2.2, -2.4, 2.4))
    fill = bpy.context.object
    fill.name = "PreviewFillLight"
    fill.data.energy = 70


def set_visibility(selected_top: str) -> None:
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("top_"):
            obj.hide_render = obj.name != selected_top
            obj.hide_viewport = obj.name != selected_top


def render(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    clear_scene()
    import_glb(args.input)
    camera = ensure_camera()
    look_at(camera, Vector((0, 0, 0.92)))
    add_lights()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    if hasattr(bpy.context.scene, "eevee"):
        bpy.context.scene.eevee.taa_render_samples = 64
    bpy.context.scene.render.resolution_x = args.width
    bpy.context.scene.render.resolution_y = args.height
    bpy.context.scene.world.color = (0.93, 0.96, 1.0)
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    bpy.context.scene.view_settings.exposure = 0
    bpy.context.scene.view_settings.gamma = 1

    for top_name in ("top_blue_tshirt", "top_green_hoodie"):
        set_visibility(top_name)
        render(args.output_dir / f"{top_name}.png")

    print(f"Rendered avatar previews to {args.output_dir}")


if __name__ == "__main__":
    main()
