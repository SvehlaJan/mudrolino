"""Render a high-resolution transparent 3D portrait of the Mudrolino Bear for app icons."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

CATALOG_DIR = Path(__file__).resolve().parents[1] / 'blender' / 'catalog'
sys.path.insert(0, str(CATALOG_DIR))
from bear_companion_common import digest
from build_catalog_t01 import world_mesh


def add_area_light(scene, name, location, target, color, energy, size):
    light_data = bpy.data.lights.new(name, type='AREA')
    light_data.color = color
    light_data.energy = energy
    light_data.size = size
    light_obj = bpy.data.objects.new(name, light_data)
    scene.collection.objects.link(light_obj)
    light_obj.location = location
    light_obj.rotation_euler = (target - light_obj.location).to_track_quat('-Z', 'Y').to_euler()
    return light_obj


def configure_world(scene):
    if scene.world is None:
        scene.world = bpy.data.worlds.new('IconStudioWorld')
    scene.world.use_nodes = True
    if scene.world.node_tree and 'Background' in scene.world.node_tree.nodes:
        bg = scene.world.node_tree.nodes['Background']
        bg.inputs['Color'].default_value = (0.55, 0.52, 0.49, 1.0)
        bg.inputs['Strength'].default_value = 0.65
    else:
        scene.world.color = (0.55, 0.52, 0.49)


def main():
    repo_root = Path(__file__).resolve().parents[2]
    default_blend = (
        repo_root
        / 'assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/celebration.blend'
    )
    default_output = repo_root / 'tools/pwa/bear-icon-render.png'

    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, default=default_blend)
    parser.add_argument('--output', type=Path, default=default_output)
    parser.add_argument('--size', type=int, default=1024)
    parser.add_argument('--samples', type=int, default=64)
    args = parser.parse_args(argv)

    if args.size < 64 or args.size % 2:
        raise ValueError('Use an even portrait size >= 64')

    source_hash = digest(args.blend)
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    scene = bpy.context.scene
    scene.frame_set(0)
    bpy.context.view_layer.update()

    for obj in list(bpy.data.objects):
        if obj.type in {'LIGHT', 'CAMERA'}:
            bpy.data.objects.remove(obj, do_unlink=True)

    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    try:
        scene.cycles.use_denoising = True
    except Exception:
        pass
    scene.view_settings.view_transform = 'Standard'
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = args.size
    scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    configure_world(scene)

    points = [
        point
        for obj in bpy.data.objects
        if obj.type == 'MESH' and not obj.hide_render
        for point in world_mesh(obj)[0]
    ]
    minimum_z = min(point.z for point in points)
    maximum_z = max(point.z for point in points)
    height = maximum_z - minimum_z
    center_x = (min(point.x for point in points) + max(point.x for point in points)) / 2
    center_y = (min(point.y for point in points) + max(point.y for point in points)) / 2

    unit = height / 2.2
    anchor = Vector((center_x, center_y, minimum_z))
    target = Vector((center_x, center_y, minimum_z + 0.715 * height))

    add_area_light(
        scene,
        'IconKeySoftbox',
        anchor + Vector((-1.6 * unit, -3.2 * unit, 2.9 * unit)),
        target,
        color=(1.0, 0.98, 0.95),
        energy=205.0 * (unit ** 2),
        size=3.0 * unit,
    )
    add_area_light(
        scene,
        'IconFillSoftbox',
        anchor + Vector((2.3 * unit, -2.6 * unit, 2.0 * unit)),
        target,
        color=(1.0, 0.97, 0.94),
        energy=85.0 * (unit ** 2),
        size=3.6 * unit,
    )
    add_area_light(
        scene,
        'IconRimLight',
        anchor + Vector((0.0, 2.5 * unit, 3.2 * unit)),
        target,
        color=(1.0, 0.96, 0.90),
        energy=155.0 * (unit ** 2),
        size=3.0 * unit,
    )

    cam_data = bpy.data.cameras.new('IconPortraitCamera')
    cam_obj = bpy.data.objects.new('IconPortraitCamera', cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    half_fov = math.radians(13.0)
    cam_data.type = 'PERSP'
    cam_data.sensor_fit = 'VERTICAL'
    cam_data.lens = cam_data.sensor_height / (2.0 * math.tan(half_fov))
    visible_height = 0.73 * height
    distance = (visible_height / 2.0) / math.tan(half_fov)
    cam_obj.location = Vector((center_x, center_y - distance, minimum_z + 0.73 * height))
    cam_obj.rotation_euler = (target - cam_obj.location).to_track_quat('-Z', 'Y').to_euler()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(args.output.resolve())
    bpy.ops.render.render(write_still=True)

    assert digest(args.blend) == source_hash, 'Rendering modified immutable source blend'
    print(f'Rendered {args.output} ({args.size}x{args.size}), height={height:.3f}, source_sha256={source_hash}')


if __name__ == '__main__':
    main()
