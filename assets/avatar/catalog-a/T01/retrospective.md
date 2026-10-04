# T01 — blue crew tee retrospective

Status: **candidate, not accepted**. The complete catalog scope remains open.

Reference: `assets/avatar/concepts/2026-10-04/catalog-a/01-tops.png`, T01.
Current source: `catalog_tee_geometry.py`, an authored quad loft with a neck opening, torso, sleeve openings, short sleeves and cloth thickness. Editable master: `T01.blend`; separate garment and masked-body exports: `T01.glb`, `body-T01.glb`.

## What failed and what changed

The inherited shirt mesh had 17,498 split vertices. Decimating it without welding destroyed the surface into disconnected triangular fragments. Controlled import/decimate/shrinkwrap renders localized the break to decimation. Welding fixed fragmentation, but the inherited collar/hem shape remained ragged and did not match the reference; that approach was rejected.

The canonical body initially had 48 groups: Blender 5.1 already carries group definitions with Mesh.copy(), so recreating them produced unused `.001` duplicates. Preserving the existing groups corrected this to 24 without changing rest geometry (maximum displacement 0.0000001333 m).

The authored tee has controlled, smooth openings and a higher reference-like hem. Nearest-body weight transfer wrongly attached loose torso panels to arms. Authoring region-aware torso/sleeve weights fixed the raised-arm wings. Hem and cuff clearance were increased from measured body sections. The master explicitly limits and normalizes weights to four influences so Blender and glTF agree.

## Evidence and remaining failure

- 11,448 vertices / 11,424 quads; 24 named groups.
- Selected rest/front, rest/side, run frame 8 and raised-arm tests had zero BVH triangle-pair contacts. This does **not** prove full-cycle fit.
- Every integer frame was swept: 25 walk frames and 16 run frames. Run frame 5 is the worst (1,145 triangle-pair contacts); walk frame 13 has 455. Remaining hem/neck/cuff contacts and visible back-edge artifacts require correction on the final body and combined outfit.
- Five GLBs passed Khronos validation with zero errors, but each has one non-root skinned-mesh warning; body exports also have an unused-UV info. These warnings are recorded, not counted as a clean validation pass.
- Actual Three.js candidate substitution rendered on desktop (rest/walk/run) and phone (run), with no page/console errors or failed GETs. Availability HEAD requests were aborted by the app cleanup and are recorded separately in the report. Screenshots show actual run deformation. No published assets were replaced.
- All inspected review images are 320px wide. Reports and images live under `artifacts/verification/avatar-catalog/T01/`; full motion report is `motion-sweep.json`.

## Apply before the next piece

1. Use authored garment topology instead of repeated fitting of irregular generated meshes.
2. Preserve copied Blender group data; assert expected group count and normalized weights.
3. Use garment regions for weighting loose geometry, not nearest-body transfer alone.
4. Run all motion frames and three views of the worst frame; selected pretty frames cannot establish acceptance.
5. Use `--python-exit-code 1`: Blender otherwise exits zero on script exceptions.
6. Establish the catalog-style head/body before accepting garments, then recheck this tee and every later piece on that final body.

The current tee is a useful editable construction candidate, not a finished catalog asset. Missing: exact collar band/seam finish, final reference silhouette, corrected full-cycle coverage and final runtime catalog integration.

## Styled-foundation follow-up

T01 was rebuilt on the H01 styled body candidate. The masked-body export now preserves the independent head and avoids duplicate copied weight groups. Its latest selected-pose contacts are 84 at rest, 506 at walk frame 13 and 18 at run frame 8; the full-cycle worst is run frame 5 with 1,113 pairs. The earlier zero-contact selected frames refer to the previous scaffold revision, not this final-body candidate. It remains unaccepted.

T01 and its combined body export now validate with zero errors/warnings/infos/hints after root-level skin export and omission of unused UVs. Exported material checks and desktop/mobile renderer checks confirm the corrected H01 eyes and hair colors. Full-cycle coverage, collar finish and final style matching still remain open.

## Fit correction — 2026-10-04

The full-frame diagnostic now preserves original body vertex indices and classifies contacts by bone. Neck contacts came from mismatched collar/neck weights and an over-aggressive neck mask. The collar now follows the constructed neck blend and the full neck is preserved. Torso-only measurements reduced excessive shirt width. Persistent rear-hem contacts came from hip corners falling outside an ellipse; a rounded superellipse clears them while a nearest pelvis-weight proxy lets the hem follow the body's hip/upper-leg blend. Subtle collar/cuff/hem trim now matches the reference construction.

Original Meshy run frames 5/6/13 also had hand/forearm intersections with the unclothed torso. Cleaned joint positions matched the original to <1 micrometre, ruling out retargeting loss. Shared arm-spacing correction was baked into clean motion candidates: walk 0.10 rad (~5.7°), run 0.35 rad (~20.1°), about the body's front/back axis. Rest rig, gait, durations and all non-upper-arm quaternion curves are retained. No hands or forearms are hidden to make this pass.

Latest `motion-sweep.json`: **zero garment/body triangle-pair intersections at every one of the 25 walk and 16 run integer frames**. Selected rest/front, rest/side and raised-arm checks also have zero contacts. This is stronger fit evidence than the earlier selected frames, but final exported/runtime proof, subframe proof, styled-foundation acceptance and combination checks still remain necessary before shipping.

Apply before B01: measure body sections by region; preserve opening anatomy; classify full-frame contacts; validate source-motion self-contact before fitting around it; reuse the corrected motion foundation instead of treating every clothing collision as a garment defect.

## Combined outfit and export parity — latest revision

The original full-frame pass was superseded by a denser combination check. B01's waistband and belt loops intersected the tee: 857 triangle pairs at rest and over 1,000 at selected motion frames. The hem now has enough ease over the waistband, and the overlap uses shared pelvis weights. Nearest-body hem sampling was removed because loose cloth acquired small arm influences. Subdivision blended leg weights upward into the shirt above the waistband; explicit post-subdivision Hips weighting in that overlap removed the remaining belt-loop contacts.

The wider hem met the left hand at run frame 12.75. A diagnostic classified the contacting anatomy as LeftHand, and an additional 0.05 rad of arm spacing cleared every quarter-frame sample. The final shared corrections are walk 0.10 rad (~5.7°) and run 0.40 rad (~22.9°). Hands/forearms remain visible.

The source/export deformation comparison then caught up to 0.73 mm of body displacement because glTF truncated the original body's extra influences. The styled fitting foundation now also uses the four largest normalized weights. This keeps Blender clearance measurements aligned with the exported asset.

Latest `motion-sweep-4x.json`: 163 samples over both complete clips, with **zero body contacts**. The combined T01/B01 report also has **zero body and layer contacts**. Export comparison, material checks and fresh desktop/mobile browser evidence are recorded with the outfit. Earlier failed contacts above describe historical revisions, not the current master.

T01 is a fit-verified candidate. Final reference silhouette, styled head/body acceptance, polygon budget and runtime catalog registration are still open. The current source includes collar, cuff and hem trim. Use complete cycles, subframes, combination checks and source/export parity for every later garment.

## Shoe/cap combination — current fitting revision

T01 was rebuilt on the shared foundation with conditional deep-knee run relief. Its fresh independent 163-pose sweep and the full T01/B01/F01/A01 sweep are clear against both body_underlayer_male and H01_head. The four-piece GLB comparison agrees with the editable master within 6.07 micrometres. `../outfits/T01-B01-F01-A01/verification-summary.json` now binds these reports to current source/export/browser hashes and supersedes the historical two-piece proof. Final style/budget and real slot integration remain open.
