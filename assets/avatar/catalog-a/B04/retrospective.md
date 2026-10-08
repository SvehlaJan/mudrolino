# B04 — ivory tapered trousers retrospective

Status: canonical source requires corrective-side repair. Historical fitting
passes below do not establish current side isolation. Final reference/style/budget
and runtime catalog registration remain open. Source: `B04.blend`; exports: `B04.glb` and
`body-B04.glb`. Reference: B04 in the palette-A bottom sheet and O04 in the
expanded outfit sheet.

The trousers use the shared quad pelvis/crotch shell with a separate per-design
leg loft: comfortable thigh ease, a gradual calf taper and the established cuff
clearance. Ivory fabric/trim and subtly darker ivory pocket seams preserve the
reference's broad matte forms; the single waist button is navy. Projected front
openings, fly, rounded back pockets and belt loops inherit barycentric cloth
weights. The candidate has 6,512 vertices / 6,496 polygons, 24 groups and at most
four normalized influences. The reversible full-length coverage hides 17,351
body vertices. The shared rig, body topology and gait are unchanged.

The first selected views and complete independent body/detail checks passed.
Outfit assembly found a naming mistake: the factory emitted
`B04_tapered_trousers`, while the registered identity was `B04_ivory_trousers`.
The factory now uses the registered name. The shared builder checks identity
before exporting, and assembly reports missing source objects before attempting
to copy them. The candidate was rebuilt and all source-bound checks rerun; the
earlier hashes are not used as current proof.

Fresh verification: independent and T01/B04/F01/A01 outfit sweeps each cover
163 quarter-frame walk/run poses with zero body/head/layer contacts. Pocket,
fly, loop and button attachment checks cover 164 rest/walk/run poses; maximum
cloth distance is 4.739 mm against the 12 mm limit. Six cap gestures pass.
Fifteen GLBs validate with zero errors, warnings, infos or hints. Fourteen-pose
bidirectional source/export comparison passes at 6.068 micrometres. Exported
materials pass. Four fresh production-candidate browser cases cover desktop
rest/walk/run and phone run with no page/console errors or failed GET requests;
expected availability HEAD aborts remain recorded. The unchanged production
build identity matched the dedicated loopback preview; no new app build or
integration test run is claimed.

Current hashes, commands' scope and known limitations are consolidated in
`../outfits/T01-B04-F01-A01/verification-summary.json`. Review copies are 320px
wide under `artifacts/verification/avatar-catalog/B04/` and the outfit folder.
Visual review confirms the ivory/navy construction, tapered leg silhouette and
shoe overlap in rest and running views. This establishes a fitting candidate,
not final catalog art acceptance; the source character and outfit still need
the common style/material and geometry-budget pass. The default phone camera
continues to crop feet.

Apply to the next piece: register names before building, project details onto
actual cloth, normalize source weights to the export cutoff before fitting, and
use complete body/layer motion proof rather than selected screenshots. Reuse
the tested geometric envelope for appropriate new designs while authoring their
actual construction and materials. B03's rejected knee-only projection study
does not block independent trouser/footwear work and does not become accepted
by completing this piece.

Next: F02 navy slip-ons with orange heel tabs. B03 deformation remains open.
The full twenty-wearable/six-head catalog, expressions, all compatible
combinations, final art/budget, complete mobile framing and actual slot
registration/switching remain required. No published assets were replaced and
no Meshy credits were used.

## F03 compatibility revision

The original source/proof above is historical. High-top fitting found rear cuff
overlap at rest and deep-kick rear hip contact. Its diagnosed studies are saved
under B04/F03 `fitting-revisions/`. B04 now has up to 12 mm posterior cuff ease,
body-surface ankle/rear-hip weights, and native knee-driven rear-panel
compression toward the body with a 6 mm margin. Rest silhouette, shared rig,
body indices and gait are preserved. The original master and exports remain in
`fitting-revisions/before-high-top-fit/`; the current source hash is
`e4e14adf9e8da333b0c02e4d4690e56d38e63884de10676864646ba574983624`.

