"""Render front/side QA previews from a saved avatar workbench `.blend` file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--focus-z", type=float, default=0.72)
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=1200)
    return parser.parse_args(argv)


def load_blend(path: Path) -> None:
    bpy.ops.wm.open_mainfile(filepath=str(path))


def object_bounds() -> tuple[Vector, Vector]:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not meshes:
        raise RuntimeError("No visible meshes to render")
    corners = []
    for obj in meshes:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    return (
        Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners))),
        Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners))),
    )


def setup_scene(width: int, height: int) -> bpy.types.Object:
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    if hasattr(bpy.context.scene, "eevee"):
        bpy.context.scene.eevee.taa_render_samples = 64
    bpy.context.scene.render.resolution_x = width
    bpy.context.scene.render.resolution_y = height
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"

    for obj in list(bpy.context.scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)

    camera_data = bpy.data.cameras.new("WorkbenchPreviewCamera")
    camera = bpy.data.objects.new("WorkbenchPreviewCamera", camera_data)
    camera_data.lens = 70
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    for name, location, energy, size in (
        ("WorkbenchKeyLight", (2.0, -3.0, 4.0), 520, 4.0),
        ("WorkbenchFillLight", (-2.4, -2.2, 2.4), 120, 5.0),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        light_data.energy = energy
        light_data.size = size
        bpy.context.collection.objects.link(light)

    return camera


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_views(output_dir: Path, camera: bpy.types.Object, focus_z: float) -> None:
    min_corner, max_corner = object_bounds()
    center = (min_corner + max_corner) / 2
    height = max_corner.z - min_corner.z
    target = Vector((center.x, center.y, focus_z))
    distance = max(2.8, height * 2.6)
    output_dir.mkdir(parents=True, exist_ok=True)

    views = {
        "front": Vector((center.x, center.y - distance, focus_z + 0.18)),
        "side": Vector((center.x + distance, center.y, focus_z + 0.18)),
    }
    for name, location in views.items():
        camera.location = location
        look_at(camera, target)
        bpy.context.scene.render.filepath = str(output_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {name}: {bpy.context.scene.render.filepath}")


def main() -> None:
    args = parse_args()
    load_blend(args.input)
    camera = setup_scene(args.width, args.height)
    render_views(args.output_dir, camera, args.focus_z)


if __name__ == "__main__":
    main()
