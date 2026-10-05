# Blender avatar catalog implementation plan

**Resume pointer (2026-10-04):** `docs/avatar-workflow.md` and
`assets/avatar/catalog-a/catalog-progress.json` hold current priorities/status.
Milestones below retain their historical proof scope; later corrective audits
supersede older passing status. Selfie personalization uses a 2D texture on a
reusable head; prove a texture-ready head before expanding headwear.

**Goal:** Build the selected palette-A 3D catalog in Blender, preserve its visual style, and verify every wearable on the body through animation.

**Architecture:** Use one normalized, saved canonical rest rig/body as the fitting source. Each piece has its own Blender source, separate GLB export, reference ID, deformation evidence and retrospective. Keep candidate assets separate from published assets until their visual and runtime checks pass.

**Scope:** T01–T06 tops, B01–B04 bottoms, F01–F04 footwear, A01–A06 accessories, H01–H06 face/hair references, and the catalog-style character. Selfie processing remains a separate product feature; these heads establish the 3D visual target.

## Foundation

- [x] Create isolated `feature/avatar-catalog` worktree and copy the approved reference catalog.
- [x] Verify clean unit baseline: 14 files / 84 tests.
- [x] Normalize original rig and body to metre-scale identity object transforms, keeping joint names and original rest orientations.
- [ ] Save editable canonical source and export/reimport it; prove rest geometry and skinning survive.
- [ ] Create walk/run and raised-arm pose QA using the same source rig. Retain source motion, clean final clips and remove all imported reference geometry.
- [ ] Match the character head/body silhouette to the selected reference, then create the face/hair masters.

## Per-piece loop (repeat for all catalog IDs)

- [ ] Build the piece from its reference using category-specific topology: garment openings/loops, rigid footwear regions, head-attached accessories, or sculpted hair masses.
- [ ] Fit it to the canonical body; author conservative covered-body regions and bind weights or rigid attachments.
- [ ] Save `assets/avatar/catalog-a/<id>/<id>.blend` and export `public/avatar/catalog-a/<id>.glb`.
- [ ] Validate exported structure, stable skeleton/binds, expected mesh count, vertex weights, geometry budget and source provenance.
- [ ] Inspect at most 320px review renders from front/side/back and selected walk/run/raised-arm frames. Fix clipping, disconnection, deformation and reference mismatch before accepting the piece.
- [ ] Verify the exported piece in the actual Three.js slot renderer on desktop/mobile, including motion and masking behavior.
- [ ] Write `assets/avatar/catalog-a/<id>/retrospective.md`: reference match, failures, fixes, final evidence, limitations and specific workflow improvement.
- [ ] Apply that improvement before starting the next piece. Update this checklist and ROADMAP.md.

## Category order

1. T01 tee establishes torso/sleeve fit and body masking.
2. B01 trousers establishes lower-body coverage and leg weights.
3. F01 sneakers establishes foot masking and rigid/controlled-toe motion.
4. A01 cap establishes head attachment and hair clearance.
5. T02 hoodie establishes bulk, hood and long-sleeve motion.
6. Remaining tops, bottoms, footwear and accessories reuse accepted category conventions, with unique sources and QA.
7. H01–H06 heads/hair complete the catalog likeness range, with consistent neck attachment and expression-ready design.

## Integration and completion evidence

- [ ] Register accepted catalog items and compatible source metadata; extend required slots while retaining the lazy renderer boundary.
- [ ] Run lint, unit tests, affected pure verifiers, `verify:edit` and integration for runtime changes. Record actual profiles/results.
- [ ] Compare every final asset against its selected 2D reference; inspect every per-piece retrospective and deformation proof.
- [ ] Verify the full catalog on the final body/rig; validate compatible combinations, unsupported combinations, no failed asset requests, slot switching and no leaked geometry.
- [ ] Preserve the complete objective until all catalog pieces and final combination checks have authoritative proof. No Meshy spending is authorized by this plan.

