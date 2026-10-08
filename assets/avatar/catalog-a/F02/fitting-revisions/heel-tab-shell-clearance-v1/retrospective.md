# F02 heel-tab shell clearance diagnosis — 2026-10-06/07

Status: **unresolved; no repair model saved, exported, promoted or accepted**.
This directory preserves source-bound diagnosis and rejected no-save probes. It
is not a fitting candidate. The exact starting source is the previously isolated
12-coordinate side repair at `../independent-keys-repair/F02.blend`, SHA-256
`92ffa5913e4eaec9015b8e414f38b757e032375fc3d1194f4932dffd17a25f0f`.
Canonical F02, the isolated source/exports, and shared foundation/walk/run bytes
remain unchanged. `diagnosis-summary.json` binds those files and all retained
reports, scripts and native logs. No Meshy, browser, publication or spending was used.

## Reproduced failure and attachment evidence

Fresh queued Blender diagnoses reproduce 20 tab/shell pairs at rest and 178 at
run 12.25: 141 upper / 37 collar / zero sole pairs. At that run pose, 60 pairs
belong to the Left tab and 118 to the Right tab; Right knee correction is zero.
At run 12.75 Right knee correction is also zero, while substantial Right-tab
contacts remain. Increasing a knee target cannot repair an inactive target.

The source contains 60 tab vertices in two thickened five-row / three-column
ribbons. Lower rows have approximately 90% Foot / 10% Leg skin; upper rows have
approximately 50% Foot / 50% Leg. The existing detail weights already match the
actual nearest rest-shell triangles within a maximum 0.00117 percentage-point
difference (`attachment-weight-diagnosis.json`). Thus a simple erroneous
nearest-shell transfer is not established. A ribbon spanning that ankle-blended
surface can still intersect the full shell envelope under motion. A short
vertex-to-followed-triangle distance does not establish face clearance.

At Right/run 12.75, rear-ray instrumentation estimates up to 11.655 mm of
rest-coordinate movement for a 1.5 mm outer-shell margin in middle rows, while
the basal row reaches 3.771 mm. These are diagnostic ray results, not complete
penetration bounds or accepted target coordinates. A static displaced or bowed
ribbon at that scale would require reference/base-attachment review; the existing
12 mm distance check alone would not justify it.

## Rejected full 164-pose screens

Every native probe retained the original 12 mm distance limit, required zero
prohibited own-shell pairs, and kept `attachment_roles: null`. Each screen used
rest plus all 163 quarter-frame gait samples, including clip endpoints. All
probe models existed only in memory; sources were restored and never saved.
Exact per-pose reports, their native source scripts and completed logs are under
`diagnosis/rejected-no-save-probes/` and `diagnosis/native-logs/`.
Execution logs have byte-identical `.txt` copies so ordinary Git inventory retains
them. The summary binds those copies and their original paths; the initial summary
is preserved under `history/pre-trackable-log-copies/`. This is an evidence-copy
repair, not a fresh native run.

| Probe | Maximum shell pairs | Maximum distance | Result |
| --- | ---: | ---: | --- |
| Original source | 178 | 6.258 mm | Failed contact |
| Uniform rear offset 1 / 2 / 3 / 4 mm | 141 / 100 / 80 / 52 | 6.664 / 7.187 / 7.804 / 8.494 mm | Failed contact |
| Larger diagnostic offsets 5 / 6 / 7 mm | 56 / 42 / 30 | 9.240 / 10.031 / 10.989 mm | Failed contact; outside initial candidate bound; no floating-tab candidate saved |
| 1 mm rest offset + own knee target extra 4 / 8 / 12 mm | 110 / 110 / 110 | 8.991 / 12.987 / 16.985 mm | Failed; last two also violate distance |
| Actual basal-shell triangle skin throughout the column + 1 mm offset | 100 | 28.208 mm | Failed contact and distance |
| Original-shell/basal-shell skin blends 10 / 15 / 20 / 25% + 1 mm offset | 132 / 136 / 135 / 123 | 8.274 / 9.294 / 10.328 / 11.374 mm | Failed contact |

The small blend bracket was stopped. There is no accepted geometry/weight
proposal, so no new saved/reopened source-invariant, body/layer, export or
Three.js gate was run for a repair candidate. Earlier side-repair proof remains
bound to its unchanged source; it does not accept this unresolved tab defect.

