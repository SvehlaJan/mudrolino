# Avatar model improvement and completion plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` for an approved modeling batch. Follow the shared Blender skill and queue. Execution was authorized by the user on 2026-10-06, including parallel subagents. Proportion proposals and ambiguous construction targets still require their stated review decisions; paid Meshy spending, publication and final asset acceptance are separate.

**Goal:** Bring both avatar bases and their wardrobe closer to the palette-A references, repair known technical failures, and add missing fitted designs in an order that avoids repeated fitting work.

**Architecture:** Keep independent editable masters and isolated revisions, preserve the shared rig/body indices/gaits, and join designs to per-base revisions through `assets/avatar/catalog/catalog.json`. Approve reference/proportion targets before rebuilding their dependent hair, hoods and headwear. Ship-ready acceptance requires art, current technical proof and measured runtime budgets.

**Tools:** Blender 5.2.2 LTS through the existing CLI/queue, saved procedural builders, source-bound native/glTF/Three.js checks, the local catalog and 320px reference comparisons.

**Current verification qualification:** the fresh 2026-10-07 integration run
passed all nonbrowser gates but failed four temporal tile-animation assertions
(470 browser cases passed). Preserved traces show late observation; a separate
12-case reproduction passed. Keep aggregate integration failed until its timing
contracts are stabilized and a fresh profile passes. Model construction screens
remain independent and must use actual posed loop tessellation for whole-shell
self-clearance; earlier polygon-only proof retains its historical method/scope.

**Audit:** `docs/audits/2026-10-06-avatar-model-audit.md`; fresh visual/static evidence in `artifacts/verification/avatar-catalog/2026-10-06-model-audit/`.

**User decision:** On 2026-10-06, propose reference-matching proportions for review first. The previous female proportions are not silently replaced. The first paired capsule below is a recommendation, not an already accepted release scope.

## Delivery order

1. Resolve reference/evidence ambiguity and propose proportions.
2. Approve and freeze H01/H02 head/hair targets.
3. Finish T01/T02/B01/F01 on both bases; add female T01 and exact O01.
4. Repair B04/F02/B03 and complete refinements to existing male designs.
5. Add accessories and the rest of the female wardrobe; assemble exact O02–O06.
6. Add the remaining hair identities and expressions.
7. Accept optimized exports, motion quality, framing and actual runtime combinations before product integration.

Technical repair diagnosis can run alongside the proportion review. Native Blender jobs remain serial. Do not fit new headwear or finalize hoods while head/hair targets are still changing. Footwear dimensions precede final trouser cuff fit.

## Planned file boundaries

Keep authoring, verification and catalog registration separate. Future authoring
files below are proposed outputs, not files created by this audit:

| Work | Existing entry points / proposed new files | Saved assets |
| --- | --- | --- |
| Proportion proposals | Create `tools/blender/catalog/preview_catalog_proportions.py`, reading both current foundations without saving over them | Review-only output under `artifacts/verification/avatar-catalog/proportion-options/` |
| H01/H02 | Extend the existing head/female foundation builders listed in Batch 1 | Dated head/hair study folders beside existing H01/female foundation sources |
| Female T01 and later wardrobe | Extend `build_catalog_female_outfit_study.py` and `run_catalog_female_outfit_study.py` to explicit IDs/recipes; retain all existing guard checks | Independent `pieces/<ID>/` masters and exact-recipe study folders under `assets/avatar/catalog-a/female/` |
| New accessories | Create `tools/blender/catalog/build_catalog_a02.py`, `build_catalog_a03.py`, `build_catalog_a04.py`, `build_catalog_a05.py`, `build_catalog_a06.py`; extend the explicit assembler map per completed ID | Separate `assets/avatar/catalog-a/<ID>/` masters plus female fitting studies |
| New hair identities | Create `tools/blender/catalog/build_catalog_hair_variant.py` with explicit H03/H04/H05/H06 design parameters | Separate H03–H06 study folders; reuse stable head/UV conventions |
| Expression proof | Create `tools/blender/catalog/build_catalog_expression_study.py` and `verify_catalog_expressions.py` after the method decision | E01–E06 neutral/transition studies with face-image/morph provenance |
| Registration and handoff | Update `assets/avatar/catalog/catalog.json`, `catalog-progress.json`, each affected retrospective and `ROADMAP.md` | Explicit per-base current revision, independent review states and actual proof paths |

