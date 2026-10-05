# B01 — navy straight trousers retrospective

Status: authored candidate with verified fitting; final palette-A style acceptance and runtime catalog registration remain open.

Reference: `assets/avatar/concepts/2026-10-04/catalog-a/02-bottoms.png`, B01. Editable master: `B01.blend`. Separate garment and masked-body exports: `B01.glb`, `body-B01.glb`.

The trousers use an authored quad pelvis with a shared crotch fork and two leg lofts. They include a waistband, rounded patch pockets, front pocket openings, fly, button, belt loops and hem trim. One subdivision level gives 8,318 vertices and 8,298 polygons, versus 23,454 vertices at two levels. Twenty-four named groups and at most four normalized influences match the common rig.

The initial waist mask removed visible skin below the open waistband and produced a ragged edge. Preserving the upper waist corrected it. Back pockets initially followed an approximate analytical surface; projecting their smoothed geometry onto the actual finished trousers keeps them against the fabric. All stitched details inherit the nearby trousers' final weights.

Independent fitting missed a combination defect: B01's waistband/loops protruded through T01's smaller hem. The combined outfit review caught it immediately. T01 gained measured waist ease, and both garments now share pelvis deformation in their overlap. Subdivision had blended leg weights upward into the shirt above the waistband; restoring Hips-only weights after smoothing removed the remaining running contacts with the rigid belt loops.

Latest proof: `motion-sweep-4x.json` samples 163 poses spanning both complete walk/run clips, including fractional endpoints and quarter frames. B01 has zero body contacts. `../outfits/T01-B01/motion-sweep-4x.json` also has zero body and garment-layer contacts. The outfit GLB round-trip comparison checks rest and 13 representative animated poses; its report is `../outfits/T01-B01/export-deformation-report.json`. Desktop rest/walk/run and phone run use the actual Three.js renderer with candidate GLB substitution; no production asset has been replaced.

Apply to the next piece: test combinations before acceptance, keep seam attachments in the same deformation space as the surrounding fabric, inspect the final smoothed weights rather than only the control cage, and normalize the body as well as garments before comparing Blender fitting with glTF. The shared outfit assembler combines reversible coverage masks by original body vertex index and asserts unchanged foundation topology.

Still open: reference silhouette/material refinement, polygon-budget review, shoes/waist layering against other catalog items, final head/body art and expressions, and actual runtime bottom-slot registration.

## Sneaker cuff fit — current fitting revision

The F01 combination exposed shin-only cuffs rotating away from the shoe collar. After subdivision, cuff weights now blend up to 50% anatomical Foot at z<=0.160 m, fading out by z=0.240 m. Details inherit these final weights. The shared run applies at most 0.10 radians of lower-leg relief only during deep back-kicks, avoiding the heel folding into the trouser leg. The walk is unchanged by this addition. Capture numeric weight-group indices before removing Blender RNA entries, and keep local weight dictionaries distinct from the weights(p) function.

Independent and four-piece 163-pose checks have zero body/layer contacts. The authoritative current combination and source/export/browser evidence is `../outfits/T01-B01-F01-A01/verification-summary.json`; the earlier two-piece reports are historical. The current export comparison is within 6.07 micrometres across rest and 13 animated poses. Fit with remaining shoes/bottoms and actual bottom-slot registration remain pending.

## F04 fitting studies — 2026-10-04

Canonical B01 is preserved. Separate tall-footwear and raised-loop cuff studies
retain the original rest design, add triangle-surface ankle/rear-hip weights,
and use independent neutral-basis knee corrections. The 12 mm rear-ease study
leaves 95 raised-loop/cuff contacts; 30 mm maximum posterior ease clears all
walking poses and leaves eight loop/rear-thigh contacts at run 7.25. A local
4 mm cloth compression target passes a further separate study: 163 body/layer poses clear, side isolation passes, and sixteen-pose exported/actual Three.js comparison has a combined 7.623 micrometre bound. Promote only after source-bound fit/export/runtime proof and refresh
every affected B01 outfit rather than keeping stale summaries.
