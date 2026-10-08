# A02 folded-cuff beanie retrospective

Status: first revision on both bases. Technical fit passes; art review pending.
Builder: `tools/blender/catalog/build_catalog_a02.py`, using the shared
`catalog_headwear_geometry.py` (also used by A01). Verifier:
`tools/blender/catalog/verify_catalog_headwear.py`. Reference: A02 on the
accessories board, `14-beanie-construction.png` and the female accessory-fit sheet.

## Construction

- An `under_A02` hair key flattens hair to 8 mm inside the beanie. Each headwear
  item has its own `under_<ID>` key because the band heights differ.
- Band: the front is 2.6 cm above the brows, or 1.3 cm above the sides when that
  is higher. The sides sit just above the measured ear tops. The back is 2.6 cm
  below the skull centre, lower than the cap.
- Knit crown: the worn envelope plus 2.5 mm ease, rising to 6.5 mm of extra dome at
  the top. Knit is 4 mm thick.
- Cuff: a swept fold profile. The flat half-ellipse fold has a 3.9 mm rise, so the
  underside hugs the head. The outer wall is 14.3 mm thick with a slight bulge,
  then a round top lip returns onto the crown. The cuff is 71.5 mm tall after the
  1.3 head scale, about 40% of the visible hat as in the reference.

## Iterations

1. The first cuff (38 mm, 9 mm thick, before scale) read as a thin headband next
   to the reference; it was enlarged.
2. A low male front band (brow + 1.6 cm) crossed H01's front hairline. The crown
   just above the fold then bridged the hair edge (band p90 9.3 mm, hidden by the
   cuff). Matching the cap's brow offset keeps the band in the hair; the female
   front is unaffected because the side rule governs it.

## Verification (fresh)

| Base | Crown gap p50 / p90 / max | Band p90 | Intersections | Gait + gesture poses |
| --- | --- | --- | --- | --- |
| Male (+30% H01, T05/B01/F04) | 4.83 / 8.94 / 9.05 mm | 3.44 mm | 0 | 168 clear |
| Female (+30% H02, unclothed) | 5.35 / 9.06 / 11.6 mm | 3.67 mm | 0 | 168 clear |

The `under_A02` morph exports at weight 1. The 16-pose export passes, and
desktop/phone gallery playback passes (`verify_model_studies.mjs --asset=a02-envelope-male --asset=a02-envelope-female`).

The male review assembly is the O05 recipe (T05/B01/F04/A02). It is registered as a
pending O05 revision because B01 is the separate F04-compatible study and the
combined outfit has no body/layer/export proof of its own.

## Open

Art review: the dome might want a little more height or slouch. Female O05 needs
female T05, F04 and the F04-compatible B01. The beanie has not been checked with
hoods.
