# T02/T04 fuller hood revision retrospective (hood-v2)

Status: technical gates pass on the male base; art review pending. Builder:
`tools/blender/catalog/build_catalog_hood_revision.py --id T02|T04` (through the
canonical T02 builder or `build_piece`, on the +30% male foundation). Canonical
T02/T04 stay unchanged. T04 notes live here because both hoodies share the hood.

The audit found both hoods read as a flat ridge from the front. This revision
deepens the hanging bowl of the shared lowered hood:
- `bulge` 25 → 50 mm, `bottom_y` 180 → 200 mm (further back), `bottom_rise` 55 → 75 mm
  (`build_catalog_t02.HOOD_SHAPE`, which the canonical builder still sets to the old values)
- T04 drops the ivory drawcords, which the construction target forbids
  (`build_catalog_t04.DRAWCORDS`)

Widening the hood top corners (half width 115 mm, side arch 20 mm) put the hood
into the head in 57 sampled pairs; 105 mm left a hole in the ray samples. The top
stays at 100 mm / 15 mm.

Gates (male, +30% head):
- **T02 piece:** 163-pose motion with zero body/layer pairs, head clearance, glTF
  for `T02.glb` and `body-T02.glb`, materials.
- **T04 piece:** the same, plus stitched details within 8.0 mm over 164 poses
  (12 mm cap).
- **Shown alone:** one hidden body face (#67100, at the hem) is visible from a
  low camera on both, the same face as T06 shown alone. Trousers cover it.
- **T02/B01/F01 and T04/B01/F01 outfits** (`outfits/T02-B01-F01-head130`,
  `outfits/T04-B01-F01-head130`, review combinations): each 163 poses clear, zero
  coverage holes, 16-pose export at 6.07 µm, head clearance, valid glTF. Gallery
  verification passes on desktop and phone.

Female T02 uses the same hood with `--hood-shape` on
`build_catalog_female_outfit_study.py`
(`female/outfits/studies/T02-B01-F01-head130`); see the section below.

Open: a collar roll and V at the front neck, which the reference shows and neither
base has; art review of hood depth from the front. T04: the zipper reads as a
hairline and the orange lining shows only at the neck, while the reference has a
thick ivory zip and a visible lining.
