"""Palette-A ivory tapered trousers with projected pockets and navy button."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_bottom_geometry import create_bottom_shell, full_trouser_coverage, fit_bottom_cuff, fit_bottom_rear_hip_weights
from catalog_bottom_details import add_tailored_details
from catalog_piece import build_piece
from build_catalog_head import material
from catalog_correctives import add_rear_hip_compression_correctives


def create_trousers(arm, body):
    ivory = material('A ivory tapered trouser fabric', (.84, .78, .66), .88)
    trim = material('A ivory tapered trouser trim', (.79, .73, .62), .90)
    seams = material('A ivory tapered trouser pockets and seams', (.76, .70, .59), .88)
    navy = material('A navy tapered trouser button', (.028, .052, .105), .88)
    # Comfortable thigh ease and a gradual taper into the verified cuff/shoe
    # overlap, rather than rescaling the rig or shrinking the ankle clearance.
    rings = [
        (.750, .108, .122), (.670, .103, .113), (.570, .096, .103),
        (.515, .090, .097), (.475, .087, .095), (.430, .084, .095),
        (.330, .079, .090), (.230, .073, .081), (.154, .071, .075),
        (.141, .071, .075), (.135, .072, .076),
    ]
    obj = create_bottom_shell(arm, 'B04_ivory_trousers', rings,
                              [ivory, trim], .969, .150)
    fit_bottom_cuff(obj,arm,body)
    fit_bottom_rear_hip_weights(obj,body)
    obj=add_tailored_details(obj, arm, seams, navy)
    add_rear_hip_compression_correctives(obj,arm,body)
    return obj


if __name__ == '__main__':
    build_piece('B04', create_trousers, full_trouser_coverage)
