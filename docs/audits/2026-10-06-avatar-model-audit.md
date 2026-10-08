# Avatar model audit and improvement priorities

Reviewed 2026-10-06. Purpose: compare the current catalog with its approved 2D references, identify which models need improvement or repair, and distinguish missing designs from missing fitted variants. The user chose **reference-matching proportion proposals for review first**; this does not approve a head resize or promote any model.

The recommendation is to finish **T01, T02, B01 and F01 on both bases** before expanding the wardrobe. Seven of these eight fitted variants exist. Female T01 is missing. Use exact O01 (T01/B01/F01) and a separately named T02/B01/F01 capsule for comparison; the latter is not O02.

## Coverage and evidence

- All **43 curated designs**, including reference-only designs, were inventoried: 39 revision links, 36 distinct raw asset IDs and 28 modeled per-base variants. Twenty designs have no model on any registered variant.
- Fresh browser captures cover **52 distinct model/garment/motion scenes**: all 43 raw entries marked current plus every curated revision, deduplicated by the actual model/garment/clip combination. This includes current female pieces whose raw Archive entries are classified as historical because of their study paths.
- Four views per scene: front, three-quarter, side and back. Reviewed 320px front/back boards and focused reference/model pairs and detail views. Walk/run were captured paused in motion; this is not a new motion-style approval or collision sweep.
- The visual manifest records 71 source links spanning 65 unique GLB files, their SHA-256 hashes, scene origins and console/request results. Captures completed with zero unexpected errors or failed requests. Stream-reader cancellations are retained; the capture is not a full transport acceptance gate.
- A separate static inventory covers **all 189 GLBs** under `assets/avatar` (537.3 MB total), including retained failures and intermediate exports. Every GLB declared byte length matches the file. This is a JSON/header/mesh-count inspection, not a fresh Khronos validation or native fitting gate.
- Existing technical reports were read and their recorded source hashes checked. No model, source sheet, rig, animation or acceptance metadata changed. Historical failures were not rerun or silently promoted.

Evidence directory: `artifacts/verification/avatar-catalog/2026-10-06-model-audit/`. It contains `manifest.json`, `glb-inventory.json`, seven `board-*-review.png` files, focused `pair-*.png` comparisons, individual review images, raw captures and the audit's `capture.mjs` script. All inspected review images are at most 320px wide.

Reproduce the browser capture against the development viewer:

```bash
node artifacts/verification/avatar-catalog/2026-10-06-model-audit/capture.mjs \
  --out=artifacts/verification/avatar-catalog/model-audit-new-run
```

The output is ignored local evidence; preserve this dated run. Run from the repository root. The default loopback viewer is port 3004; override with `CATALOG_PREVIEW_URL`.

## What changed since the previous audit

The painted H01/H02 faces are working improvements. The current H01 has dark highlighted eyes, painted brows/beard and a smile; H02 has a painted face instead of the diagnostic dots. Repeating the earlier diagnosis of tiny diagnostic eyes or large modeled white eye discs against these preferred revisions would be wrong.

The remaining common weakness is **silhouette and construction**. The heads read small in full-body views, H01 has a broad round lower head and large projecting nose, and H02 hair reads as a smooth pointed cowl rather than parted, shoulder-length locks. T02/T04 have shallow raised shapes instead of the recognizable lowered hood bowls. Bottoms and footwear have recognizable colors but weaker ease, edge thickness and broad construction details than their references.

Color is substantially improved by the existing neutral renderer. Back views naturally render darker than front views; do not compensate by changing reference-matching material colors from a back-view screenshot alone.

## Priorities

- **P0 — unblock reliable decisions:** reconcile reference conflicts, identify authoritative proof, propose head/body proportions for review and freeze the chosen target.
- **P1 — first paired capsule:** improve H01/H02 and T02/B01/F01, add female T01, then rebuild exact O01 and the hoodie capsule on both bases. Refit headwear after head/hair approval.
- **P1 repair / P2 expansion:** B04, F02 and B03 remain blocked by measured failures. Repair them before accepting the outfits that depend on them. They can be investigated independently of the first capsule.
- **P2 — complete existing designs:** T04–T06 detailing, B02, F03/F04 compatibility, A01 and exact outfits enabled by these pieces.
- **P3 — new range:** missing accessories, remaining female fits, hair identities and expressions, after the reusable standards settle.

