# H01 painted-face study

Status: isolated texture-ready candidate. Final style, head size, hair volume,
expressions, headwear compatibility and slot registration remain open. Sources:
`H01.blend`, `H01.glb`, `outfit.glb` in this directory. Builder:
`tools/blender/catalog/build_catalog_head_texture_study.py`; face texture:
`node tools/avatar/paint_catalog_face.mjs --face=H01`.

The 2026-10-05 reference audit (`docs/audits/2026-10-05-avatar-reference-audit.md`)
found the reference-A head startled and unlike the Genmoji style: white sclera
discs with small irises, a thin raised mouth line and a vertex-color beard that
read as a smudge. This study keeps the reference-A face surface, ears, nose and
hair exactly as built there, and replaces the modeled eyes, irises, pupils,
highlights, brows, smile, lower lip, moustache and the vertex-color stubble with
one painted texture on a lat-long UV layer (`canonical-face-layout.json`).

The painter draws eyes, brows and lips as a front view in head millimetres and
samples each texel orthographically from its actual surface point, so the face
looks as drawn from the front. The full short beard is a surface layer: a nearly
level cheek line at the nose tip that rises to sideburns in front of the ears,
with a denser moustache band and per-texel grain. The whole head surface uses
the `face_surface` material; ears, nose and hair keep their untextured skin and
hair materials, so no COLOR_0 tint remains.

## Iterations

1. The first beard edge ramped up across the whole cheek to 1.62 m, just under
   the eyes, and wrapped to within a few degrees of the ears: a V-shaped mask in
   front view. Leveling the cheek line and starting the sideburn rise at 96 mm
   from the centre fixed it.
2. A cleared oval around the lips read as a muzzle; the reference beard meets the
   lips. The lips are now drawn over the beard.
3. Eyes measured 0.20 of face width against 0.26 in the reference; they are now
   1.15× larger about the same centres.
4. Primitive sphere UVs from the ears, nose and hair exported as an unused
   TEXCOORD_1 on every primitive. The builder now removes them before joining.

## Verification (fresh, current hashes)

- `H01.blend` a8c0756d…efec0, `H01.glb` a3335412…fe119, `outfit.glb`
  b741ea77…3639b, face PNG 46ca6e78…3d451.
- `rigidity-and-reimport-report.json`: 41 walk/run frames and three extreme head
  poses stay rigid to Head within 20 µm; reimport nearest-vertex error 0.19 µm;
  one UV layer survives export.
- `face-transport-report.json`: embedded PNG matches the source, TEXCOORD_0 on
  the face primitive, reciprocal rest-position + corner UV identity, and a UV
  permutation that keeps the multiset is rejected, then restored.
- `head-top-fit/`: head versus T05 passes 163 quarter-frame walk/run poses with
  zero body and layer contacts.
- `head-material-proof.json`, `outfit-material-proof.json`: exported materials
  pass with no COLOR_0 tint. `export-validation.json`: zero Khronos errors or
  warnings; 3 and 7 informational unused-UV notices on untextured primitives.
- `node tools/avatar/verify_model_studies.mjs --asset=h01-painted-face-head
  --asset=study-h01-painted-face`: 4 desktop/phone cases pass on two consecutive
  runs. One earlier run, started while the GLBs were being rebuilt, failed and
  was not counted.

Head 32,556 vertices / 32,798 polygons, down from 38,018 / 38,414 in reference-A
because the modeled features are gone. The body, rig, garments and walk/run
curves are asserted exact by the builder.

## Limits and next

The head is still about 20% small against the reference (5.8 heads tall versus
4.5) and the hair is the flattened reference-A helmet. Both belong to the
head-size/hair step, which also changes hood, collar and cap clearance. No
expression textures, real selfie or production slot yet.

Apply next: author faces in the painter, not as modeled spheres; keep feature
extents inside the textured region and check front, three-quarter and side at
320px before any fit run.
