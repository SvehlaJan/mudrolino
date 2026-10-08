# F02 — navy slip-ons retrospective

Status: canonical source requires corrective-side repair; heel-tab own-shell
clearance also remains failed. Historical passes below do not establish current
acceptance. Final reference/style/budget and actual shoes-slot registration
remain open. Source: `F02.blend`; exports: `F02.glb` and
`body-F02.glb`. Reference: F02 in the palette-A footwear sheet and the O02/O06
outfit combinations.

The modeled pair has a continuous navy vamp, dark elastic side gores, modest
ivory rubber soles, navy collar rims and small flat orange heel tabs. It uses
the established F01 low-top clearance envelope but does not retain the sneaker
strap or tongue. The new shared low-top helper preserves anatomical foot/toe
orientation, Foot–ToeBase toe flex and ankle-region skin blending. Position
determines anatomical side. The pair has 5,140 vertices /
4,972 polygons, 24 groups and at most three normalized
influences. Reversible coverage hides 5,669
foot/lower-ankle vertices. 81 vertices
had tiny influences pruned before fitting to match the glTF 0.0001 cutoff.
Previous masters, foundation body/rig and shared gait are unchanged.

The first body sweep passed, but the attachment-distance gate failed at run
frame 7.25: the orange heel tab reached 12.777 mm from its shell, up from 10.594
mm at rest. Elastic panels stayed within 2.113 mm. Independent body-ankle
sampling gave the tab different weights from its attachment. The actual shoe
shell is now joined first; projected gores and tabs inherit its triangle-based
weights. That correction passed at 10.594 mm with unchanged geometry and the
same 12 mm limit. The failing report
is preserved as `fitting-revisions/independent-ankle-detail-weights.json`.

The complete outfit sweep then found 28 jogger/shoe pairs at run frame 7.25.
Material/rest-coordinate diagnostics isolated all shoe contacts to the standing
orange heel tab, with the jogger rear thigh as the opponent. Other upper, sole,
collar and elastic geometry was clear. The block is now a thin ribbon projected
onto the actual rear upper, extending modestly above the rim while retaining
the reference orange pull-tab construction. The gait, jogger, skinning and
clearance gates are unchanged. Preserve the earlier sweep and material
diagnosis in `fitting-revisions/standing-tab-layer-sweep.json`,
`standing-tab-layer-metadata.json` and `heel-tab-layer-diagnosis.json`.

The conforming ribbon reduced contacts to 14 but did not clear the deepest
kick; a rearward rigid lean also failed (16 pairs in the focused reproduction).
These rigid revisions are rejected. The tab is now treated as flexible fabric:
native knee-driven `knee_clearance_Left/Right` targets fold only the free tip
down against the rear upper, preserving its standing rest design, attached
base and the shared gait. The assembler retargets the native drivers and the
existing Three.js updater drives the actual exported targets. This changes the
deformation approach rather than continuing rigid size/position tweaks.
The first folded target cleared the focused kick but reached 13.559 mm from
the narrower lower heel in the attachment sweep. The target is now projected
onto the actual rear upper with a 4 mm outside offset, retaining tab length and
the same distance gate. That failing report is preserved as
`fitting-revisions/unprojected-fold-detail-fit.json`.
Historical direction/pose evidence and the rejected leaning-tab sources remain
in `fitting-revisions/`. The focused probe is preliminary; the full gates below
are the acceptance evidence for this candidate.

Historical verification on the then-current source: independent and
T02/B02/F02/A01 outfit sweeps each cover 163 quarter-frame walk/run poses with
zero body/head/layer contacts. Elastic/tab distance checks cover 164 poses and
pass at a maximum 6.586 mm against the unchanged 12 mm gate. Six cap
gestures pass. Fifteen GLBs validate with zero errors/warnings/infos/hints.
Fourteen-pose bidirectional source/export comparison passes at 5.360
micrometres; materials pass. Four fresh production-candidate browser cases
cover desktop rest/walk/run and phone run without page/console errors or failed
GETs, with expected availability HEAD aborts retained. The dedicated preview
matched the unchanged production build identity; no new build or broad
integration run is claimed. Current hashes and limits:
`../outfits/T02-B02-F02-A01/verification-summary.json`.

The separate 14-pose Three.js corrective probe verifies native Blender versus
exported target driving, with a combined source/export/driver geometry bound of
5.842 micrometres against the unchanged 30 micrometre gate. No app
runtime source was changed for this piece; the existing general updater is
used and actual browser animation is rechecked with the current assets.

Focused 320px footwear views make construction visible; the generic builder now
accepts review target/scale parameters. The shoes read as navy slip-ons with
orange tabs in front/side/back and complete-outfit views. A visibly rough upper/
collar edge still needs the common final art pass; fitting proof does not waive
that refinement. The folded tab's own shell clearance and final visual bend
also need the common art review. Full-body phone framing continues to crop feet. This is
candidate rendering through a substituted top-slot fixture, not actual
shoes-slot switching proof. Other bottoms/head variants/motions and final
geometry/material budgets remain unproven.