Priorities are the proposed delivery order, not a claim that lower-priority assets are acceptable now.

## Wardrobe: every design and fitted base

“Recorded fit” means sampled technical evidence, not art or product acceptance. Female “capsule proof” is the current native-and-runtime study proof. No accepted IDs exist.

| ID | Existing male / female | Visual work or addition | Technical constraint / priority |
| --- | --- | --- | --- |
| T01 blue tee | Male recorded fit; female missing | Keep the design. Round sleeve openings and hem, improve relaxed drape/crew rib and remove the visibly boxy edge. Add female fit from the same design. | P1 paired capsule; new female source, coverage and native/runtime proof. |
| T02 orange hoodie | Male recorded fit; female capsule proof | Highest garment priority: fuller lowered hood on both bases, rounded thick cuff/hem, clearer pocket opening. Preserve **no drawstrings**. | P1 after head/hair target; female hood art explicitly remains changes-requested. Check head/hair, sewn/free hood surfaces and own-shell fit. |
| T03 raglan tee | Male recorded fit; female missing | One of the closer matches. Keep panel layout; soften neck/sleeve rib and hem. Add female fit later. | P2 refinement / P3 female extension; avoid a full redesign. |
| T04 navy zip hoodie | Male recorded fit/details; female missing | Fuller lowered hood with visible orange lining, rounded hem/cuffs and readable ivory zipper. Do not add dangling strings. | P2 after head target; prepare a dedicated construction guide before the new female fit. |
| T05 blue sweatshirt | Male recorded fit; female missing | One of the closer matches. Thicken/readably round navy rib bands and add modest body ease. | P2; selected F04 core uses it, but is not complete O05. |
| T06 ivory henley | Male recorded fit/details; female missing | Larger readable placket/buttons and orange collar facing; current buttons appear tiny. Resolve **three versus four buttons** first. | P0 design reconciliation, P2 model revision; recommend the corrected four-button outfit target, subject to design review. |
| B01 navy trousers | Male recorded fit; female capsule proof | Relax straight legs; make waistband, button/fly and broad pocket openings readable. Keep understated detail. | P1 both bases. Final cuff/hem fit follows footwear dimensions. F04-compatible B01 studies are separate from canonical B01. |
| B02 blue joggers | Male recorded fit/details; female missing | Stronger gathered volume above navy cuffs, elastic waistband and relaxed leg silhouette. | P2; no hanging drawcords. Female variant still needs authoring. |
| B03 navy shorts | Male repair needed; female missing | Rounded hem, waistband/button/pockets and subtle orange inner facing. | P2 blocked: opposite-side corrective leakage plus body/shoe contact. Repair keys before evaluating the remaining collisions. |
| B04 ivory trousers | Male repair needed; female missing | Clear waistband/button/pockets and rolled ankle cuffs; refine taper. | P1 technical repair, P2 art. Old passing collision sweeps do not override failed side isolation; rerun sneaker/high-top combinations. |
| F01 strap sneakers | Male recorded fit; female capsule proof | Broader ivory strap, clearer rounded toe cap, sole edge and padded opening; reconcile shoe volume with the body. | P1 both bases. Current design is usable construction, not a reason to restart from scratch. Recheck B01 cuff/ankle openings. |
| F02 navy slip-ons | Male canonical failure plus isolated repair; female missing | Keep the close slip-on silhouette. Improve padded collar/toe/sole readability and orange tab after repair. | P1 technical repair, P2 visual. Isolated side fix still has heel-tab own-shell contact; do not promote it. |
| F03 high-tops | Male recorded fit/details/opening; female missing | Keep **three** ivory straps. Round/thicken padded navy collar, sole and toe edge. | P2; dependent B04 outfits need fresh repaired-source proof. Preserve face-safe ankle coverage. |
| F04 orange boots | Male independent candidate and isolated outfit; female missing | Retain orange/navy design; refine rounded toe, panel shape and the thin raised heel-loop silhouette. | P2. Independent loop fit passes; F04-compatible B01/core study is not canonical promotion or O05. |
| A01 orange cap | Male recorded fit on earlier head; female missing | Preserve palette/rear strap; review crown and brim volume on the chosen head. Fit to both bases. | P2 after head/hair freeze; old six-gesture clearance cannot approve changed heads/hair. |
| A02 navy/blue beanie | Missing both | Add dome and blue folded cuff from existing construction references. | P3, first new accessory; completes O05 after B01/F04 proof. Head/hair and gesture clearance required. |
| A03 navy round glasses | Missing both | Add broad readable round frames with simple arms. | P3 after face/head shape; bridge, temples, ears/hair and head gesture fit. |
| A04 blue soft-square glasses | Missing both | Reuse the accepted glasses attachment convention with the distinct frame shape. | P3 after A03. Each head fit still needs evidence. |
| A05 orange backpack | Missing both | Add rounded body, navy straps and orange carry loop. | P3, before exact O06; shoulder/arm gait and top/back/strap layer checks. |
| A06 ivory loop scarf | Missing both | Add loop volume and navy front panel from the construction sheet. | P3 after neck/hood envelope; check chin, neck, hair, tops and arm motion. |

