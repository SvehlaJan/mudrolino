# A06 loop scarf on female O05 (+30% head) — retrospective (2026-10-09)

Status: technical gates pass; art review pending. Builder:
`build_catalog_a06.py --outfit-blend female/outfits/studies/O05-head130-with-A02/outfit.blend
--top T05_crew_sweatshirt --body body_underlayer_female --hair-over H02_hair --clearance .015`.

## The bob and the scarf

The H02 bob hangs to the shoulders where the scarf sits, and the hair is rigid on Head
while the scarf follows the torso. So the hair is not a scarf obstacle; instead an
`over_A06` hair key rests the bob on the scarf:

1. Every posed scarf (rest, five head gestures, 163 gait poses) maps into the Head rest
   frame, and its centreline loops are sampled every 2 mm.
2. Hair within the tube's reach plus 8 mm rises vertically onto the highest tube top in
   its column. Each lift spreads (smoothstep, 25 mm) so a lock's layers rise together.

The look-up gesture drops the back of the head onto the scarf, so the bob lifts by up to
139 mm and the back reads short. What didn't work: pushing each hair vertex away from
its nearest scarf point shredded the bob into spikes and pressed it into the shoulders
(373 sweatshirt pairs).

## The scarf path

The run lifts the female shoulders into the scarf at the back, so this fit keeps 15 mm
clearance (male 9 mm). Getting there exposed a path bug:

- **Pushes slide points along the loop.** Points bunched (1–3 mm apart) and left gaps up
  to 140 mm. The straight tube across a gap cut the shoulder unchecked, and the knots
  showed. The builder now alternates the posed refinement with relaxing points along
  the loop only (toward the neighbours' midpoint), ends on a posed refinement, and fails
  if a gap exceeds four median spacings. Female spacing is 14–34 mm.
- **Approaches that failed:**
  - checking the ring surface instead of the centreline: its inside test trusted garment
    normals, and one pointed inward (573 pairs)
  - pushes only across the loop: they didn't converge
  - ending on a relaxed path checked against the strict centreline reach: it never
    settled

## Results

- **Motion:** 163 poses with zero body/layer pairs; the hair is clear in motion.
- **Head:** five gestures clear.
- **Export:** 1.1 µm.
- **Validity:** glTF and materials pass.

The male O05 scarf was rebuilt with the same builder and still passes (spacing 9–47 mm).

## Open

- Art review of the shortened back of the bob and the scarf's drape.
- H03 and H05 reach the scarf too and wear it through their own drape studies
  (`../../hair-variants-v1/`); H04 and H06 clear the male scarf as is.