## Current evidence — 2026-10-04

T01 has an authored quad candidate and a retrospective; it is not accepted. Full walk/run frame sweeps exposed contacts missed by selected frame renders. Candidate exports render in Three.js on desktop/mobile with no console/page errors. The normalized fitting body has 24 groups and preserved rest geometry; final catalog character art remains open. Next priority is the styled character foundation, then full-cycle T01 fitting and B01/F01/A01 with per-piece reviews.

### H01 foundation progress

H01 is authored and independently exportable; body neck topology is connected to the actual scaffold boundary. All 41 walk/run frames and three head poses passed analytic rigidity checks, and GLB reimport retained geometry/weights/colors. H01 and combined exports validate cleanly. Renderer verification caught and corrected zero vertex-color modulation on unpainted features. The per-piece retrospective records remaining style/expression/geometry-budget work; H01 is not accepted as the final reference match. T01 was rebuilt with this styled foundation and its fit contacts remain open.

### T01/B01 fit milestone

T01 and B01 are independent authored, editable candidates. Both pass 163-pose quarter-frame sweeps alone and together with zero body/layer intersections. The styled fitting foundation uses four normalized influences; the exported outfit agrees with the evaluated master within 3.45 micrometres in rest and 13 animated poses. Eleven latest GLBs pass clean Khronos validation, exported face/hair color checks pass, and desktop rest/walk/run plus phone run render with no page/console errors or failed GETs. Browser availability HEAD cleanup is retained in its report.

The reusable assembler asserts the exact shared body topology/rest coordinates and unions original-index coverage masks. The motion reviewer now checks all garment layers. Per-piece retrospectives capture waist ease, post-subdivision pelvis weights, pocket projection, body/export parity and late browser preload waits. No candidate is published or finally style-accepted. Next: F01 footwear and A01 cap, then the remaining catalog and expression-ready head studies, followed by final reference/style and actual slot integration checks.

### F01/A01 fit milestone — current authoritative revision

F01 strap sneakers and A01 baseball cap are now independent editable candidates, with separate GLBs and per-piece retrospectives. F01 has 6,184 vertices; A01 has 4,364. The B01 cuff shares measured ankle deformation, and the shared run adds at most 0.10 radians of lower-leg relief during deep back-kicks. Eighty run curves and 88 walk curves remain exact; all masters were rebuilt on this motion foundation.

Each current piece and the four-piece combination passes 163 walk/run quarter-frame poses with zero body/head and layer contacts. The cap also passes six independent head gestures. Master-to-GLB agreement is within 6.07 micrometres across rest and 13 animated poses; 15 current GLBs validate cleanly, materials pass and desktop rest/walk/run plus phone run render without page/console errors or failed GETs. Availability HEAD cleanup is recorded. Authoritative proof: `assets/avatar/catalog-a/outfits/T01-B01-F01-A01/verification-summary.json`; historical subset proofs are explicitly superseded.

The workflow now uses `--require-clear`, source-hash motion metadata, all body/head meshes and all garment pairs, plus reusable browser and export-validation commands. See `tools/blender/catalog/README.md`. These are candidate rendering/fit checks; actual bottom/shoes/accessory slots and switching remain pending. No production assets were replaced. Next piece: T02 orange hoodie. The remaining 22 catalog concepts, final style/budget/expression review, per-head compatibility and final runtime integration remain required.

### T02 hoodie milestone

The orange pullover hoodie now has a separate editable master and garment/body GLBs, with a hanging lined hood, long sleeves, ribbed cuffs/hem and projected kangaroo pocket. A complete-cycle failure identified a coverage gap on the back of the elbow; overlapping joint regions fixed it while preserving hands/wrists. Reusable long-sleeve topology transfers only anatomical arm weights and excludes arm-influenced vertices from pelvis corrections. The per-piece retrospective records construction, failures, fixes and next-piece improvements.

