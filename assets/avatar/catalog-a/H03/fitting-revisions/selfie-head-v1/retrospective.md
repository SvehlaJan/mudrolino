# H03–H06 hair variants on the reusable selfie heads — retrospective (2026-10-09)

The user chose H03–H06 as hair variants on the reusable selfie head: the face comes
from the parent's selfie texture, so only hair (and the goatee, which belongs to that
texture) distinguishes these styles. H03 (curls) and H05 (silver waves) sit on the
female +30% head, H04 (crop) and H06 (bald) on the male one, as the catalog assigns.

## Construction

`build_catalog_hair_variant.py` removes the base hair (the H01 hair faces or the
`H02_hair` object) and grows the style as a radial shell: one grid vertex per direction
from the skull centre, offset from the first scalp hit by the style's volume plus lumps.
`catalog_hair_plan.py` holds the rules: hairline height by angle from the face,
front/side/back/crown volume, edge width per direction, and Fibonacci-spaced lumps.
Edges sink 1.5 mm under the skin, so no seam shows and nothing floats.

What changed the look most:

- Ball lumps (round cap, steep sides) read as curls; the soft profile read as studs.
- Fewer, larger lumps with per-lump size jitter: 520 even lumps looked like scales.
- A long edge at the back (50 mm) rolls the curls under; a short one left a helmet lip.
- H05 waves are lumps stretched 2.4× along a tilted, mirrored axis, with a thin front
  and a long front edge. The first, evenly stretched version looked like a knitted cap.
- Lumps scale with local volume, so the crop's short sides stay smooth.

## Proof

`verify_catalog_hair_variant.py` (reports in each `selfie-head-v1/<base>/`):

| Style | Head + hair triangles (base) | Wardrobe outfits clear | Glasses on hair (info) |
| --- | --- | --- | --- |
| H03 | 30,416 (49,820) | 6 female | 48 pairs, skin clear |
| H04 | 46,628 (65,084) | 7 male, A06 scarf included | 110–112 pairs, skin clear |
| H05 | 28,468 (49,820) | 6 female | 40–44 pairs, skin clear |
| H06 | 16,896 (65,084) | — (no hair) | skin clear |

Every variant: head vertex-identical to the base head minus its hair, rigid Head
binding, painted eyes/brows/mouth visible from five cameras, no skin through the hair
inside the hairline, ears and nose clear (H04), zero contact with body and garments over
169 samples (quarter-frame walk/run plus six gestures) in every outfit on its base,
canonical face UV corners and image through the GLB, 0.3 µm rest export, valid glTF.

## Follow-up the same day

- **H04 sides:** they end 68 mm above the skull centre, just above the beanie band (60 mm;
  the outer ear reaches 54 mm). Lowering them to cover the band touched the ears
  (54 pairs). With the hairline at the band, the band crossed the hair edge.
- **The A06 scarf:** H03 and H05 reach the female scarf and wear it through drape studies
  (`A06/fitting-revisions/hair-variants-v1/`), so the wardrobe sweep leaves the female
  scarf out for them. H04 clears the male scarf as is.
- **Caps and beanies:** `catalog_headwear_geometry.HEADS` has `female-H03`, `male-H04` and
  `female-H05`, so A01/A02 fit to each variant (`A0x/fitting-revisions/hair-variants-v1/`)
  with a pressed under-hat shell key. Results are in that retrospective.
- **Phone LODs:** `build_catalog_lod.py` culls and decimates the variant hair objects
  (`HAIR_PREFIXES`).

## Open

- Art review in `/avatar-preview` (`h03-selfie-head-female` … `h06-selfie-head-male`).
