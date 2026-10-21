"""Render a source-bound fallback still without rebuilding proven model geometry."""
import argparse
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, render_reviews, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source_hash = digest(args.blend)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    bpy.context.scene.frame_set(0)
    reviews = render_reviews(args.output_dir)
    report = {
        'status': 'rendered', 'source': str(args.blend), 'source_sha256': source_hash,
        'renderer_sha256': digest(Path(__file__)),
        'helper_sha256': digest(Path(__file__).with_name('bear_companion_common.py')),
        'blender_version': bpy.app.version_string, 'frame': 0,
        'width': 320, 'height': 368, 'maximum_css_slot': [160, 184],
        'minimum_pixel_ratio': 2,
        'camera': {'distance': 5.2, 'height': 1.35, 'target_height': 1.25,
                   'vertical_fov': 34, 'normalized_model_height': 2.7},
        'reviews': {name: {'path': path, 'sha256': digest(Path(path))}
                    for name, path in reviews.items()},
        'scope': 'Fallback render only; geometry/motion proof stays bound to the unchanged native source.',
    }
    assert digest(args.blend) == source_hash, 'Rendering changed the proven native source'
    write_json(args.output_dir / 'still-report.json', report)


if __name__ == '__main__':
    main()
