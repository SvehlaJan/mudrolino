# B04 centre keys and full garment shell — 2026-10-07

The previous cropped centre audit found 18 inherited Right-key coordinates. A
fresh complete inventory checks all 7,856 vertices, both keys, and signed X with
no centre/height exclusion. It finds **41** nonzero Right coordinates on positive
X, all exactly inherited from Left. Left has no opposite-side movement. The
shared constructor's side mask already makes Right influence zero on positive
X; the old side verifier's 40 mm exclusion missed this construction mismatch.
The proposed reset preserves all 701 intended Right coordinates and all eight
other invariant groups, including body, rest topology, weights, cuffs and gaits.
Four behavioral tests cover the exact boundary and rejection of unexpected data.

Fresh guarded comparison has 164 native plus 164 equivalent-runtime samples for
each baseline/repair variant. The repair keeps visible body, F01/F03, and detail
own-shell pairs at zero; max detail distance improves **9.110 → 7.303 mm**. It
still has up to **42** self-pairs involving affected cloth faces, also present in
the unchanged baseline. Total scoped self-pairs decrease 3667 → 3197 per domain.
That is partial improvement, not a cleared construction candidate. No blend or
GLB was saved. Both adapter rest-matrix errors are exactly zero.

The initial comparison captured the previous gait as the second adapter's rest
pose. Its huge repaired-runtime counts are **invalid**, not a model regression.
Exact original code/log/report and `INVALID-RUNTIME-REST.md` are preserved under
`non-saving-probe/`; the guarded run is separate. A tested matrix guard rejects
posed/missing-bone captures; reset happens before each adapter construction.

A separate full-surface audit expands the previous check to every nonincident
pair of the saved garment's polygons. It finds **55 at rest**, and maxima
**548 native / 549 equivalent-runtime** at run 7.25 across complete 164-pose
domains. Earlier passing body/layer/detail/cuff/export reports remain their exact
recorded scope; they did not establish complete cloth self-clearance. Source
hash stays `291d4927…`, garment GLB `9e843fcf…`; no canonical asset changed.

Fabric-only face/edge connectivity yields two layers of 2144 faces / 2223
vertices. Rest pairs: 13 outward/outward, 33 mixed, 9 inward/inward. Deep run:
86 outward/outward, 376/377 mixed, 86 inward/inward. This rules out treating it
as only a lining offset problem. At the worst pose, 474/475 pairs are between
faces with rest centroids on the right side, and 241 span rest heights over
150 mm: the folded leg is a separate contact family from the central crotch.
These centroid categories are diagnostic, not accepted-contact exemptions.

The BVH callback's triangle-intersection check is documented in the
[Blender implementation](https://raw.githubusercontent.com/blender/blender/main/source/blender/python/mathutils/mathutils_bvhtree.cc).
This upstream source is method context, not an asserted match to the installed
binary commit. The actual native Blender 5.2.2 logs, exact face IDs/coordinates,
all pose pairs, tool/input hashes and 320px contact-face cutaways are retained in
`full-shell-diagnosis/`. Root inspected both cutaways; they show selected exact
source contact faces and are not full outfit art. Full shell audit and pose-rest
guarding must become explicit early checks for other garments too; their whole
shell clearance is currently unproven, even where narrower reports passed.

Next construction order: diagnose the 13 rest outer-crotch crossings and the
separate same-leg deep-fold contacts, then make one bounded shell proposal on
the unchanged baseline while protecting cuff geometry/openings and the shared
body/rig/gaits. Establish an ordered nonintersecting outer surface and consistent
thickness/skin before redoing independent centre keys and the broad rounded
pockets. Preserve the reference target and every failed experiment; do not
shrink the design or relax zero-contact/12 mm limits to obtain a pass.
