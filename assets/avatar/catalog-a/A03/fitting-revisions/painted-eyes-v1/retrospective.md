# A03/A04 glasses fitted to the painted eyes (painted-eyes-v1)

Status: technical gates pass on both bases for A03 (navy round) and A04 (cornflower
soft-square); art review pending. A04 notes live here because both designs share the
builder.

Builder: `tools/blender/catalog/build_catalog_glasses.py --id A03|A04 --base male|female
--output-dir DIR`; gate: `verify_catalog_glasses.py --study-dir DIR`. Pure layout rules
are in `catalog_glasses_plan.py`, tested by `tools/avatar/glassesPlan.test.ts`.

## Construction

- **Eyes:** centres come from the painted faces (`paint_catalog_face.mjs` eyeX/eyeY),
  scaled with the head about the Head pivot like the brow and ear landmarks.
- **Lenses:** each lens encloses its eye opening plus a margin (H01 openings ±33 mm,
  H02 ±35 mm, unscaled). A03 is round and A04 is a superellipse with exponent 4.5.
  On the +30% heads the bridge gaps are 44–57 mm, about the same share of head width
  as on real glasses.
- **Frame:** flat, 6 mm (unscaled) in front of the most forward skin under the
  lenses, the bridge and the rims' outer edge.
- **Temples:** run from the outer rims back over the ears and bend down behind them.
  They are pushed out wherever skin, ears included, comes within 3 mm. Temples pass
  into hair, as real ones do; on H02 they disappear into the bob.
- **Binding and lenses:** everything binds rigidly to Head. There is no lens
  geometry, because transparent lenses sort badly at runtime.

## Results

| | Skin pairs | Frame to face | Motion (163 gait + 5 gestures) | Mirror |
| --- | --- | --- | --- | --- |
| A03 male | 0 | 6.2 mm | clear | 1.4 µm |
| A03 female | 0 | 9.5 mm | clear | 1.4 µm |
| A04 male | 0 | 9.7 mm | clear | 1.4 µm |
| A04 female | 0 | 9.2 mm | clear | 1.4 µm |

The exported rest shape matches the source, glTF validates, and gallery verification
passes on desktop and phone.

## Fixes along the way

- The first temple push cast rays from the head's centre, which stop at the skull side
  and miss the ears. The temple tip then cut into the H01 ears (100 pairs). Casting
  from outside inward finds the outermost skin.
- The temple sat half its height into the ear top, and its path was sampled too
  coarsely over the ear (44 pairs). It now rests a full half height plus 3 mm above
  the ear, with 32 samples.
- The frame plane first ignored the rims' outer edge, which reaches down the sides of
  the nose (A04 came within 1.8 mm of the face). Samples now go out to that edge.
- At 10 mm, the frames visibly floated off the face; 6 mm reads better.

## Open

- Art review of rim thickness (raised to about 12% of lens diameter, per the
  reference) and of frame height against H02's brows.
- Lens tint or glare, if wanted.
- Glasses combined with A01/A02 headwear and with the hoods.