Fresh independent and T01/B04/F01/A01 sweeps pass all 163 poses; waist/pocket/
button attachment passes 164 poses at 5.816 mm below the unchanged 12 mm gate.
Fifteen-pose source/export comparison now includes run 7.25 and passes at
6.068 micrometres. The actual Three.js corrective probe passes all 15 poses
with combined error bound 7.179 micrometres below 30. Six cap gestures, 15 clean
GLBs, materials and four fresh production-candidate browser cases pass. The
T04/B04/F03/A01 combination also passes all native/export/corrective/browser
gates; its exact deep-kick visual review records zero contacts. Shared final
art/budget/other motions/heads/mobile framing and actual slot integration remain
open. Current source-bound summaries supersede the old hashes at the same
outfit paths. Details near the compressed rear panel still need the common
visual/own-shell art review; attachment distance alone is not final art proof.

Workflow improvement: measure cuff rest ease, body-surface weight differences
and residual cloth bulk separately. Use a localized cloth compression target
only after geometric and skinning evidence justify it. Keep the actual failing
pose in export/runtime and visual regression coverage.

## New bilateral-key audit — 2026-10-04

The source audit in `artifacts/verification/avatar-catalog/corrective-side-audit.json`
finds inherited Left deltas in this source's Right correction. This is an
independent deformation defect even where historical body/layer checks passed.
The shared builders now use explicit neutral-basis shape-key creation. This
master is preserved pending repair and fresh body/layer/detail/export/Three.js
proof; previous evidence is historical and does not prove side isolation.

## Isolated bounded repair — 2026-10-06

The repair source and reports belong under
`fitting-revisions/independent-keys-repair/`. The builder is
`tools/blender/catalog/repair_catalog_b04_corrective_sides.py`; it accepts only
the audited canonical SHA above and plans the reset with a separately tested
pure helper. Exactly 263 inherited Left coordinates in `knee_clearance_Right`
are eligible, with the audited maximum displacement of 26.239174 mm and 263
intended Right coordinates preserved. Editing that existing key retains its
driver and settings and creates no mixed shape key. This is equivalent to
starting the opposite-side coordinates from the neutral Basis; future authored
bilateral keys continue to require `from_mix=False`.

Four behavioral Vitest tests were run failing first and then passing. They
check the exact coordinate boundary and reject a mismatched inherited delta,
changed opposite/intended count, or changed maximum. The saved-source verifier
compares topology, Basis/rest, groups/weights, binding, active modifiers,
constraints, shape settings, drivers, rig, both gait actions, surface and
material state, allowing only the listed Right coordinates to differ.

