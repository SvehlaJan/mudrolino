# Female foundation and H02 envelope study

This isolated candidate establishes an average adult foundation, a reusable texture-ready head, and separate shoulder-length matte brown hair. It is not accepted for production and includes no fitted wardrobe. The source, GLBs and four 320px review views are retained beside this report. No real selfie, identity mesh, paid generation or personalization endpoint was used.

## Outputs and source identity

- `female-foundation.blend`: authoritative editable source, SHA-256 `6641df23fb90d451cc8a3f0ef2ef0c98fc23204e6c0930338f7acb1893ee8a58`.
- `female-foundation.glb`: body, head, hair and compatible shared skeleton; SHA-256 `b964b77934ad743c2b125f3f4e785016fdad77366b94fb6c7a8c5f2d471847d5`.
- `H02.glb`: head and hair attached to Head; SHA-256 `efe33ead4bb0029ae159a7b42f446fb2ef427518701cd284bcf08c9f6ef41d35`.
- `hair-H02.glb`: separate Head-bound hair; SHA-256 `5e36d5ab54e04ffa9fb398759d55c1cb8dcd3972a2193597c30fbc064cc8edae`.
- `canonical-face-layout.json`, `canonical-face-mask.png`, `sample-face.png`: reusable UV layout, feathered mask and the painted fictional default face (see below). Head material slot 1 is `face_surface`; this slot index refers to the Blender head mesh, not a global GLB material index.
- `front-review.png`, `side-review.png`, `three-quarter-review.png`, `back-review.png`: 320×400 review views.

The original foundation `assets/avatar/catalog-a/foundation/catalog-body.blend` remains unchanged at SHA-256 `43f39d4f7530cc3ce569e8c6a37bd1300e5c98cb35d9e5f41e0f7ca46c771897`. The body retains its 45,653 source vertices, original order, face topology, weights, rest/bind matrices and 24-bone metre-scale skeleton. The local torso contour changes are intentionally recorded as a new geometry signature. `female_original_vertex_index` preserves the original body index for later coverage work. Existing shared walk/run actions are unchanged, so the full foundation can use shared gait clips. The standalone head/hair exports have no independent gait role.

## Painted default face (2026-10-05)

The diagnostic fixture (tiny eyes, hairline smile, calibration grid) read as a blank
mannequin next to the reference. `sample-face.png` is now a painted Genmoji-style
face from `node tools/avatar/paint_catalog_face.mjs --face=H02`, copied from
`assets/avatar/catalog-a/faces/H02-default.png` by the builder's `--face-image`.
Large brown irises with highlights, lash line and outer flicks, arched brows,
soft nose shading, a salmon closed smile and blush stay inside the face region
and mask. Geometry, hair, body, rig and actions are byte-identical
(`hair-H02.glb` unchanged); only the head image and the files that embed it changed.

The first painted pass placed the eyes too low and small; raising the eye line
15 mm and making the eyes 22% taller fixed the tall-forehead look. Eye width is
bounded by the face material region (about 54° either side of the front), so
height, not width, carries the larger eye. The previous outputs are kept in
`history/diagnostic-face/`.

Fresh proof on the new bytes: the comprehensive verifier passes (163 motion and 6
gesture hair samples with zero pairs, 16-pose export bound, UV corner identity,
negative permutation rejected), all three material reports pass, and
`export-validation.json` has zero Khronos errors or warnings. The female
T02/B01/F01 outfit was rebuilt on this foundation (garments byte-identical) and
its runner passed all 15 gates fresh; `verify_model_studies.mjs` passed 6
desktop/phone cases for the foundation, head and outfit.

## Fresh verification and exact limits

`foundation-verification-report.json` is the source-bound comprehensive result. Focused hair, deformation and face-transport reports are extracts of that same run, not extra independent passes.