Apply before the next piece: author the intended footwear construction rather
than recoloring the sneaker; use the tested envelope when appropriate; fit
details to the actual shell, not a second body-weight sample; preserve failing
reports; inspect footwear closeups alongside full outfit animation; and compare
the exported model with its source after source/export normalization.

Next: F03 three-strap blue high-tops, which require a taller collar/coverage
analysis rather than assuming the low-top helper fits. B03 deformation remains
open. The complete twenty-wearable/six-head catalog, expressions, final art,
compatible combinations, mobile framing and runtime catalog registration remain
required. No published assets were replaced; no Meshy credits were used.

## New bilateral-key audit — 2026-10-04

The source audit in `artifacts/verification/avatar-catalog/corrective-side-audit.json`
finds inherited Left deltas in this source's Right correction. This is an
independent deformation defect even where historical body/layer checks passed.
The shared builders now use explicit neutral-basis shape-key creation. This
master is preserved pending repair and fresh body/layer/detail/export/Three.js
proof; previous evidence is historical and does not prove side isolation.

## Model audit clarification — 2026-10-06

The source-bound audit reproduced 12 opposite-side Right coordinates with a
maximum 11.367 mm displacement. The isolated bounded repair removes that leakage
without promoting its source. Both original and repaired candidates reproduce
178 heel-tab/shell pairs at run 12.25. The existing detail contract has a 12 mm
distance limit and zero prohibited own-shell contacts; no sewn/free attachment
roles are defined for this asset. Retain the historical T02/B02/F02/A01 summary
bytes, but do not count that combination as current complete acceptance while
these defects remain. See `docs/audits/2026-10-06-avatar-model-audit.md` and
`docs/avatar-construction-targets.md` for the repair order.

## Heel-tab attachment diagnosis — 2026-10-07

Fresh queued native probes from the unchanged isolated side-repair source
reproduce 20 pairs at rest and 178 at run 12.25. The run failure includes 118
Right-tab pairs while its knee corrective is zero. The existing tab skin closely
matches actual underlying rest-shell triangles, so incorrect weight transfer is
not established. Uniform offsets, larger knee targets, basal-shell rebinding
and a small skin-blend bracket all fail the unchanged zero-contact gate; some
also exceed 12 mm. No new model was saved or promoted. Reports, rejected no-save
scripts, logs, source hashes and measurements are preserved in
`fitting-revisions/heel-tab-shell-clearance-v1/`.

The next proposed scope is an independently proven ankle-dependent ribbon
correction with portable native/export/Three.js support, preserving the existing
knee semantics, shared rig/body/gaits, physically attached base and reference
shape. It is not implemented or accepted. See that diagnosis retrospective for
the exact bounded construction/proof contract. A short attachment distance and
correct underlying skin do not replace full-face shell clearance.
# Read-only ankle control diagnosis — 2026-10-07

The heel-tab no-save diagnosis now includes neutral bind and all 163 native,
glTF-equivalent and actual Three gait poses, plus one bounded iso-angle witness.
Left walk16.25 and walk18.497394180297846 have the same ankle twist within
1.858282e-9 rad in actual Three and zero existing knee values, yet differ in
full ankle rotation and source tab/shell fields. A single ankle scalar plus
the existing knee values cannot reconstruct those states. A conservative
one-angle clearance envelope remains untested. The portable driver/binder
convention is proposed for root review in
[the measurement evidence](fitting-revisions/heel-tab-shell-clearance-v1/diagnosis/ankle-measurement/portable-convention-proposal.md).
Native/runtime interpolation differences, exact endpoint behavior and off-axis
swing are explicit. Sources, model/gait GLBs, weights, knee semantics and strict
12 mm/zero-contact limits remain unchanged. No candidate or promotion occurred.


## Signed control payload and boundary proof — 2026-10-07

Root reviewed the proposed portable bind-relative semantics for an isolated
experiment. Signed twist/two-swing payload reconstruction passes all measured
rotations within 5.642e-8 rad; raw/Three component differences remain below
8.138e-7 rad. Eight exact LoopRepeat/adjacent-time poses were freshly measured;
dense payloads derive the unchanged earlier measurements. Four payload tests
pass. Root reproduced seven incomplete/relabelled-inventory false passes, added
complete ordered dense/endpoint checks, and passed eight proof tests. Exact
pre-hardening tool/report bytes are retained; the new report is explicitly
derived, not a fresh dense native run. No geometry or runtime binder changed,
and no repair model was saved. The next single conservative clearance-envelope
experiment remains unexecuted.

## 2026-10-08: independent-keys repair promoted

The repair's one failure was heel-tab contact with the shoe shell (up to 178
pairs). With one rule for every garment (`audit_catalog_detail_shell.py`), the
passing F01 has 2,164 rest / 2,374 worst detail-to-shell pairs, F03 has 405 / 406,
and the F02 repair has 1,342 / 1,608, of which 84 are heel tab. Most of this is
collars and soles overlapping the upper by construction. The repair passes every
gate F01 passes and is now the current male F02. Exact O02 (T02 hood-v2, B02,
this F02) on the +30% head passes all outfit gates, with export at 5.36 µm
(`../outfits/O02-head130-T02-B02-F02`). Collar and fold art remain open.
