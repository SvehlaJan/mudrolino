# F03 — three-strap blue high-tops retrospective

Status: fit-verified candidate. Revised B04 and both intended outfit verification
runs pass on their current source hashes.
Final style, geometry/material budget and actual shoes-slot registration remain
open. Sources: `F03.blend`, `F03.glb`, `body-F03.glb`.

The pair uses a cornflower-blue ankle-height upper, integrated navy collar,
three projected ivory straps, ivory sole and toe edging. Reference authority is
F03 in the original footwear sheet, O04 in the outfit sheet, and the new
four-view F03 construction sheet. The construction sheet's first generation
omitted a strap; a focused image edit restored exactly three before it was
saved. The model has 9,100 vertices / 9,012 polygons, 24 groups and at most
three influences. 83 tiny influences were pruned at the glTF 0.0001 cutoff
before fitting; the body topology, rig and shared gait are preserved.

Low-top geometry was insufficient for the taller shaft. Actual shin cross-
sections were measured on both sides, and the upper was fitted to the actual
body contour with a 4 mm margin before adding 2.5 mm cloth thickness. The navy
collar shares upper topology. The straps inherit the assembled shell's
triangle-interpolated weights; the middle strap uses a front-directed projection
to avoid the wedge produced by a top-directed cast.

An initial collar hit four body triangle pairs in selected poses. Contour
fitting cleared those, but the dense sweep then exposed up to 18 contacts at
run frames 2.5/2.75. Nearest-body-vertex weights differed from triangle-surface
weights by up to 4.2559 percentage points at contact vertices. The taller shaft
now uses interpolated body-surface weights while retaining controlled toe/sole
flexion. The current independent 163-pose sweep is clear and the 164-pose strap
distance check passes at 4.960 mm against the unchanged 12 mm limit.

Closeups exposed jagged shin gaps from a simple vertex-height mask: removing a
vertex also removed incident faces that extended above the opening. Coverage
now selects only vertices whose entire incident faces lie below 181 mm, four
millimetres below the 185 mm opening. 7,159 covered vertices preserve the
original body indices. The source-bound opening gate passes with zero boundary
violations. A separate unsafe fixture reproduces the old mask: 366 removed
faces cross the safety boundary, reaching 198.711 mm. The gate correctly rejects
it with exit 1, accepts the current mask and proves the master was unchanged.
The regression summary is under
`artifacts/verification/avatar-catalog/F03/coverage-regression/`.

The original O04 fixture found 596 trouser/shoe pairs in running and 250 at
rest. Diagnostics separated rear ankle overlap from deep-kick rear hip contact.
An isolated B04 study adds 12 mm maximum posterior cuff ease and interpolated
body-ankle weights; it clears rest/walking overlap but retains up to 176 deep-
kick contacts. Body-aligned rear hip weights address differences of up to
36.498 percentage points, leaving 164 contacts. Excess rear cloth ease still
meets the boot. A native knee-driven rear-panel compression target moves that
panel toward the body with a 6 mm margin during flexion and preserves its rest
design. The complete study outfit clears all 163 poses. The measured B04 study
has been promoted with the original source retained; canonical sneaker and
high-top outfits now have fresh complete proof. Both pieces are counted as
fit-verified candidates. F03 geometry was not shrunk to evade the reference and
the shared animation was not reduced.

The workflow improvements are now reusable: contour fitting, triangle-based
tall-shaft skinning, face-safe opening coverage with a rejecting regression
fixture, exact material/rest/posed contact diagnostics, local cuff/hip weight
transfer and portable rear-cloth compression. The export and Three.js
corrective comparison now include the observed deepest-kick frame 7.25, in
addition to the prior sampled poses. Preserve failed studies and source hashes. A five-case collector regression
accepts current reports, rejects missing deep-kick export/runtime poses despite
unchanged sample counts, rejects an unsafe opening report, and accepts restored
reports while keeping real evidence byte-identical.

## Current verification

Fresh independent and T04/B04/F03/A01 sweeps each pass 163 quarter-frame
walk/run poses with zero body/head/layer contacts. Strap attachment passes 164
poses at 4.960 mm against 12 mm. The opening gate and
safe/unsafe regression check pass. Six cap gestures pass; 15 GLBs validate with
zero errors/warnings/infos/hints and materials pass. Fifteen-pose bidirectional
source/export comparison, including run 7.25, passes at
5.360 micrometres. Actual Three.js corrective driving of B04 passes all
15 poses; combined source/export/driver bound is
6.471 micrometres against 30 micrometres. The reverified sneaker
outfit bound is 7.179 micrometres.

Four fresh production-candidate browser cases per outfit cover desktop
rest/walk/run and phone run without page/console errors or failed GETs. Expected
availability HEAD aborts remain recorded. The unchanged production build
identity matched the dedicated preview; no fresh app build or broad integration
run is claimed. Current hashes and exact scope:
`../outfits/T04-B04-F03-A01/verification-summary.json` and
`../outfits/T01-B04-F01-A01/verification-summary.json`.

The exact run 7.25 regression was rendered separately in three 320px views.
Its pose-review metadata matches the verified current outfit hash, records zero
contacts and the active right-knee corrective at 1.0. Visual review confirms
the shoe construction and separated rear panel at the formerly failing kick.
The independent front/side/back closeups preserve the visible shin boundary.
Final collar smoothing, reference/material polish, detail-to-own-shell checks
and geometry budget remain in the final art pass. Default browser phone framing
still crops the feet. This is skinned rendering through candidate substitution,
not actual shoes-slot switching proof.

Apply before F04: use actual body contours and surface weights for tall ankle
footwear, face-safe coverage and the opening regression gate; project small
details onto their actual parent shell; diagnose rest ease separately from pose
skinning; preserve failing studies; include known difficult poses in native,
exported and actual Three.js comparisons and exact-pose visual review.

Next: F04 orange ankle boots. B03 deformation remains open.

The full twenty-wearable/six-head catalog remains required. Final body/head
style, budgets, expressions, other compatible combinations/motions, complete
mobile framing and actual slot registration/switching remain open. These
checks establish fitting candidates, not final catalog acceptance. No published
assets were replaced and no Meshy credits were used.

## New combined-proof limitation — 2026-10-04

F03's independent source remains unchanged and has no corrective keys. A new
side-isolation audit exposes copied Left deltas in the combined outfit's B04
Right key. Historical combined contact/export proof does not prove intended
side behavior. Repair B04 and refresh O04 and the sneaker comparison before
final combination acceptance; preserve the F03 construction/opening proof.