New builder/verifier interfaces require focused behavioral regression tests before
implementation. Geometry parameters are set from the approved visual target,
not invented in this planning turn.

## Batch 0 — reliable targets and evidence

**Relevant files:**

- `assets/avatar/catalog/catalog.json`
- `assets/avatar/catalog-a/catalog-progress.json`
- `assets/avatar/concepts/2026-10-04/catalog-a/{gallery.md,prompts-and-manifest.json}`
- `assets/avatar/concepts/2026-10-04/catalog-a-female/{gallery.md,prompts-and-manifest.json}`
- `assets/avatar/catalog-a/female/foundation/studies/h02-envelope/foundation-verification-report.json`
- Focused H02 reports and B03/B04/F02 retrospectives identified by the audit.

- [x] Record one construction target per design in `docs/avatar-construction-targets.md`. Preserve T02 no drawstrings, T04 no dangling strings, F01 one broad strap, F02 no straps and F03 three straps.
- [x] Present T06 three-/four-button references together. User chose four large navy buttons for both bases on 2026-10-06. Preserve the superseded view and prompt; the four-button focused reference is saved with exact prompt/provenance.
- [x] Prepare a dedicated proposed T04 lowered-hood construction guide with front/side/back/three-quarter views and three closeups, orange lining and ivory zipper. Registered as `T04:construction-v1`; exact prompt, retained input/output hashes and review copy are under `assets/avatar/concepts/2026-10-06/T04-construction/`. Art/fitting acceptance remains pending.
- [x] Complete evidence cleanup. **H02 done:** fresh queued native comprehensive verifier passed; focused reports now derive its actual scopes with 13 validated dependencies, explicit derived labels and retained historical bytes/logs. Never substitute hash strings. B03/B04/F02 retrospectives now identify current failures; three affected male outfit directories retain summary bytes with explicit `SUPERSEDED.md` notes.
- [x] Present equal-camera/equal-scale proportion options at current, +10%, +20% and +30% head/hair scale on each base. Include unclothed views and current clothed studies with their actual recipes labeled, front/side/three-quarter/back, and a neckline/hood clearance view. Exact female O01 becomes available after female T01 authoring in Batch 2. These are disposable visual proposals, not fit candidates. All 16 options were captured in four views with verified common camera bounds per base and zero runtime errors/failed requests; the review page is `artifacts/verification/avatar-catalog/proportion-options/2026-10-06-v3/review/review.html`.
- [x] Let the user choose the male and female target independently. **2026-10-07: +30% on both bases**, built and verified as isolated head studies (`build_catalog_head_scale_study.py`). Record head width/height, neck pivot and approved comparison images; preserve body topology, bind pose and gait bytes. If a new head shape is preferred over uniform scale, document its silhouette before detailed fitting.

**Output:** Approved construction/proportion sheet and explicit foundation/head revision targets. Head-size previews must remain labeled unverified. No next-batch head geometry work until the chosen targets are approved.

## Batch 1 — H01/H02 neutral head and hair

**Edit/extend builders:**

- `tools/blender/catalog/build_catalog_head_texture_study.py`
- `tools/blender/catalog/build_catalog_head_style_study.py`
- `tools/blender/catalog/build_catalog_female_foundation_study.py`
- `tools/avatar/paint_catalog_face.mjs` only when head-surface formulas/face placement require it.

**Preserve sources:** H01 `style-revisions/painted-face/` and female `foundation/studies/h02-envelope/`. Save new candidates under separate dated sibling revision folders; retain previous accepted review images and every failed source.

- [ ] Build the approved H01 silhouette. Keep the canonical facial UV contract and painted identity; refine cheek/jaw/nose volume and beard transitions, then the swept short-wave hair masses.
- [ ] Build the approved H02 silhouette. Keep the canonical facial layout; establish parting, face-framing locks, shoulder-length volume and continuous rear hair. Avoid a pointed cowl or disconnected hanging strips.
- [ ] Compare both faces front/three-quarter/side at actual runtime size before adding fine detail. Keep broad rounded geometry rather than many tiny surface details.
- [ ] Verify rigid attachment, face image/UV corner identity, material parity, head/neck seams and reimport equality. Rerun dense gait and six head gestures against head/body/hair obstacles. Maintain exact rig/bind/body-index invariants.
- [ ] Save full-figure and head-focused desktop/phone captures. Obtain visual approval before freezing head/hair targets and fitting hoods/caps/glasses.