The native regression passed: the real side gate rejected the canonical source
with 263 contaminated coordinates and accepted the saved isolated source with
zero opposite-side deltas. The reopened source passed all eight invariant
groups. Its SHA is
`b472ea595124968bbad2ad0f0b8ab35581b2b829fe5b7302ae916266c1014055`.
Canonical master and both original GLBs remain byte-identical. The complete runner is:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/run_catalog_b04_repair.py
```

Its real native regression must reject the unchanged canonical source, accept
the isolated repair, and prove all canonical B04 master/export hashes remain
unchanged. Independent body/detail sweeps and separate sneaker
`T01-B04-F01-A01` and high-top `T04-B04-F03-A01` sources then receive fresh
side, body/layer, export, material, GLB and actual Three.js corrective checks.
Supply `--preview-url` only when the fixed production preview is ready, to run
source-bound desktop/phone browser proof. Gates retain failures without
promoting the repair. Rolled cuffs and construction-detail refinement are not
part of this side-only source change and remain dependent on passing proof.

Fresh side-only proof: independent and both sneaker/high-top outfit sweeps
cover 163 poses each with zero body/layer contacts. Detail distance covers 164
poses at 6.343502 mm below the unchanged 12 mm limit. Both outfits pass all
16 source/export and Three.js samples, with combined error bounds of 7.167545
and 6.460162 micrometres below 30. Side inventories, six-gesture cap checks,
materials and eight GLB validations pass. Browser checks were not run.

The new own-shell gate remains red. At run 6.25 the side-only source has 150
pocket/seam-to-shell pairs and 22 waist-button pairs; the unchanged canonical
source reproduces 228 and 22 respectively. Actual colliding face IDs and
materials are retained in `own-shell-diagnosis.json` and its canonical
counterpart, with 320px front/back source views under the matching artifact
directories. The 150 seam pairs at run 6.25 map to two front opening tubes
(20 and 22), the fly tube (36), and one back pocket (72). All five belt loops
clear the diagnostic poses. Seams and patches clear at rest but penetrate
during motion. The button is already embedded at rest: the builder's 2 mm
offset and 2.5 mm half-depth intentionally seat its back inside the shell;
the measured deepest signed sample is -0.738362 mm. No accepted sewn-contact
roles exist, so this construction-intended seat still fails the unchanged
zero-contact rule. No role exception or limit change was introduced.

## Separate detail-clearance studies

`independent-keys-repair/detail-clearance-study/` preserves the first failed
follow-up source. It translates only six diagnosed components (942 vertices):
front opening/fly tubes 1.5 mm outward, waist button 1.2 mm, and back patches
2.5 mm. The same uniform component translation applies to mesh rest, Basis
and both corrective keys, preserving detail geometry and morph deltas. Cloth,
belt loops, topology, weights, binding, drivers, gait and materials remain
unchanged. Independent and both full outfit/export/Three.js/material/cap/GLB
gates pass again; own-shell remains failed at 22 seam pairs, although all
button contacts clear. The 164-pose distance maximum is 8.368134 mm below 12.

The remaining run 9.25 pairs map to one opening tube (4, deepest signed
sample -0.090509 mm) and one back patch (18, -0.302497 mm). A fresh
`detail-clearance-study/second-bound/` source increases opening translation
to 2 mm and back-patch translation to 3 mm; fly/button offsets stay unchanged.
Its full proof completed with all other gates passing and own-shell still
failed at 20 seam pairs (run 9.5). Detail distance is 8.773063 mm. Failed
predecessors and canonical bytes are preserved. The tested planner rejects changed component/material identity,
overlapping vertex membership, front offsets above 2.5 mm and pocket offsets
above 3.5 mm. All nine behavioral Vitest tests passed after their failing
first runs. New reports bind construction/diagnosis/preservation tool hashes;
earlier failed-study construction reports predate those fingerprints and
remain retained evidence. The builder refuses any existing source/export/report
destination before saving.


## Target-only attachment revision, 2026-10-07

`independent-keys-repair/target-only-2026-10-07/` preserves a separate failed
candidate. Source SHA-256 is
`a307ae27954787bd6b8ebc9d9242c6c44bef1a933275b6b2d6932e621e4bd395`.
The saved second-bound evidence supports host-derived Right morph deltas for
the existing anatomical-right back patch, plus a 0.4 mm posed cloth-normal
lift on the existing Right opening target at run 9.5. Only 258 existing Right
target coordinates change (104 opening, 154 patch; 346 eligible). Maximum
changes are 0.509491 mm and 6.942508 mm respectively. The remaining eligible
patch targets already match their hosts. No new key, role or topology is added.

Four new behavioral tests failed first and then passed, rejecting excessive
changes, altered component/material identities, extra targets, opposite-side
targets and invalid coordinate inventories. All 13 owned tests pass; targeted
ESLint and Python compilation pass. The native builder refuses an existing
revision directory and fingerprints construction/verifier tools and diagnostic
inputs. Reopened proof preserves all eight invariant groups, including exact
Basis/rest/body/cloth/Left/unaffected Right coordinates, topology, weights,
rig/bind/drivers, gaits and materials. Changed target float32 serialization
error is 0.029744 micrometres. All 120 protected predecessor/canonical file
hashes remain unchanged. Fresh canonical side regression rejects its original
263 contaminated vertices; the new side inventory passes.

The full runner finished 30 gates: 28 passed; own-shell and its reproduced
canonical diagnostic failed. Independent and both sneaker/high-top body/layer
sweeps pass 163 poses each with zero contacts. The 164-pose distance maximum
stays 8.773063 mm below 12 mm. Both 16-pose source/export and Three.js checks
pass; combined error bounds are 7.167545 and 6.460162 micrometres below 30.
Both six-gesture cap checks, material checks and all eight GLB validations pass.
No browser gate was run. This candidate is not accepted or promoted.

Own-shell has at most 12 seam pairs at run 12.75 and 13.0, with 11 failing
quarter-frames from run 12.0 through 14.5. The button and repaired Right details
clear. Actual face diagnosis assigns every remaining pair to unchanged
anatomical-left back patch component 5. Worst-count source faces 285/2781 meet
detail faces 6246/6248/6249/6346/6348/6349/6392–6395. Deepest sampled penetration
is -0.516119 mm at run 12.25; the 12.75 sample is -0.466198 mm. These late-pose
pair counts exactly match the preserved second-bound report, so this revision
retains that earlier failure. Exact 320px source views and face/material pairs
are retained in the diagnostic artifacts/report. This is motion penetration of
a sewn patch, not an accepted contact role. No limit or role exception changed.

A separate non-saving counterfactual diagnoses that untouched left patch using
original-rest nearest cloth triangles and barycentric host Left morph deltas.
Actual skin weights are already close to their hosts (maximum L1 difference
0.0000121553); no weight change is proposed. The native 164-pose own-shell and
distance screen clears: zero pairs, 9.109729 mm maximum distance below 12 mm,
with at most 4.360936 mm target change. The script restores exact in-memory
invariants and verifies unchanged source bytes; it saves no model or export.
This diagnostic does not establish body/export/runtime acceptance. A follow-up
would need separate tested bounds for component 5 Left targets, a fresh
non-saving full-cycle screen before saving, reopened source invariant proof,
and the unchanged full gates. Broad body/outfit/export work should follow only
a clear cheap screen. That checkpoint preserves the failed Right revision and grounds the separate
Left-only follow-up below.


## Bounded Left-patch follow-up and provenance qualification

`independent-keys-repair/bilateral-targets-2026-10-07/` is a separate technical
alternate, derived from the failed Right revision. Source SHA-256 is
`ec735203dc0379557fde1467abd75bd5dab9f59f47ceaf99cdd254c01fed5ea2`.
It changes only 154 of 242 eligible existing Left targets on component 5.
The tested 4.5 mm cap bounds a measured maximum change of 4.360934 mm. All
Right targets and all other Left targets remain exact, along with Basis/rest,
body/cloth topology, weights, rig/bind/drivers, gaits and materials. Three
changed-inventory tests failed first and then passed. The builder refuses any
existing revision directory.

A fresh non-saving native screen runs before the builder saves a .blend or
GLB: all 164 rest/walk/run quarter-frame poses clear own-shell with zero pairs
and maximum detail distance 9.109729 mm below the original 12 mm threshold.
`pre-save-screen-report.json` SHA-256 is
`edaf82becad93d6c737cb15dd09e762b4117e50bea3a8402788390be3bcc2376`.
This screen is a cheap construction gate; it does not replace saved-source,
body/layer, export or runtime verification. A failed screen retains its report
and stops saving/exporting. No contact roles or limits are relaxed.

The saved-source suite completes with all 29 gates passing. Reopened proof
preserves all eight invariant groups, with changed-coordinate float32 error
0.029075 micrometres; 159 prior/canonical source/report hashes are unchanged.
Fresh canonical side regression again reproduces 263 contaminated vertices,
and the alternate side audit passes. Independent and both sneaker/high-top
outfit sweeps pass 163 poses each with zero body/layer contacts. Saved-source
own-shell/distance pass all 164 poses (zero pairs, 9.109729 mm). Both 16-pose
source/export and Three.js gates, six-gesture cap checks, material checks and
eight GLB validations pass. Combined runtime error bounds are retained in the
source-bound outfit reports. Browser and final visual acceptance were not run;
no canonical asset or shared catalog entry is promoted here.

Review identified a provenance gap in the initial target-only builders: they
omitted transitive helper hashes and recorded fingerprints after construction
without initial/completion drift guards. This qualifies the original execution
chain even though its geometry gates pass. Exact pre-hardening code/report bytes
(71 files) are preserved under `proof-history/pre-hardening-2026-10-07/`; the
manifest SHA-256 is
`37fe7bdaf0b1bf70d7fbdd73b7de17aad1a597c61bb93bf05a8d599f19fb86ab`.
Original construction, cheap-screen, preservation and full-gate report bytes
remain unchanged. Historical copies do not retroactively prove omitted tools
were fingerprinted during execution.

The builders now fingerprint transitive sibling Python helpers without native
imports or runtime-path scanning, plus explicit runner/CLI/queue files, before
first opening a model; they refuse missing/changed captured tools and guard
completion. Three behavioral inventory/drift tests failed first and then passed.
All 19 owned tests, targeted ESLint and Python compilation pass. A fresh
`derived-preservation-report.json` verifies the unchanged final source with 17
complete current tool bindings captured before open and guarded afterward.
It explicitly labels itself derived, binds original report/manifest hashes,
and records four initially omitted local dependencies: prepare_catalog_body,
catalog_tee_geometry, b04_corrective_repair_plan and b04_detail_components.
It does not relabel original construction as complete or claim a new native
geometry run. Body/export/runtime gates were not repeated after provenance
hardening because model bytes and geometry logic are unchanged. Technical
mechanical proof passes with this provenance qualification retained; final
registration, browser/review and any acceptance decision remain separate.


## Subsequent browser and construction review — 2026-10-07

Root registered the technical candidate as a pending-art alternate, preserving
the canonical preferred revision. Later fresh desktop/phone camera checks pass
four views and identical Reset pixels; this narrow browser proof does not imply
art acceptance or exact O04. `bilateral-targets-2026-10-07/retrospective-art-proposal.md` and
its hashed 320px evidence prioritize folded cuffs, curved pocket construction,
then readable waistband/loop/button detail. Rolled-cuff construction has since started on an isolated source (see below);
its affected source/fit/export/runtime gates must be rerun. Female fit, final
recipes and runtime budgets remain open.


## Continuous rolled-cuff candidate — 2026-10-07

Root authored this construction without parallel model agents. The prior
bilateral source remains unchanged. The new fold replaces exactly 96 hem caps
and adds 1,344 vertices while retaining every original garment coordinate, key
coordinate, weight, retained face/material/smoothing and UV corner. The cloth
forms a continuous closed returned band, 25 mm high at rest.

The first surface-weighted proposal clears body/F01/F03 but hits the rear thigh
at run 7.25 (32 pairs in each pose domain). A hem-anchor counterfactual worsens
self-contact to 172 pairs and clips F03 by four pairs; reject it. Surface weights
with same-side knee compression on only the new free rows leave a 14 mm returned
band during deep bends and clear all 164 poses in each of native and
runtime-equivalent domains. Prune new interpolated influences at the established
0.0001 exporter cutoff before renormalizing; original weights remain unchanged.
The final exporter-compatible source repeats that zero-contact 328-pose screen.

Candidate: `fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/cuff-construction-v1/export-compatible-candidate/`.
Blend SHA-256: `291d4927ef628ff300a7e3c3ed950776bc32944de6273f5d2fa915b9f7ace42d`.
Garment GLB SHA-256: `9e843fcf22009ce321ac42a3294547b653bf15c5a3d21cfb766552e14fc0061c`.
Fresh reopened preservation passes all eight original invariant groups, the
closed shell, retained UV corners and same-side new targets. Both fresh GLBs
validate with zero errors/warnings; body GLB is byte-identical to the baseline.

Keep the initial native sources, reports, exact tools and failed preflight logs
in their study/history folders. Two verifier assumptions were corrected: compare
new faces by directed polygon identity rather than transient face order, and
check retained native UV corners rather than assuming untextured cloth lacks UVs.
Ten focused behavioral tests cover the fold, anatomical compression, skin cutoff
and directed face inventory. Fresh full unit suite: 261 tests / 46 files; lint
zero errors with the existing ContentContext warning.

This is an initial construction screen and preservation/export-structure result,
not full fitting or art acceptance. Catalog revision `rolled-cuff-v1` is pending
art/not-verified and rest-only; preferred/canonical B04 remains unchanged. Full
detail distance/own-shell, independent and exact outfit sweeps, export fidelity,
actual Three.js/browser review, shoe refinements and budgets remain required.
Visible body uses the unchanged coverage mask; hidden-body contacts are not an
acceptance claim. Pocket/waist construction refinements remain open.


## Fresh dependent cuff proof and exact O04 study — 2026-10-07

The later `export-compatible-candidate/full-verification-v1/gate-report.json`
passes 25 fresh gates and explicitly reuses the unchanged 328-pose cuff screen
and reopened-source preservation. Tool/source hashes are captured before native
execution, guarded between gates and afterward; 19 tools and 16 source/proof
files matched at completion. Exact tool copies and native logs are retained in
`full-verification-v1/execution-source/`. This does not retroactively remove the
parent bilateral repair's historical construction provenance qualification.

Independent trousers and cap-free T01/B04/F01 and T04/B04/F03 combinations each
clear 163 body/layer poses and 164 B04 detail poses: zero contacts and 9.109729 mm
maximum distance under the original 12 mm limit. Both combined exports and
actual Three.js corrective checks pass all 16 poses, with combined bounds
7.168 and 6.460 micrometres under 30. A supplementary independent GLB comparison
passes 16 poses with 0.521 micrometre source/export error; the standalone Three.js
check's combined bound is 1.620 micrometres. Its `outfit.glb` is only a relative
symlink to the actual unchanged independent garment bytes for the existing Node
verifier. No new garment export is substituted.

Both complete-outfit browser fixtures pass desktop rest/walk/run and phone run
with no page/console errors, failed GETs or evidence failures; their only
failures are expected availability HEAD cancellations. These fixture cameras
crop feet, so they establish rendering/animation rather than cuff visual review.
The actual gallery's fitted camera then captures 12 standalone/O04 desktop/phone
rest and paused walk/run views, all inspected at 320px. Cuffs and the full figure
remain visible in those reviewed poses. Gallery reports retain 24 HEAD and 14
GET catalog cancellations without phase classification; do not claim a strict
whole-gallery or zero-failed-request pass from that capture.

Catalog `rolled-cuff-v1` now has recorded technical pass and working walk/run
controls, still pending art. O04 has its first explicit cap-free male fitting
study, `cuff-study-v1`; it uses the current head and existing T04/F03 and does
not finish their visual targets or the female variant. Canonical/preferred B04
and accepted IDs remain unchanged. Fresh full units pass 263 tests / 47 files;
focused catalog checks pass 36 tests; lint has zero errors and the known warning.
No fresh aggregate integration/release profile is claimed for this change.

Next: reference-matching pocket/waist construction on a separate bounded source,
then rerun affected proof. Cuff art approval, final shoe/head compatibility,
budgets and female fitting remain open. A source/export pass is not art approval.
