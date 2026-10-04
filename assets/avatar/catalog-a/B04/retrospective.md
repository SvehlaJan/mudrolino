# B04 — ivory tapered trousers retrospective

Status: fit-verified candidate; final reference/style/budget and runtime catalog
registration remain open. Source: `B04.blend`; exports: `B04.glb` and
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