**Exit:** Two approved neutral head/hair designs with current source-bound evidence. This does not establish expressions, selfie likeness or accessory clearance.

## Batch 2 — first paired capsule

**Designs:** T01, T02, B01 and F01 on both bases (eight fitted variants). Seven exist; **female T01 is the only missing fitted variant in this batch**.

**Existing construction:** `build_catalog_t01.py`, `build_catalog_t02.py`, `build_catalog_b01.py`, `build_catalog_f01.py`, `catalog_tee_geometry.py`, `catalog_top_geometry.py`, `catalog_bottom_geometry.py`, `catalog_footwear_geometry.py` and the female study builder/runner under `tools/blender/catalog/`.

- [ ] Revise F01 toe/sole/strap/opening volume on both bases. Freeze the shoe envelope before final B01 cuffs; preserve one broad ivory strap, original foot alignment and face-safe opening anatomy.
- [ ] Refine B01 waistband/pockets/button and relaxed straight-leg ease on both bases. Fit to the approved F01 envelope; do not silently substitute the separate F04-compatible B01 source.
- [~] T01 sleeve opening (2026-10-08): camera-visibility coverage release fixes the visible cut on both bases; armpit crease edge accepted for now. Original task: Refine male T01 rounded crew/sleeve/hem boundaries and relaxed shape. Author a separate female T01 master with its own body coverage, source and fit evidence; do not resize the male export in React.
- [ ] Revise lowered T02 hood bowls on both bases from the fixed head/hair envelope. Use ordered surfaces before thickness, actual underlying garment weights and explicit sewn/free roles. Keep the hood, pocket and thick cuffs recognizable without drawstrings.
- [ ] Assemble **exact O01 = T01/B01/F01** on both bases. Also assemble separately named **T02/B01/F01 capsules** for hood and layering review. Test cap combinations separately; neither the hoodie capsule nor a capped test is exact O02.
- [ ] Run independent and combined native **and actual-runtime-pose** body/layer/head/detail sweeps; corrective side isolation, own-shell checks, openings/incident faces, independent-master equality, UV/image identity, material/GLB validation and the current 16-pose export/Three.js bound. Run six gestures where relevant.
- [ ] Review front/back/side/three-quarter, worst gait poses, full-cycle Walk/Run and phone framing. Obtain art decisions before marking any revision visually approved.
- [ ] Update per-piece retrospectives, progress/index and ROADMAP with exact proof scope. Keep visual approval, recorded technical checks and product acceptance separate.

**Runner references:** The current male runner expects canonical paths and the male assembly map. Extend it deliberately to isolated approved revision paths rather than overwriting canonical masters before proof. The current female runner targets T02/B01/F01; generalize its existing coverage/masking/identity/UV/native/runtime checks to T01 and exact recipes before claiming the new tee is verified.

Existing commands for the current profiles:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py \
  --id=T02 --garment=T02_pullover_hoodie --outfit=T02-B01-F01-A01 --head-check

python3 tools/avatar/blender_queue.py -- python3 tools/blender/catalog/run_catalog_female_outfit_study.py \
  --study-dir assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01 \
  --report-dir artifacts/verification/avatar-catalog/female-outfit-T02-B01-F01
