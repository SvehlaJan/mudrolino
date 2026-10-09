# T04 zip-lining-v1 — retrospective (2026-10-09)

The hood-v2 review note said the zip read as a hairline and the orange lining showed only
at the neck, while the reference has a thick ivory zip and a visible lining. The audit
plan listed both ("T04 orange lining, ivory zip").

Builder: `build_catalog_hood_revision.py --id T04 --zip-lining --foundation
H01/style-revisions/painted-face-scale-130/foundation.blend` (fuller hood, no drawcords,
plus the two flags below). The canonical T04 is unchanged.

## Changes

- **Zip tape:** 14 mm wide instead of 3.6 mm (`ZIP_HALF_WIDTH` .0018 → .007), with a larger
  pull. It follows the cloth surface like before.
- **Neckline lining:** two orange ribbons, 14 mm wide, run just under the front neckline
  rim from the zip edge to the hood's lined ends at the neck sides
  (`T04 collar lining`, its own material). The rim is found by ray casts at build time.

## Proof

- **Piece:** 163-pose motion with zero body/layer pairs, head clearance, and details
  (zip, pockets and collar lining) within the attachment gate. glTF and materials pass.
  Coverage shows the same single hem face as hood-v2 (face 67100, a low camera); outfits
  cover it.
- **Male O04 and the T04/B01/F01 capsule:** reassembled with this T04 and pass motion,
  coverage, corrective sides, export (1.1 and 6.1 µm), head clearance and glTF.
- **Female O04:** passes the full runner (15/15).
- **Phone LODs:** O04 male 94,999 and female 94,871 triangles, all gates pass.

## Open

- Art review. The lining band reads at phone size but is subtle; the reference's open
  hood shows more orange. A fuller lining reveal would need the hood mouth to wrap the
  front, which changes the hood fit on both bases.
