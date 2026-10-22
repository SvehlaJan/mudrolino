"""Render a source-bound fallback still without rebuilding proven model geometry."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, render_reviews, write_json
from build_catalog_t01 import world_mesh


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--width', type=int, default=320)
    parser.add_argument('--height', type=int, default=368)
    parser.add_argument('--camera-distance', type=float, default=5.2)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.width < 2 or args.height < 2 or args.width % 2 or args.height % 2 or args.camera_distance <= 0:
        raise ValueError('Use positive even dimensions and a positive camera distance')
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        raise ValueError('Preserve previous still evidence; choose an empty output directory')
    source_hash = digest(args.blend)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    bpy.context.scene.frame_set(0)
    reviews = render_reviews(args.output_dir, still=False)
    scene = bpy.context.scene
    camera = scene.camera
    points = [point for obj in bpy.data.objects if obj.type == 'MESH'
              for point in world_mesh(obj)[0]]
    minimum_z, maximum_z = min(point.z for point in points), max(point.z for point in points)
    scale = 2.7 / (maximum_z - minimum_z)
    center_x = (min(point.x for point in points) + max(point.x for point in points)) / 2
    center_y = (min(point.y for point in points) + max(point.y for point in points)) / 2
    target = Vector((center_x, center_y, minimum_z + 1.25 / scale))
    camera.data.type = 'PERSP'
    camera.data.sensor_fit = 'VERTICAL'
    camera.data.lens = camera.data.sensor_height / (2 * math.tan(math.radians(17)))
    camera.location = Vector((center_x, center_y - args.camera_distance / scale,
                              minimum_z + 1.35 / scale))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.resolution_x, scene.render.resolution_y = args.width, args.height
    still_path = args.output_dir / 'bear-still.png'
    scene.render.filepath = str(still_path.resolve())
    bpy.ops.render.render(write_still=True)
    reviews['still'] = str(still_path)
    report = {
        'status': 'rendered', 'source': str(args.blend), 'source_sha256': source_hash,
        'renderer_sha256': digest(Path(__file__)),
        'helper_sha256': digest(Path(__file__).with_name('bear_companion_common.py')),
        'blender_version': bpy.app.version_string, 'frame': 0,
        'width': args.width, 'height': args.height,
        'maximum_css_slot': [args.width // 2, args.height // 2],
        'minimum_pixel_ratio': 2,
        'camera': {'distance': args.camera_distance, 'height': 1.35, 'target_height': 1.25,
                   'vertical_fov': 34, 'normalized_model_height': 2.7},
        'reviews': {name: {'path': path, 'sha256': digest(Path(path))}
                    for name, path in reviews.items()},
        'scope': 'Fallback render only; geometry/motion proof stays bound to the unchanged native source.',
    }
    assert digest(args.blend) == source_hash, 'Rendering changed the proven native source'
    write_json(args.output_dir / 'still-report.json', report)


if __name__ == '__main__':
    main()