## Concrete next construction/deformation proposal

Scope a separate ankle-dependent correction for the heel ribbon. Preserve the
current knee keys/drivers and gait bytes. First measure each foot's local Foot
rotation relative to Leg across the exact native and actual glTF/runtime poses,
including the inactive-knee run 12.25/12.75 regressions. Establish the neutral
range and relevant plantar/dorsiflexion branch from those measurements; do not
infer it from viewer-perspective side names or knee angle.

Author independent `ankle_shell_clearance_Left/Right` targets from neutral Basis
with `from_mix=False`, bounded to the 30 anatomical tab vertices per side. Keep
the basal columns physically attached to recorded underlying rear-upper
triangles; fit the free ribbon to the actual posed outer shell, then invert its
skin transform to derive targets. Maintain the ordered patch, reference width,
thickness and recognizable standing rest tab. Repair the measured rest collar
crossing separately with a small local surface correction. Do not enlarge the
whole ribbon's offset or introduce contact exemptions.

This is **additional pipeline work**, not a feature of current exports: the
native portable driver, exporter and actual Three.js binder/verifier must agree
on ankle semantics before the new target can be used. Existing knee targets
must produce the same values as before. Prove opposite-side isolation and the
saved/reopened invariant contract, then require all 164 detail samples to have
zero prohibited pairs and remain below 12 mm. Require independent and exact
outfit body/layer sweeps, source/export and actual Three.js proof, plus 320px
reference/base-attachment reviews. O02/O06 combinations and final art acceptance
remain separate; no new target or runtime code was implemented here.

## Reproduction and tooling boundary

`tools/blender/catalog/diagnose_catalog_f02_tab_rows.py` refuses a changed source
or overwritten report. Queue it through `tools/avatar/blender_queue.py` and use
an unused report path. The preserved probe scripts are deliberately diagnostic,
including the rejected offsets outside the initial 4 mm bound; they never save
models. `f02_tab_offset_plan.py` and `f02_tab_anchor_plan.py` are pure bounded
planning contracts, each covered by three behavioral Vitest tests. Their outputs
are not proof that a model clears or is physically/visually acceptable.

Workflow lesson: test the inactive side and actual ankle envelope before
increasing a knee target. Actual triangle skin transfer, attachment distance,
whole-face shell clearance and reference/base attachment are separate gates.
Stop an unsuccessful parameter bracket rather than optimize a floating ribbon
into a misleading technical pass.
# Read-only ankle measurement follow-up — 2026-10-07

The subsequent measurement phase preserves this revision as a rejected no-save
diagnosis. Neutral bind plus all 163 gait poses were measured in the saved
native source, at actual glTF SLERP-equivalent poses, and with the actual
Three.js AnimationMixer/existing knee binder. Raw glTF versus Three twist
differs by at most 7.546e-7 rad; saved-native versus exported SLERP differs by
up to 0.001240497 rad and is recorded separately. Off-axis swing reaches
0.355192 rad (20.35 degrees).

One bounded iso-angle witness establishes a limitation of the proposed single
ankle scalar. Left walk16.25 and walk18.497394180297846 have actual Three twist
values within 1.858282e-9 rad and both existing knee values exactly zero. The
unchanged source at equivalent poses differs by 0.167224572 rad in full ankle
rotation and 7.673264 mm in tab positions relative to Foot. Nearest tab/shell
gap vectors differ by 0.344727 mm; both poses retain 10 Left own-shell pairs.
This proves ambiguous deformation inputs, not a passing correction or a claim
that a conservative one-angle clearance envelope is impossible.

The [portable convention proposal](diagnosis/ankle-measurement/portable-convention-proposal.md)
specifies anatomical signed bind-relative twist, a full local rotation payload
and a possible pair of signed swing components, native/runtime parity tolerances,
side/endpoint rules and the remaining source/export/Three fitting gates. Root
must review these semantics before implementation. The measured native and
runtime inactive Right knee cases at run12.25/run12.75 remain zero with 118/120
Right own-shell pairs. No runtime correction, new source or exported model was
created. All nine protected asset hashes remain unchanged. Code is frozen and
native sessions 66300/80135 completed successfully through the shared queue.