Independent and T02/B01/F01/A01 sweeps each pass all 163 quarter-frame poses with zero body/head/layer contacts. Six separate head gestures clear the hood; six cap gestures clear the hoodie and other pieces. Bidirectional rendered-surface GLB comparison is within 6.07 micrometres over rest and 13 animated poses. Fifteen GLBs validate cleanly, materials pass and desktop/mobile motion renders without page/console errors or failed GETs. The default preview camera still crops the feet on mobile; complete runtime framing is open. Authoritative proof is in `assets/avatar/catalog-a/outfits/T02-B01-F01-A01/verification-summary.json`. The new `tools/avatar/summarize_catalog_proof.py` consolidates evidence only when current source/GLB/browser hashes match and all required cases are present. The earlier T01 outfit also has refreshed bidirectional export proof.

Five wearables are fit-verified candidates, with 21 other catalog concepts and final art/expression/budget/compatibility/runtime integration still required. Next: T03 ivory/navy raglan tee. No production assets were replaced and no Meshy credits were spent.

### T03 raglan milestone

The ivory/navy raglan tee uses the fitted tee shell with actual diagonal seam edges and authored sleeve materials preserved through subdivision. A review rejected the first weight-based sleeve color classification; topology-based identity removed the ivory armpit steps. Its retrospective is saved, and the shared `catalog_piece.py` driver standardizes the independent source/export/masked-body/review loop before the next piece.

Independent and T03/B01/F01/A01 sweeps each pass 163 poses with zero body/head/layer contacts. Fifteen GLBs validate cleanly, bidirectional exported surfaces agree within 6.07 micrometres over 14 poses, six cap gestures pass and desktop/mobile motion renders without errors or failed GETs. Source hashes and limits are in `assets/avatar/catalog-a/outfits/T03-B01-F01-A01/verification-summary.json`. Default mobile framing is still open. Six wearables are now fit-verified candidates; the other 20 concepts, final art/budget/expressions/head compatibility and actual catalog integration remain required. Next: T04 navy zip hoodie with orange lining.

### T04 zip hoodie milestone

The navy/orange zip hoodie has a separate source and garment/body GLBs, with projected zipper, cords and pocket openings. Dense body/layer checks passed, but a new detail-distance gate exposed nearest-vertex attachment drift. Barycentric surface weight interpolation smoothed the zipper and reduced pocket drift; the worst authored point then identified an oversized zipper pull, which was reduced/lowered. All 164 rest/walk/run detail poses now pass the unchanged 12 mm gate with a maximum distance of 8.03 mm. The retrospective and shared detail-transfer/coverage/checking helpers are saved.

Independent and T04/B01/F01/A01 fitting each pass 163 poses with zero body/head/layer contacts. Separate six-pose head and cap checks pass. Fifteen GLBs validate cleanly, 14-pose bidirectional export comparison is within 6.07 micrometres, materials pass and desktop/mobile motion renders without errors or failed GETs. Hash-bound proof: `assets/avatar/catalog-a/outfits/T04-B01-F01-A01/verification-summary.json`. Default mobile framing remains open. Seven wearables are fit-verified candidates; the other 19 concepts and final art/budget/expressions/head compatibility/runtime integration remain required. Next: T05 blue/navy sweatshirt, then T06 henley.

### T05 milestone

T05 has a separate editable master and garment/body GLBs with its per-piece retrospective saved. The shared sequential runner passed independent and combined 163-pose walk/run fitting with zero body/head/layer contacts, separate head/cap gestures, 15 clean GLBs, materials and 14-pose bidirectional export comparison within 6.07 micrometres. Fresh desktop/mobile rendering used the identity-matched existing production build; app source was unchanged and no new build was claimed. Any attached-detail proof is included in the current-hash summary at `assets/avatar/catalog-a/outfits/T05-B01-F01-A01/verification-summary.json`. 8 wearables are fit-verified candidates; the other 18 concepts and final art/budget/expressions/head compatibility/mobile framing/runtime integration remain required. Next: T06.

