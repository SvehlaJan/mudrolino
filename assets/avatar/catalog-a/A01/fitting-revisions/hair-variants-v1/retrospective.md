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
  stay. The press is flat by default: ramping it with the original thickness near a
  hairline made the crop worse while the band was dilated (5.4 → 7.6 mm p90). The crop
  uses the ramp with an undilated band (below).
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
| A01 on H04 | 3.3 mm | 4.7 mm | 0 | clear | pass |
| A02 on H04 | 5.1 mm | 4.8 mm | 0 | clear | pass |

## The crop (H04)

The crop's front and side hairline sits just above both bands (the band rests on forehead
and temple skin, then on hair behind the ears). Measured, not guessed:

- **Floating band:** the envelope dilates the worn surface by one sample (~7 mm), so
  the crop's hair edge just above the band lifted the band off the skin below
  (5.4–5.9 mm p90). A smaller band hug and higher bands only made it worse (5.2–7.3 mm).
- **Without band dilation** the band hugs the exact surface (3.8/4.1 mm), but it then cut
  the cliff a flat press leaves at the hairline (41/20 pairs). A deeper press below the
  band changed nothing.
- **A ramped press** (pressed height follows the original thickness at the edge) removed
  the cliff (11/10 pairs left), and 0.9 mm more band ease than the designs cleared the
  rest.

So `HEADS['male-H04']` sets `band_dilation=False`, `shell_ramp=True` and
`band_relief=-.0009`. A01 on the crop: crown p50 3.3 mm, band p90 4.7 mm; A02: 5.1 /
4.8 mm; zero intersections and clear motion for both. Base heads and H03/H05 keep the
default settings.