- All 163 quarter-frame walk/run samples, including exact clip endpoints, and six rest/head gestures report zero hair/body triangle intersection pairs. These gates cover the naked foundation's hair/neck/shoulder envelope; they do not establish headwear or wardrobe fit.
- Hair remains rigidly attached to Head within 20µm under the six gestures. Each head/hair vertex has exactly one Head influence. Body weights have at most four influences and maximum sum error `5.21540641784668e-08` against a `1e-6` limit.
- All 16 rest/walk/run export poses pass bidirectional rendered-vertex comparison. Maximum error is `1.0426554126752308µm`, below the strict 30µm limit. Loose authoring vertices are excluded from this rendered-surface comparison.
- The face material retains `TEXCOORD_0`; its embedded PNG exactly matches the painted face SHA-256 `2d33776a14f49c09d6be7152f1586fa5a272db303057f8e9233e0000dd67710e`. Reimport must preserve reciprocal rest-position plus UV corner identity at 30µm position and `1e-6` UV tolerance. Seams admit only UV values present at that same source position. A negative imported-layer UV swap preserves the UV multiset but must fail this correspondence gate, then the original UV data are restored and rechecked.
- All three final GLBs pass Khronos validation with zero errors and zero warnings. Retained informational unused-UV notices are 2/1/0 for foundation/head/hair. UVs on untextured skin are harmless for this study and preserve a reusable layout.
- All three final GLBs pass exported material verification with no `COLOR_0` tint multiplying the intended material color. `export-validation.json` and the three material reports record exact target hashes.

The technical gates do not establish final silhouette/style acceptance, expressions, body self-collision, real-selfie generation/transport, personal likeness, wardrobe/headwear fit, runtime browser behavior, performance budget or production acceptance. Those remain explicit next work. Source counts are head 1,986 and remeshed hair 22,932 vertices; optimization should follow visual acceptance rather than be inferred from validator success.

## Preserved experiments and lessons

The initial hanging hair failed the dense run sweep with 77 intersection pairs. A quadratic side lift still failed with 39 right-arm contacts. A linear absolute-cosine side lift cleared all sampled motions but left visibly separated finger-like locks; that technical pass is preserved under `history/segmented-locks` as a visual rejection. Joining them with a continuous rear shell initially introduced six upper-back/shoulder intersections and a visible scalp ridge; that source and failed report are in `rejected-rear-shell-offset`. The final shell sits inside the scalp cap at its top and shifts its lower rear envelope 25mm posteriorly. This removes the ridge and passes the full sweep without altering the body, rig or actions.

A successful rest render cannot establish posed clearance. Locate contact regions and dominant bones first, adjust the hair envelope locally, and repeat the complete dense sweep after any visual shell change. Joining already passing locks can create fresh collisions. Keep fit evidence separate from visual acceptance and retain failed candidates rather than overwrite their proof.

The UV-preserving head export deliberately differs from the garment profile that omits texcoords. An unordered UV-set comparison was inadequate: valid UV values can be assigned to the wrong face corners. The verifier now checks geometry and UV jointly with reciprocal coverage, and includes a permutation rejection probe. This proves this diagnostic asset's texture transport only; building a selfie workflow requires separate 2D generation and runtime evidence against the same canonical layout and mask.

## Reproduction

From the repository root, every Blender command must use the shared queue. No nested queue wrapper is needed.

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_catalog_female_foundation_study.py --source assets/avatar/catalog-a/foundation/catalog-body.blend --output-dir assets/avatar/catalog-a/female/foundation/studies/h02-envelope --review-dir artifacts/verification/avatar-catalog/female-foundation/h02-envelope
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/verify_catalog_female_foundation_study.py --blend assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.blend --glb assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.glb --output-dir assets/avatar/catalog-a/female/foundation/studies/h02-envelope
node tools/blender/catalog/verify_exported_materials.mjs assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.glb
node tools/blender/catalog/verify_exported_materials.mjs assets/avatar/catalog-a/female/foundation/studies/h02-envelope/H02.glb
node tools/blender/catalog/verify_exported_materials.mjs assets/avatar/catalog-a/female/foundation/studies/h02-envelope/hair-H02.glb
```

`study-report.json` records the exact builder hash and parameters; the comprehensive verifier records its own hash. Reports are evidence for these exact source/export bytes and need rerunning after technical asset edits. The final continuous rear hair pass ends this bounded study; further style iterations are deferred to explicit review.