### T06 milestone

T06 has a separate editable master and garment/body GLBs with its per-piece retrospective saved. The shared sequential runner passed independent and combined 163-pose walk/run fitting with zero body/head/layer contacts, separate head/cap gestures, 15 clean GLBs, materials and 14-pose bidirectional export comparison within 6.07 micrometres. Fresh desktop/mobile rendering used the identity-matched existing production build; app source was unchanged and no new build was claimed. Any attached-detail proof is included in the current-hash summary at `assets/avatar/catalog-a/outfits/T06-B01-F01-A01/verification-summary.json`. 9 wearables are fit-verified candidates; the other 17 concepts and final art/budget/expressions/head compatibility/mobile framing/runtime integration remain required. Next: B02.

### B02 milestone

B02 has an independent editable Blender master, garment/body GLBs and a saved retrospective. Fresh independent and T01-B02-F01-A01 quarter-frame sweeps pass all 163 poses with zero body/head/layer contacts; attached pockets pass 164 detail poses with max separation 3.844 mm. Six cap gestures, 15 clean GLBs, materials and 14-pose bidirectional export comparison within 6.07 micrometres pass. Fresh desktop/mobile candidate rendering used the unchanged identity-matched existing production build. Current hashes and scope: `assets/avatar/catalog-a/outfits/T01-B02-F01-A01/verification-summary.json`. The new shared bottom shell accepts per-design ring dimensions; B03 must use a shorts-specific coverage function. 10 wearables are fit-verified candidates; the other 16 concepts and final art/budget/expressions/head/motion compatibility/full mobile framing/runtime integration remain required. Next: B03.

### B03 work-in-progress checkpoint

B03 has an editable master, separate GLBs and an active retrospective. Exposed folded shins/heels revealed contacts hidden by trousers. Current rolling-hem corrective fitting preserves thighs and the original gait, but both dense independent/combined collision gates and the strict morph/export gate fail; B03 is not in the ten fit-verified candidates. Shared projected details, native knee drivers, retargeted outfit bindings, a runtime updater and separate exported-target/Three.js-driver probes are implemented. The updater passed behavioral tests and fresh integration (472 browser tests), with the lazy production chunk preserved. Actual B03 rendering/GLB structure pass, which does not prove fitting. Next is exact morph-vertex round-trip diagnosis and rear hem/shoe clearance refinement, then all fitting/export/detail/runtime gates before B04. The complete catalog, final art/budget/expressions/compatibility/mobile framing/slot integration remain required.


### Shorts experiment review and independent catalog work

The current morph export gate is fixed by matching the glTF 0.0001 influence
cutoff in source normalization. The combined export/driver bound is 18.284
micrometres against the unchanged 30 micrometre gate. The six-iteration offline
body/shoe projection experiment diverged from 6,592 to 13,528 contacts and is
rejected. B03 remains open and requires a different pose-dependent deformation
approach. Proceed independently with B04 and other required catalog pieces;
this changes execution order, not the full scope or fitting requirements.

### B04 milestone

B04 has an independent editable Blender master, garment/body GLBs and a saved retrospective. Fresh independent and T01-B04-F01-A01 quarter-frame sweeps pass all 163 poses with zero body/head/layer contacts; attached details pass 164 poses with max separation 4.739 mm. Six cap gestures, 15 clean GLBs, materials and 14-pose bidirectional export comparison within 6.068 micrometres pass. Fresh desktop/mobile candidate rendering used the unchanged identity-matched existing production build. Current hashes and scope: `assets/avatar/catalog-a/outfits/T01-B04-F01-A01/verification-summary.json`. The shared bottom shell accepts per-design ring dimensions, and projected seam/pocket construction now avoids Bezier overshoot. 11 wearables are fit-verified candidates; the other 15 concepts and final art/budget/expressions/head/motion compatibility/full mobile framing/runtime integration remain required. Next: F02.

