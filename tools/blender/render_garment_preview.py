"""Render front/side/back QA previews for a garment GLB."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def import_glb(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def bounds_for_meshes() -> tuple[Vector, Vector]:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name != "Icosphere"]
    if not meshes:
        raise RuntimeError("No renderable garment meshes found")

    corners = []
    for obj in meshes:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

    return (
        Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners))),
        Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners))),
    )


def setup_render() -> bpy.types.Object:
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 900
    bpy.context.scene.render.resolution_y = 1200
    bpy.context.scene.eevee.taa_render_samples = 32

    camera_data = bpy.data.cameras.new("GarmentPreviewCamera")
    camera = bpy.data.objects.new("GarmentPreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    for name, location, energy in (
        ("KeyLight", (1.8, -3.0, 3.0), 650),
        ("FillLight", (-2.2, -2.0, 2.0), 180),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        light_data.energy = energy
        light_data.size = 4.0
        bpy.context.collection.objects.link(light)

    return camera


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_views(output_dir: Path, camera: bpy.types.Object) -> None:
    min_corner, max_corner = bounds_for_meshes()
    center = (min_corner + max_corner) / 2
    height = max_corner.z - min_corner.z
    distance = max(1.4, height * 2.6)

    views = {
        "front": Vector((center.x, center.y - distance, center.z + height * 0.08)),
        "side": Vector((center.x + distance, center.y, center.z + height * 0.08)),
        "back": Vector((center.x, center.y + distance, center.z + height * 0.08)),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    for name, location in views.items():
        camera.location = location
        look_at(camera, center)
        bpy.context.scene.render.filepath = str(output_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {name}: {bpy.context.scene.render.filepath}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)

    clear_scene()
    import_glb(args.input)
    camera = setup_render()
    render_views(args.output_dir, camera)


if __name__ == "__main__":
    main()
