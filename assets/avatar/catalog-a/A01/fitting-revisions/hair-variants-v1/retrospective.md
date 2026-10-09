# A01 cap and A02 beanie on the hair variants — retrospective (2026-10-09)

This covers both items; A02's `hair-variants-v1` studies are described here too.

The caps and beanies were fitted to the base hair (H01 locks, the H02 bob). The hair
variants are single shells grown over the same heads, so each item is refit on each
variant: `build_catalog_a01_fitted.py` / `build_catalog_a02.py --base female-H03 | male-H04 |
female-H05 --output-dir A0x/fitting-revisions/hair-variants-v1/H0x`, gated by
`verify_catalog_headwear.py --study-dir ...`.

## What the variants needed

- **Head source:** `catalog_headwear_geometry.HEADS` gained a variant entry per hair: the
  variant study is the head source, the base head's landmarks apply, and the whole
  `H0x_hair` object is hair.
- **Verifier:** it found head objects by the base names, so it measured the cap's gaps to
  the bare skull and skipped cap-to-hair contact. It now adds the study's own hair object.
- **Pressed shell:** the base `under_hat_radius` only flattens hair, so curl valleys stayed
  low under the band and the band bridged them. For a shell, `pressed_shell_radius` sets
  it to the hair layer under the band in both directions; edges tucked under the skin
  stay. Ramping the press with the original thickness near a hairline made the crop worse
  (5.4 → 7.6 mm p90), so the press is flat.
- **Band relief:** the band ease (2.5 mm) clears the base hair's locks. The pressed shells
  are smooth there, so the variants take 1.2 mm (1.56 mm scaled) off the ease at the band,
  fading out over the lowest 15% of the crown. Base heads are unchanged; their rebuilt
  studies are geometrically identical to the previous ones (A01 face order differs only).

## Results

| Pairing | Crown p50 | Band p90 | Intersections | Motion | Status |
| --- | --- | --- | --- | --- | --- |
| A01 on H03 | 3.5 mm | 3.4 mm | 0 | clear | pass |
| A01 on H05 | 3.5 mm | 3.2 mm | 0 | clear | pass |
| A02 on H03 | 5.3 mm | 4.5 mm | 0 | clear | pass |
| A02 on H05 | 5.3 mm | 1.8 mm | 0 | clear | pass |
| A01 on H04 | 3.3 mm | 3.8 mm | 16 (crop curls below the band) | 16 pairs | repair needed |
| A02 on H04 | 5.0 mm | 5.9 mm | 0 | clear | repair needed |

## Open: the crop (H04)

Both H04 pairings fail because of where the crop's front hairline sits. A02's band rests
on forehead skin about 14 mm under the crop hairline, and the shared envelope blends in
the hair ramp above it, so the band floats over the skin. A01's band, closer with the
relief, touches the unpressed curls just below it.

Two fixes are possible, and each changes the look of the crop with a hat:

- a per-hair band height for the crop (the band sitting on hair), or
- a crop whose front hairline reaches the band.

Lowering the crop sides to cover the band touched the ears; the sides now end just above
the band. Until one of these is chosen, the crop is not offered with a cap or beanie.