There are **22 missing wardrobe fitted variants** across the intended two-base scope: five male accessories and 17 female variants. A geometrically shared accessory may reuse construction, but separately proving its fit is still required.

## Heads, hair and expressions: every design

The six fictional identities are assigned to catalog bases; absence of an opposite-base variant is not automatically a missing task. Hair style/face identity should be reusable conventions rather than a new personalized mesh for every selfie.

| ID | Current result | Improvement or addition / order |
| --- | --- | --- |
| H01 short waves and beard | Preferred painted UV head; original and reference-A heads retained as earlier revisions | P1. Keep painted features; review head size/roundness, cheek/jaw/nose volume and the side view, then form a swept hair silhouette with broad locks. Review beard boundary through three-quarter/side angles. |
| H02 shoulder-length hair | Current painted UV head, separate hair and female foundation | P1. Keep the texture transport contract. Add a visible side part, soft face-framing locks and shoulder-length/wavy silhouette; reduce pointed cowl shape. Preserve continuous rear volume and prove hair clearance again. |
| H03 rounded dark curls | Female reference only | P3. Add broad economical curl masses after H02/head standard; no generated earrings. |
| H04 short dark crop | Male reference only | P3. Add a distinct short/cropped hair silhouette on the reusable head convention. |
| H05 silver waves and glasses | Female reference only | P3 after glasses attachment; add silver hair masses and fictional painted face, not a separate selfie pipeline. |
| H06 bald/goatee and glasses | Male reference only | P3 after glasses attachment; use the reusable head, painted facial identity/goatee and suitable scalp shape. |
| E01 neutral | Reference only as an expression entry; neutral painted defaults exist | First expression task: register a verified neutral baseline for the approved head/UV layout. Do not duplicate the head unnecessarily. |
| E02 delighted | Reference only | Add a warm readable smile/eye change after neutral. |
| E03 attentive | Reference only | Add a restrained attentive change; maintain identity. |
| E04 encouraging | Reference only | Add a subtle reassuring smile distinct from delighted. |
| E05 surprised | Reference only | Add a gentle surprise target; avoid the older startled white-disc eye appearance. |
| E06 blink | Reference only | First animated expression proof: clean closed lids and repeatable open/closed transition. |

Expression method remains a design task: compare texture variants with small generic lid/mouth morphs after neutral UV identity works. Every result needs front/three-quarter/side review, transitions, identity continuity and compatible head/face exports. Real-selfie likeness, provider/upload flow and consent/storage are separate work, not established by fictional sample textures.

## Characters, exact outfits and motions: every design

