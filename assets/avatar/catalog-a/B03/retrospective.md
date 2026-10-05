# B03 — navy shorts retrospective (active fitting)

Status: authored prototype; **not fit-verified or accepted**. B03 remains open; independent catalog work can proceed while its deformation approach is redesigned. The complete 20-wearable/six-head catalog remains required.

The independent `B03.blend` / `B03.glb` / `body-B03.glb` contain knee-length navy shorts, restrained hem/waist trim, orange inside facing, projected front openings, rounded back pockets, fly, button and belt loops. Shared quad pelvis/crotch topology and economical eight-sided seam tubes produce 4,592 vertices / 4,576 polygons, 24 groups and at most four normalized influences. The mask now hides only 2,317 permanently concealed pelvis vertices, preserving thighs, knees, shins and feet for the rolled hem.

The original straight-trouser-based loft passed rest views but failed selected walk/run samples (144 / 569 body pairs). Diagnostics traced these to exposed folded shins, then heels. A 26 mm posterior-ease revision did not solve deep kicks. Inflating the rear via morphs looked unnatural and moved contacts rather than resolving them. The current prototype rolls the rear hem upward with knee-driven corrective targets, fits the targets outside the actual thighs, and transfers rear lower-leg influence onto the thigh. The original shared gait and previous garment masters are unchanged. Maximum measured knee flexion is about 73.4 degrees in walk and 145.3 degrees in run; do not reduce the gait just to make this garment pass.

Current complete-cycle fitting remains explicitly failing. The current-source
fitting experiment checks 163 walk/run poses against the body and F01 sneakers.
Its baseline has maxima of 338 body pairs and 436 shoe pairs, with 6,592 total
pairs across the cycle. Earlier representative outfit proof found maxima of 70
body pairs and 436 layer pairs; those reports must be regenerated against the
current source before acceptance. A clear representative walk frame is
insufficient.

The offline nearest-surface projection study is rejected. Six iterations raised
total contacts from 6,592 to 13,528 and body/shoe maxima to 791/1,617. The tool
saved an additional unevaluated proposal after that final measurement, so its
output is not accepted evidence. The canonical B03 master was preserved. Report:
`fitting-revisions/animated-fit-study.json`; source:
`fit-study.blend`. This demonstrates that independent surface pushes applied to
one knee-only target do not solve coupled thigh/calf/heel contacts across the
cycle. Next deformation work should use a pose-dependent treatment of the
complete leg/foot obstacle, preserving the catalog's rest silhouette and shared
gait, rather than continuing the same inflation/projection loop.

The morph round-trip issue is now isolated and fixed. Rest and unskinned full
targets agreed within 0.28 micrometres, while posed error came from one source
vertex with a 0.000094195 lower-leg influence. Blender 5.1's glTF exporter drops
influences at or below 0.0001. `catalog_piece.normalize_skin` now prunes those
weights and renormalizes the master before fitting and export, matching exported
skinning. One B03 vertex was pruned; prior verified masters were not rebuilt.
The reusable `diagnose_catalog_morph_export.py` isolates basis/full targets and
posed skinning. Historical failing measurements were 66.793 micrometres for the
same-value export and 79.010 micrometres combined. Current source/GLB hashes
verify the corrected same-value comparison at 6.068 micrometres and Three.js
target driving at 12.217 micrometres, for a combined 18.284 micrometre bound below
the unchanged 30 micrometre gate. This proves export fidelity, not collision-free
fit. Reports: `../outfits/T01-B03-F01-A01/export-deformation-report.json` and
`runtime-corrective-report.json`; diagnostic:
`fitting-revisions/morph-export-diagnosis.json`.

Earlier GLB/material and four-case production browser checks passed, but those
must be refreshed after final fitting. No successful B03 verification summary
has been written.

Runtime work has independent verification: the new knee-corrective updater passed three behavioral tests (flexion/straightening, clamping/scaling, legacy garments), all 87 unit tests, pure verifiers, lint with zero errors and the existing ContentContext warning, and the fresh integration profile with 472 browser tests. Development audio inventory accepts the existing 40 pending recordings; this is not a release/audio-strict pass. Report: `artifacts/verification/2026-10-04T03-54-15-350Z-integration.json`. A fresh avatar-enabled production build retains the lazy renderer boundary (main JS 275.42 kB; AvatarScene 973.94 kB). The later verification-tool type guard also passes fresh lint. No published assets were replaced.

Workflow improvements applied: shared projected waist/pocket construction avoids Bezier overshoot and excessive detail topology; copied corrective drivers retarget to the outfit rig; GLB shape fidelity is checked at identical evaluated master values, while native Three.js joint driving is checked independently. The sequential runner automatically requires corrective proof and the consolidator rejects absent/stale/failing proof for these targets. Preserve observed failures rather than reporting browser rendering as fitting acceptance.

Next actions: replace the unsuccessful deformation approach, then recheck
complete independent and combined cycles, stitched details, self-intersection,
exported shapes, driver agreement and actual browser rendering. Keep B03 out of
the verified inventory. B04 trousers can use independently established full-leg
topology while this work remains open; finishing B04 does not resolve B03.

Still open: remaining catalog assets and heads, final art/material/geometry budget, expressions/feedback motions, all compatible combinations, full-body mobile framing and actual slot registration/switching. No Meshy credits were spent.


Fitting-study workflow verification: the revised tool evaluates each candidate
before saving, rejects any body/shoe maximum or total-contact regression, and
restores the last measured best target. A fresh study reproduced the first
regression (6,592 to 7,853 total pairs), stopped immediately, and restored the
original target coordinates exactly (maximum saved target change 0 m). The
canonical source hash is unchanged. This verifies the regression guard and
avoids five wasted iterations; it does not fix B03. Evidence:
`fitting-revisions/animated-fit-study-monotonic.json` and
`fit-study-monotonic.blend`. Keep the rejected six-pass study as history.

## New bilateral-key audit — 2026-10-04

The source audit in `artifacts/verification/avatar-catalog/corrective-side-audit.json`
finds inherited Left deltas in this source's Right correction. This is an
independent deformation defect even where historical body/layer checks passed.
The shared builders now use explicit neutral-basis shape-key creation. This
master is preserved pending repair and fresh body/layer/detail/export/Three.js
proof; previous evidence is historical and does not prove side isolation.
