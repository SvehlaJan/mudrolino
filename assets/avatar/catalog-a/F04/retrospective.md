# F04 — orange ankle boots: authoring and fitting checkpoint

## Reference and construction

The original footwear category sheet and `11-ankle-boot-construction.png` guide
the orange Chelsea-style upper, navy side gores, ivory sole and orange fabric
heel loop. The gores use the loft's actual side sectors, not its front/rear
sectors. The source has 8,428 vertices, 8,348 polygons, 24 bone groups and at most
three normalized influences. Triangle-interpolated ankle weights and measured
body contours preserve the shared gait; face-safe coverage keeps the visible
opening above the 181 mm boundary. Final smoothing and geometry budget remain
open; this is a candidate rather than final art.

## What failed and what changed

The standing loop hit the body during deep flexion. A knee-driven fabric fold
cleared the body, but the stricter attachment gate found 59 loop/shell contacts
at run 15.25. Rest-space projection and posed-shell calibration did not resolve
them. A manual linear-skinning diagnostic matched Blender within 0.184 micrometres,
so the skin matrix was not the cause.

Probing all shape-key contributions found the actual cause: Blender's default
mixed-shape creation copied the left-foot fold into the right-foot key. Both
knees then folded the left loop. Explicit `from_mix=False` creates independent
keys from Basis. The corrected Right key moves no opposite-side vertices;
each key moves 39 vertices on its intended foot. Preserve the failed source and
reports in `fitting-revisions/before-independent-keys/` as a reproduced negative
case. The current source-side report accepts the repaired file.

The original 12 mm all-vertex attachment threshold also rejected the intentional
raised free portion at rest (21.940 mm). Define sewn ends explicitly (24 anchors,
84 free vertices). Keep the 12 mm anchor limit, allow at most 3 mm free-extension
growth from the rest reference, and separately require zero own-shell contacts.
This distinction preserves the pictured loop without treating intentional free
fabric as a detached seam.

## Fresh independent proof

Current SHA-256: `0b1cd9c787f5c35ef9241d589aebd58cfe02d5c49739838d49d0fd4ffb1a35fc`.
The full native body/head sweep passes 163 quarter-frame walk/run poses.
The loop gate passes rest plus both clips (164 poses), with zero loop/shell
contacts, maximum anchor distance 10.698 mm, and no free-extension growth.
Selected native front/side/back views are 320px review renders. No complete
outfit or browser/runtime acceptance is claimed by these independent checks.

## Intended outfit and remaining work

O05 requires T05/B01/F04/A02. A02 remains unauthored, so the isolated fitting
studies currently test only its T05/B01/F04 core. Original navy trousers had up
to 584 boot contacts. A first tall-footwear cuff/hip revision reduced this to
95; diagnosis shows all remaining pairs involve the raised heel loop at the
rear cuff. Measured additional rear cuff room clears every walking pose and
reduces the full sweep to eight contacts at run 7.25, involving the loop and
rear thigh. The 4 mm local cloth-compression study clears the remaining eight pairs. Its fresh full sweep has zero body/head/layer contacts over 163 poses; side isolation passes. Sixteen-pose bidirectional source/export comparison passes at 5.740 micrometres and the actual Three.js corrective driver passes at a combined 7.623 micrometre bound, below 30 micrometres. Evidence is in `fitting-revisions/T05-B01-F04-loop-compression-study/`. The opening gate also passes with zero removed faces above 181 mm. Browser rendering and final complete-outfit acceptance remain pending.
Canonical B01 has not been replaced. Preserve failed studies and refresh every
affected B01 outfit if a revision is promoted.

Intended complete outfit including A02, source/export and actual
Three.js proof, browser rendering, final style/material/budget, additional
motions/heads and actual shoes-slot switching remain required. The full current
catalog and subsequent female-character phase remain open.

## Workflow improvements applied

Use explicit neutral-basis creation for independent corrective keys. Add
`verify_catalog_corrective_sides.py` to the sequential runner and proof collector:
a green contact sweep cannot establish that the intended side drives a correction.
Audit found the same contamination in B03, B04 and F02; their corrections need
repair and fresh proof rather than treating historical contact checks as final
acceptance. This gives a concrete new route for the unfinished B03 deformation.

Verify flexible sewn ends, free extension and own-shell clearance independently.
Include both run 7.25 and 15.25 in the sixteen-pose export/Three.js profile.
Diagnose contacts by both cloth and opposing material role before changing a
cuff or fold. The new beanie/backpack/scarf construction sheets clarify the next
attachment work while retaining the approved designs and IDs.