| Entry | Current result | Next action |
| --- | --- | --- |
| character-male | Painted H01 on T05/B01/F04 study; foundation alternative | P1 propose proportions, then review against an exact T01/B01/F01 baseline. Keep current study as comparison. Do not change body vertex order, rig or gait bytes for an art convenience. |
| character-female | Painted H02 foundation/current T02/B01/F01 capsule; older capsule retained | P1 propose proportions first, then add female T01 and exact O01 baseline. Hand/limb/body-topology changes are deferred because they invalidate the wardrobe. |
| capsule-T02-B01-F01 | Current female capsule and older controlled-first | P1 improve hood and shared B01/F01 art, refresh all dependent proof. Use the same named capsule on male for comparison; do not relabel it O02. |
| O01 T01/B01/F01 | Older exact male cap-free assembly, explicitly unverified; female missing | First exact outfit to rebuild from chosen heads and current independent masters on both bases. A capped assembly is a separate test combination. |
| O02 T02/B02/F02 | Exact entry pending on both bases | After fuller hood and F02 repair, assemble the exact cap-free recipe and corresponding female fits. |
| O03 T03/B03/F01/A01 | Exact entry pending on both | B03 repair and selected head/cap fit first. Current diagnostic outfit uses T01, so it is not O03. |
| O04 T04/B04/F03 | Exact entry pending on both | B04 repair plus hood/high-top work, then exact cap-free recipe. The capped existing test is additional evidence. |
| O05 T05/B01/F04/A02 | Partial male core, no A02; female missing | Consolidate the appropriate B01/F04 compatible sources, add beanie, then exact outfit. |
| O06 T06/B02/F02/A05 | Pending both | Button-count resolution, F02 repair, backpack and corresponding female fits, then exact outfit. |
| walk | Shared clip and female-compatible capsule; sampled fit exists | Preserve current bytes. Review a full loop, front/side/back, contact/sliding, arm swing, loop seam and calm tone on both approved bases. This audit captured paused poses, not a fresh motion-quality verdict. |
| run | Shared clip and female-compatible capsule; sampled fit exists | Preserve current bytes. Review full-cycle feet/stride, balance, silhouette and loop seam on both bases. Any later animation change requires dependent fit sweeps. |

Retained raw assemblies/studies are accounted for by their parts and source hashes in the 52-scene manifest. Extra caps, alternative B01 fitting studies and original heads are test/history evidence, not new logical catalog designs. Rejected historical geometry stays archived rather than being assigned improvement tasks.

## Technical blockers and evidence reliability

1. **B03/B04/F02 bilateral contamination is a real blocker.** Current side audit reports Right-key opposite-side changes: B03 518 vertices / 288.487 mm maximum; B04 263 / 26.239 mm; F02 12 / 11.367 mm. F04's independent targets pass. Evidence: `artifacts/verification/avatar-catalog/corrective-side-audit.json`.
2. **F02 side repair is incomplete acceptance.** Its isolated repair changes exactly the 12 leaked coordinates and passes sides/body/layers/export/runtime math, but still reports 178 heel-tab/shell triangle pairs at run 12.25 on original and repaired sources. Evidence: `assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/study-summary.json`. Attachment-distance pass is not own-shell clearance.
3. **B03 diagnostics have stale source binding.** `B03/motion-sweep-4x-metadata.json` records source prefix `c193c13e`; current canonical source is `52d3747d`. Keep its numbers as historical diagnostics and reproduce on current source after key repair.
4. **Three male outfit summaries are invalidated despite matching bytes.** `T01-B04-F01-A01`, `T04-B04-F03-A01` and `T02-B02-F02-A01` contain failed-side pieces. The ten listed summaries' hash fields still match; “passed” is incomplete scope, not proof of current acceptance. B04's retrospective opening claim is superseded by its closing audit.
5. **Focused H02 reports are stale.** `female/foundation/studies/h02-envelope/{face-transport-report,hair-clearance-report,export-deformation-report}.json` bind the pre-painted source/export (`f140ec1b` / `3d741840`) and previous comprehensive hash. The current `foundation-verification-report.json` binds `6641df23` / `b964b779` and is authoritative. Regenerate the focused extracts from current evidence or explicitly mark the old extracts historical; do not simply replace hash strings.
6. **Female capsule evidence is stronger than filenames imply.** The current `fit-verification-report.json` has 118 extractable source/helper/path-hash references matching current files. It separately covers native and actual glTF SLERP poses, openings, independent-master equality, sewn/free/own-shell roles, gestures and both UV-bearing exports. Seam embedding for B01 is expressly permitted/reported; strict own-shell roles remain zero. The current runtime/export bound is 2.009 micrometres over 16 poses.
7. **Use the correct runner report.** `artifacts/verification/avatar-catalog/female-outfit-T02-B01-F01/runner-report.json` (singular) records the current 15 passing gates. The similarly named plural `female-outfits/T02-B01-F01/runner-report.json` is a retained failed historical run.
8. **Painted H01 is not the original head.** Current rigidity, UV/image, reimport/material/validation source hashes match. Its head/T05 clearance and browser scope do not cover new cap/hair/expression combinations. Older original H01 exports without UVs remain history.