### F02 milestone

F02 has an independent editable Blender master, garment/body GLBs and a saved retrospective. Fresh independent and T02-B02-F02-A01 quarter-frame sweeps pass all 163 poses with zero body/head/layer contacts; attached details pass 164 poses with max separation 6.586 mm. Six cap gestures, 15 clean GLBs, materials and 14-pose bidirectional export comparison within 5.360 micrometres pass. Fresh desktop/mobile candidate rendering used the unchanged identity-matched existing production build. Current hashes and scope: `assets/avatar/catalog-a/outfits/T02-B02-F02-A01/verification-summary.json`. The shared bottom shell accepts per-design ring dimensions, and projected seam/pocket construction now avoids Bezier overshoot. 12 wearables are fit-verified candidates; the other 14 concepts and final art/budget/expressions/head/motion compatibility/full mobile framing/runtime integration remain required. Next: F03.


F02 adds ten actual exported corrective bindings. Native Blender/Three.js
driving agrees across fourteen poses, with a 5.842 micrometre combined geometry
bound. The soft heel tab folds against the actual rear upper, keeping its rest
design and the common gait. The rigid-tab revisions and attachment failures are
retained as fitting history. B03 is still open; completing F02 does not resolve
it. Twelve wearables are fitting candidates, fourteen catalog concepts and all
final style/budget/expressions/compatibility/framing/runtime work remain. F03's
taller ankle construction needs its own body coverage and clearance analysis.

### F03 high-top milestone and B04 compatibility revision

F03 matches its three-strap/tall-collar reference with an independent Blender
master and garment/body GLBs. The reference gallery now has thirteen sheets,
including footwear construction, worn accessories and H02/H03 turnarounds.
The F03 retrospective records contour fitting, triangle-surface skin weights,
face-safe coverage and the reproduced unsafe-mask regression. B04's original
source remains saved; its revised cuff/hip weights and knee-driven rear-panel
compression clear the intended high-top outfit without reducing the gait.

Fresh independent and T01/B04/F01/A01 plus T04/B04/F03/A01 sweeps pass 163 poses,
with details over 164 poses. Fifteen-pose export and actual Three.js corrective
proof includes run 7.25; combined bounds are 7.179 and 6.471 micrometres against
30. Six cap gestures, 15 clean GLBs per outfit, materials and four fresh
production-candidate browser cases per outfit pass against the unchanged,
identity-matched production build. Exact deep-kick visual review binds its zero
contacts and corrective values to the verified current source. All evidence is
in the current outfit summaries and per-piece retrospectives.

13 wearables are fit-verified candidates; accepted IDs remain empty. The other
13 concepts and full final style/body/heads/budget/expressions/compatible
combinations/motions/mobile framing/runtime registration/switching remain
required. B03 deformation is open. Next: F04; apply the measured tall-footwear
and exact-pose workflow before building it.

## Updated goal — female character phase

The user extended the objective after F03: when the current catalog and assets
are complete, generate a catalog and assets for a female character as well.
This is required completion scope. Keep the full current twenty-wearable/six-
head catalog, final body/style/budget/expressions/combinations/runtime work open;
the female phase does not replace any unfinished current requirement.

After current acceptance, create a female reference catalog in the same approved
palette-A Genmoji-like style. Use the existing H02/H03/H05 feminine identity
studies to inform the default female character and supported hair/head range.
Author a separate female body/rig, then corresponding fitted variants of all
twenty wardrobe/accessory concepts. Shared item IDs may map to per-base sources
and exports; a recolor or uniform male-body rescale is not fitting proof.

Apply the same per-piece retrospective/improvement loop and reference, opening,
attachment, complete body/layer animation, native/exported deformation, actual
runtime slot switching, compatible combinations, material/geometry budget,
expressions and desktop/mobile framing checks. The updated goal remains
incomplete until both phases have current authoritative evidence. Progress and
female requirements are recorded in `catalog-progress.json`.
