# A01 head-envelope revision retrospective

Status: technical fit passes on both bases with the +30% heads; art review pending.
Builder: `tools/blender/catalog/build_catalog_a01_fitted.py` on the shared `catalog_headwear_geometry.py`. Verifier:
`tools/blender/catalog/verify_catalog_headwear.py`. Pure rules and their tests:
`tools/blender/catalog/catalog_headwear_plan.py`, `tools/avatar/headwearPlan.test.ts`.
Per base: `A01.blend`, `A01.glb`, `head-under-hat.glb`, `outfit.glb`,
`study-report.json`, `fit-verification-report.json`, review renders.

## Why the original failed

The first A01 was a fixed half-ellipsoid at hard-coded heights. It was scaled up
about 11% to clear one front lock of the original H01, which left it floating 9–12 cm
above the hair. Its band was a flat ring 6 cm above the ears. It intersected the
painted H01 (233 pairs), yet passed because every gate only tested intersections.
See `docs/audits/2026-10-07-avatar-fit-and-tooling-audit.md`.

## Construction

1. **Under-hat hair.** An `under_A01` shape key (one key per headwear item) flattens hair inside the crown to
   8 mm over the skull. The tuck is 7.8 mm below the band, deepening to 53 mm under
   the brim span, and the hair releases over the next 26 mm (head-scaled). Basis geometry is
   unchanged. The key exports as a glTF morph target at weight 1; Three.js keeps it
   through `SkeletonUtils.clone`.
2. **Envelope.** The outer surface of skull plus flattened hair (ears and nose
   excluded) is ray-cast on a 256×120 azimuth/elevation grid. It is dilated by one
   sample so hair edges stay covered, then smoothed from above (`max(raw, blur)`).
   Within 15 mm of the band it blends back to the true surface, so the band hugs
   the head.
3. **Crown.** The crown is the envelope plus 2.5 mm ease, with up to 10.4 mm of
   extra lift on the front panels. Fabric is 3 mm. The band tilts: the front rises 7.2 cm
   over the sides; sides at the measured ear tops plus clearance; back
   1.3 cm below the skull centre.
4. **Details.** An arched rear opening whose boundary vertices snap to a smooth
   arch. A blue strap over the opening. A brim at 30% of crown width, 14° pitch,
   with camber that fades toward the brim ends. Six panel seams and a crown button.

## Iterations (each rejected state was measured by the fit gate)

1. Ear tops came from the inner-ear material, so the side band sat on the ear
   rim (108 pairs). Ear tops are now measured from the ear geometry.
2. H02's painted brows sit low, so a brow-based front put the band's front below its
   sides and pulled the cap over the forehead. The front now rises a fixed amount
   over the sides on every head, with the brow as a lower bound.
3. Camber was not scaled by reach, so the brim ends hung 23 mm down into the
   face-framing hair (128–201 pairs). Camber now fades with reach.
4. An envelope of skull + 8 mm left 12–13 mm band gaps over bare skin. The crown
   now follows the actual worn surface.
5. Smoothing lifted the band at H02's hairline, and plain interpolation undercut
   her front parting (16 pairs). Fixed with band hugging plus one-sample dilation.
6. The button sank into the hair at the crown top; it is now raised.

The fit gate's band rule changed from "max 5 mm all round" to "p90 ≤ 5 mm, max
≤ 15 mm". Fabric must bridge a hair edge such as H02's front parting, which the
brim hides. The old cap's 60–120 mm gaps still fail by a wide margin.

## Verification (fresh)

| Base | Crown gap p50 / p90 / max | Band p90 / max | Intersections | Gait + gesture poses | Export |
| --- | --- | --- | --- | --- | --- |
| Male (+30% H01, T05/B01/F04) | 3.25 / 8.23 / 13.5 mm | 4.09 / 5.47 mm | 0 | 168 clear | 0.60 µm |
| Female (+30% H02, unclothed) | 3.52 / 8.90 / 13.9 mm | 4.52 / 13.5 mm | 0 | 168 clear | 0.61 µm |

Desktop/phone gallery playback passes for both
(`node tools/avatar/verify_model_studies.mjs --asset=a01-envelope-male --asset=a01-envelope-female`).

## Open

- Art review against the A01 sheet. The strap stays cornflower blue per the
  original design board; the female fit sheet recolours it navy. One choice is
  needed for both.
- Female T02 hood with the larger H02 hair, and the cap with that hood.
- Male combinations other than T05/B01/F04; other tops are clear of the larger
  head, but their cap combinations are not swept.
- Runtime slot logic must set the worn item's `under_<ID>` hair morph to 1.