```

These commands are references to current runners, not permission to overwrite the old study during iteration. A new batch needs its own source/report directory and confirmed supported runner arguments. Regression tests must reject stale/missing hashes, different independent masters, unsafe openings and incomplete pose inventories; a previously recorded pass cannot substitute for changed-source proof.

**Exit:** Visually approved, technically checked paired capsule, plus one baseline profile of load/frame/memory cost. Both bases must be ready before product avatar integration.

## Batch 3 — repairs and existing-model refinement

Run independent repair work in separate sources, preserving canonical failures.

- [~] **B04 first:** isolated bilateral attachment source `ec735203…` passes side/body/detail and both diagnostic sneaker/high-top combinations: zero own-shell contacts over 164 poses, 9.110 mm maximum distance and 29 native/export/runtime gates. Fresh derived preservation binds 17 current tools; original construction provenance remains explicitly qualified with exact history. An isolated root-authored rolled-cuff source now clears the initial 328-pose cuff/body/shoe screen and reopened preservation; its fresh dependent detail/body/outfit/export/Three gates and desktop/phone rendering checks now pass. Standalone export/Three error is 1.620 micrometres; exact cap-free male O04 is registered as a pending-art study. A later broad rounded rear-pocket probe failed its complete 328-pose screen (54 pairs / 17.234 mm); no candidate saved. Read-only diagnosis found 18 inherited Right deltas in the central 40 mm strip excluded by the earlier isolation gate. Complete centre inventory expands that to 41 coordinates; the guarded reset preserves body/shoe/detail clearance. A new whole-garment self-audit finds 55 rest / 549 run pairs, so outer-crotch/deep-fold shell construction now precedes independent centre keys and host-conforming pockets. B04/O04 technical review is repair-needed, rest-only; earlier recorded checks keep their limited scope. A later actual-triangle paired-lining proposal clears rest 55→0 and reduces worst movement 553→493, preserving body/shoe/detail clearance; it remains rejected and unsaved. Follow-up fold diagnosis failed on a frame lookup and is preserved as incomplete. User-requested wrap-up stops further experiments, with batches 0–6 unfinished. Final art/targets/budgets remain open. Canonical promotion, broad construction details and final recipe/budget proof remain open.
- [~] **F02:** the bounded 12-coordinate side repair remains the starting source. Seventeen 164-pose offset/attachment-weight screens are rejected; no candidate saved. Read-only native/equivalent/Three ankle measurement and one bounded iso-angle witness are complete. Root reviewed the portable bind-relative convention for an isolated calibration experiment; signed twist/swing payload and loop-boundary parity are now verified; the bounded geometry/correction experiment remains to be implemented. Preserve knee semantics, gait, tab shape, 12 mm distance and zero prohibited contact. Introducing new sewn/free roles requires separate proof. Recheck O02/O06-compatible combinations after full native/export/Three.js agreement.
- [~] **B03:** isolated source `f6417b04…` clears bilateral leakage, preserving all eight source invariant groups. Fresh original/repaired 163-pose body sweeps retain max 338 pairs; total contacts rise 2,896→4,159. Keep this failed diagnostic and distinguish side isolation from fitting improvement. Rear-hem/body/shoe deformation remains open; require monotonic fitting improvement before selecting another target.
- [ ] **F03:** refine collar/toe/sole and preserve three straps plus the 185 mm opening/face-safe coverage contract; rerun with repaired B04.
- [ ] **F04:** refine rounded shape/heel loop on the independent source. Select or rebuild the appropriate B01 compatibility revision and verify all its affected combinations before promotion. Add complete O05 only after A02 exists.
- [ ] **T04:** full lowered hood/orange lining and rounded zipper/rib detail after head freeze. **T06:** approved button count, broad placket and collar facing. **T05/T03:** modest rib/hem refinement; retain their relatively good design match.
- [ ] **B02:** relaxed gathered jogger silhouette and elastic boundaries, then final fit with repaired F02 and other intended shoes.
- [~] **A01:** rebuilt from head envelopes on both bases (2026-10-07; `A01/fitting-revisions/head-envelope-v1/`), fit gate and 168-pose sweeps pass; art review, hood combinations and other male tops remain. Original task: Rerun six gestures and all chosen head/hair/hood combinations; old-head clearance is insufficient.

**Exit:** Current technical failures closed by matching reports, not by stage labels. Existing male pieces have reviewed construction and documented combinations; remaining female fits still need separate sources.

## Batch 4 — missing wardrobe and exact outfit completion

Missing male pieces: **A02–A06**. Missing female fits: **T01/T03/T04/T05/T06, B02/B03/B04, F02/F03/F04 and A01–A06**. Female T01 is delivered in Batch 2 and A01 may be delivered in Batch 3; remove only completed variants from this backlog.

- [ ] Author A02 beanie on chosen heads/hair, then assemble **O05 = T05/B01/F04/A02**.
- [ ] Author A05 backpack with top/shoulder/arm/strap clearance, then assemble **O06 = T06/B02/F02/A05** after F02 repair and button-count agreement.
- [ ] Author A03 round glasses, then reuse the validated bridge/temple/ear attachment convention for A04 soft-square glasses. Verify both required base fits and head identities.
- [ ] Author A06 scarf against settled chin/neck/hood envelopes with arm and head motion checks.
- [ ] Extend female fitted clothing in recipe batches: T03/B03/A01 for O03; T04/B04/F03 for O04; T05/F04/A02 for O05; T06/B02/F02/A05 for O06. Deliver T02/B02/F02 O02 as the repaired jogger/slip-on standards become available.
- [ ] Assemble exact recipes and compare to the matching male/female references. Register exact recipe models separately from extra-cap diagnostics and exploratory cores. Each new combination requires body/layer/coverage/export/runtime proof.
- [ ] Complete A03/A04/A06 combinations even though they are absent from O01–O06. Keep explicit compatibility lists rather than implying every head/top/accessory pair is checked.

**Exit:** Every intended wardrobe base variant and exact outfit is accounted for by authored or explicitly deferred work, with no borrowed opposite-base models.

## Batch 5 — visual range and expressions

- [ ] Build H03 curls and H04 crop with the approved reusable head/UV convention. Add H05 silver waves/glasses and H06 bald/goatee/glasses after attachment standards pass. Keep hair mass economical and identity fictional.
- [ ] Register E01 neutral from an approved head/face baseline. Compare texture variants versus minimal generic facial/lid morphs for the required expression behavior; choose a method that preserves identity from all required views.
- [ ] Prove E06 blink transition first, then E02 delighted, E03 attentive, E04 encouraging and E05 gentle surprise. Test each expression's start/end and transitions with both neutral faces; avoid forcing an identical personalized face mesh.
- [ ] Keep real-selfie generation and provider/data handling in a separate product plan. Current texture fixtures establish transport, not likeness or a production service.

**Exit:** Approved expression/hair assets with explicit compatible heads and transition behavior. The user may defer this batch without claiming the reference-only entries are finished.

## Batch 6 — runtime acceptance and publication handoff

- [ ] Agree the lowest supported phone and representative game scene. Propose at least 30 fps while the game and avatar animate together; profile both bases rather than accepting triangle counts alone.
- [ ] Record source/loaded bytes, geometry/material/draw calls, texture memory, load behavior, animation frame cost, full-body framing and cache/offline expectations. Current roughly 112k–179k triangle previews are diagnostic inputs, not an agreed production budget.
- [ ] Produce separate optimized runtime exports from the retained masters. Recheck silhouette, weights, UV/image identity, coverage, corrective sides and source/export/runtime parity after every optimization.
- [ ] Review complete Walk/Run loops for grounded feet, sliding, arm swing, balance and loop seam. Preserve gait bytes unless a separate motion revision is required and its dependent fits are scheduled for refresh.
- [ ] Before product integration, confirm explicit art approval, current technical hashes, compatible combinations, budget proof and both bases ready. Actual slot switching, game UI behavior and release checks belong to that separate integration batch.
- [ ] Publish/promote only assets approved through those gates. Keep rejected/history sources and verification reports in Archive.

## Scope and execution limits

The audit preceded user-authorized execution. Current work prepares disposable proportion proposals, references and isolated mechanical repairs. No Meshy credits, report-hash replacement or model publication is authorized by this execution. Source-body topology/limb/hands changes are deferred because they would invalidate every garment's fitting assumptions. No new worktree or PR is required. Continue in the primary checkout on a branch, preserve unrelated changes and serialize native Blender jobs.

Execution starts with **Batch 0's proportion and reference review**. User target choices gate dependent H01/H02 and capsule authoring; they do not establish final acceptance of a model. Independent mechanical repairs continue alongside that review.

## Plan review

Factual review completed against the current inventory and source-bound reports.
The proportion proposals use explicitly labeled existing clothed studies because
female O01 is not yet authored. F02 repair preserves its actual detail-distance
and own-shell contract; F04/T02 attachment-role conventions are not silently
attributed to it. The audit created no new acceptance claims or source changes.

### Additional acceptance gate identified during execution

Audit whole-garment nonincident self-intersections at rest and the complete
native/equivalent gait inventories for every current wearable, in addition to
body/layer and separate detail-to-cloth checks. Guard each adapter rest capture
against the actual bind matrices. Other garments remain unproven for this gate.
Keep independent repair proposals separate from underlying shell construction.