## Reference preparation before modeling

- Preserve all original sheets and exact prompts. Existing 66 focused crops are sufficient for most reviews; no blanket regeneration is needed.
- Create a single approved construction decision for T06. Recommend four large navy buttons to match corrected outfit sheets; reconcile the three-button category view with a deliberate edit and explicit supersession.
- Prepare a dedicated T04 front/side/back/three-quarter construction guide showing lowered hood, orange lining and zipper. The current pack lacks one. Preserve no dangling strings.
- For H01/H02 proportion and hair proposals, show matched cameras and equal scale on both clothed and unclothed views. Use the existing 2D images as visual targets, not millimetre blueprints.
- Cut/use isolated footwear and accessory views for authoring. Regenerate or edit a reference only where construction conflicts, is absent or cropped detail is unusable. Do not infer new hardware from incidental generated marks.

## Runtime budgets and acceptance

Current full-character preview geometry is approximately 112k–179k triangles and 3.6–5.8 MB per model or body-plus-garment pair; H01/H02 head previews alone are about 65k/50k triangles. Counts include the rendered body where present and are not per-garment counts or measured performance. They are a reason to benchmark before expanding the same construction across the entire catalog, not a claim that the models fail on every phone.

Set a device-backed budget using one accepted paired capsule. Record load bytes, triangles, material/draw calls, texture memory, animation frame cost and full-body phone framing. Use an agreed minimum-device target (proposed minimum 30 fps while the avatar and a representative game run together) before accepting optimized runtime exports. Keep native high-detail masters. Decimation, lower subdivision or consolidation must preserve silhouette, UV identity, weights, coverage and corrective behavior and receive new export/runtime proof.

Model acceptance requires four distinct decisions: reference/construction agreement; visual approval; current source-bound technical checks for the relevant base/heads/outfits/motions; and runtime budget/integration approval. Successful rendering alone satisfies none of the other three.

Execution order and concrete handoffs: `docs/superpowers/plans/2026-10-06-avatar-model-improvements.md`.


### Later execution checkpoint — 2026-10-07

The dated inventory above remains the original audit snapshot. A later root-authored
B04 rolled-cuff source now has fresh dependent technical proof and an animated
review revision. O04 has an explicit cap-free male fitting study (T04/B04/F03)
in the live catalog. Its art, final head/top/shoe targets and female counterpart
remain pending; no accepted design or final recipe completion is inferred.
See the current B04 retrospective and improvement-plan checkpoint for exact
source/report hashes and remaining work.


### 2026-10-07 complete B04 shell qualification

Whole garment self-clearance was missing from the earlier body/layer/detail
scope. B04 has 55 rest and up to 549 run self-pairs; complete signed-X inventory
finds 41 inherited Right coordinates. A guarded non-saving key reset preserves
body/shoe/detail clearance but cannot clear the shell. B04/O04 current technical
review is repair-needed; earlier reports remain scoped and unchanged. Other
garments require an explicit whole-shell audit before complete acceptance.
Evidence: `assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/centre-key-repair-v1/retrospective-centre-and-shell.md`.
