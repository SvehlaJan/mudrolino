"""Hoodie revision with a fuller lowered hood (T02 or T04); canonical masters stay unchanged.

With --zip-lining (T04 only) the revision also widens the ivory zip tape to 14 mm with a
larger pull and binds the front neckline in the orange lining (`zip-lining-v1`).

The audit found the T02/T04 hoods read as a flat ridge. This revision deepens the
hanging bowl (50 mm bulge, lower and further back) and, for T04, drops the ivory
drawcords the construction target forbids. Build on the +30% male foundation:

  blender_cli.py build_catalog_hood_revision.py --id T02 --foundation H01/.../foundation.blend
      --output-dir T02/fitting-revisions/hood-v2 --review-dir artifacts/...
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_catalog_t02
import build_catalog_t04
from catalog_piece import build_piece, long_top_coverage

FULLER_HOOD = {'bulge': .05, 'bottom_y': .20, 'bottom_rise': .075}


def main():
    arguments = sys.argv[sys.argv.index('--') + 1:]
    piece = arguments[arguments.index('--id') + 1]
    # Strip --id before the canonical entry points parse their own arguments.
    index = sys.argv.index('--id')
    del sys.argv[index:index + 2]
    zip_lining = '--zip-lining' in sys.argv
    if zip_lining:
        sys.argv.remove('--zip-lining')
    build_catalog_t02.HOOD_SHAPE.update(FULLER_HOOD)
    if zip_lining and piece != 'T04':
        raise ValueError('--zip-lining applies to T04')
    if zip_lining:
        build_catalog_t04.ZIP_HALF_WIDTH, build_catalog_t04.PULL_SCALE = .007, (.006, .0026, .0075)
        build_catalog_t04.LINING_COLLAR = True
    if piece == 'T02':
        build_catalog_t02.main()
    elif piece == 'T04':
        build_catalog_t04.DRAWCORDS = False
        build_piece('T04', build_catalog_t04.create_zip_hoodie, long_top_coverage)
    else:
        raise ValueError('Hood revisions cover T02 and T04')


if __name__ == '__main__':
    main()
