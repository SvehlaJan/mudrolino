# First female T02 / B01 / F01 capsule

The user reviewed the female H02 front/back study and chose to keep its
proportions and fit the first outfit. This isolated capsule uses the orange
T02 pullover hoodie, navy B01 straight trousers and blue/ivory F01 one-strap
sneakers. It is not reference O02 (which uses T02 / B02 / F02).

The female foundation `.blend` remains SHA-256
`f140ec1b4aa50c3e928c679773d23e23d16f07f157f63dcad4512c4acda200fc`.
Body/head/hair coordinates, topology, original vertex order, skeletal weights,
rig/bind and saved actions are fixed. Coverage is recomputed against the female
body; canonical male masters remain unchanged. Per-piece sources are editable
under `pieces/T02`, `pieces/B01` and `pieces/F01`.

## Measured rejected attempts

`history/unfitted-existing-geometry` retains the unmodified garment probe. T02
had up to 717 hair triangle pairs at run 7.25. Incident-face-safe F01 masking
exposed roughly 194 opening-adjacent body pairs that the older vertex mask hid.
B01 and garment layers were clear in the initial diagnostic poses; those poses
alone did not establish a complete-cycle fit.

`history/first-local-refit` retains the first hood projection and opening relief.
Projection did not solve the running hair envelope. F01's remaining contacts
belonged to its tongue/strap rather than the cleared collar.

`history/rejected-folded-projection` retains the later projection: all six head
gestures and F01/body contacts cleared, but 76 hair pairs at run 7.25, 321
hood/shirt pairs and 1,431 closure/shell pairs remained. The hood visibly
crumpled. Projecting a thick folded mesh onto another surface can collapse its
ordered shape; a short attachment distance cannot establish zero intersections.

`history/controlled-first` retains the fresh hood/closure attempt. Main
body/head/hair/garment layers, hood and sneaker closure cleared the native
complete sweep, but the inherited pocket weights caused up to 257 shirt/pocket
pairs at run 15.25. Its original native-action vs Three.js comparison also
failed at approximately 195 micrometres. The latter was an interpolation
mismatch: Blender scalar quaternion curves and glTF quaternion SLERP describe
different poses between keys. It was not justification for moving vertices or
relaxing the 30-micrometre bound.

## Current construction and verification method

The hood is an ordered sheet fitted to actual shirt triangles, then thickened;
the tongue and strap are controlled instep surfaces fitted to the cleared shoe
shell before thickness. Explicit role attributes preserve independent detail
checks after joining meshes. Hood sewn anchors and free bowl are separate;
B01 seam embedding is reported explicitly rather than silently exempting all
details.

The pocket keeps its authored rest coordinates, silhouette and thickness. Its
weights now interpolate the actual fitted shirt triangles. A focused seven-pose
probe clears the previous run regressions with a maximum attachment distance of
4.795mm against the unchanged 12mm limit. Complete proof is recorded separately.

F01 preserves exposed ankle/instep anatomy using a 114mm incident-face-safe
coverage cutoff below the 118mm opening. T02 neck/wrist and B01 waistband/ankle
removed-face boundaries have their own gates. Each saved independent master is
compared with its assembled counterpart, including geometry, weights, roles,
modifiers and rig/action binding.

Fit is checked twice: under the saved native Blender actions and under actual
glTF LINEAR/SLERP poses. Source/export parity uses equivalent glTF poses before
comparison with Three.js. Canonical gait bytes and saved actions remain
unchanged. The raw evaluator's 24 bone matrices are also compared with Three.js;
a rendered browser check remains a separate gate.

Both `body.glb` (consumed by the runtime) and `outfit.glb` must preserve the
canonical fictional face PNG and position/corner-bound UV assignment. The UV
negative probe swaps corners while preserving the UV value multiset and must
fail. This remains a texture transport fixture, not selfie likeness or a
selfie generation endpoint.

The runner writes running state before source loading, clears previous outputs,
requires current structured JSON after successful commands, and rejects stale
sources/dependencies for reuse. Zero process exit alone cannot produce a pass.

## Final fresh technical proof (2026-10-05)

All 15 runner gates passed fresh. No geometry changed after the pocket-weight
rebuild. Main source SHA-256 is `79d3dbb62e64143932bf56d7ba43046dace4123f51c3393f79cdd6e9bb5a914f`; outfit GLB is
`bfb4e2f83310b8aac574b89d59d50d047d280ef4890189db3d322e9c2c1f6002`. The native report captures 49 catalog Python helper hashes
at execution start, verifies they are unchanged at the end, and binds 62 source
and dependency hashes. Current source validation passes; future reuse rejects
changed helper/source/assembly/gait/PNG bytes.

| Gate | Result |
| --- | --- |
| Saved native motion | 163 poses each for T02, B01, F01 and combined; zero body/head/hair/layer contacts |
| Actual glTF SLERP motion | Separate 163 poses each for all four cases; zero body/head/hair/layer contacts |
| Details | 164 poses per role in each motion system; pocket/hood/closure own-shell and closure mutual contacts zero |
| Sewn attachment maxima | Pocket 5.408 mm; hood 3.790 mm; sneaker closure 8.575 mm; limit 12 mm |
| Hood free extension | Maximum growth 0.132 mm; limit 3 mm |
| Six head gestures | Clear, rigid head/hair attachment preserved |
| Native 16-pose export parity | 1.106 micrometres |
| Equivalent glTF 16-pose export parity | 1.201 micrometres |
| Actual Three.js | 0.808 micrometres; zero unmatched; raw evaluator bone matrices agree |
| Combined export/Three bound | 2.009 micrometres against unchanged 30 micrometres |
| All twelve GLBs | Khronos validation and material gates passed |
| Face transport | Both runtime body and outfit image/UV corner identity passed; UV corner-swap negative rejected |
| Openings and masters | All declared incident-face boundaries and saved independent-master equivalence passed |

B01 seam role 3 intentionally embeds in its cloth and is reported separately:
maximum 940 native / 939 actual-runtime seam/shell triangle pairs. It is not a
strict zero-contact detail. All strict own-shell roles remain zero. This proof
does not visually approve the hood or promote the study to production.

## User visual feedback after this technical wrap-up

The user requested a fuller, more recognizable hood for the **next visual pass
after wrap-up**. The current hood is not visually accepted. Keep this source
frozen for the completed technical proof, then create a separate fuller controlled
bowl revision. Preserve the chosen body/head/hair proportions and fixed H02;
repeat both native and actual runtime fit, own-shell, attachment, UV/export and
browser gates on that revision. A passing clearance result does not approve the
hood silhouette.

## Acceptance boundaries

Read `fit-verification-report.json`, `export-deformation-report.json`,
`runtime-deformation-report.json`, `export-validation.json` and per-GLB material
reports for current source hashes and exact results. Browser evidence lives in
`artifacts/verification/avatar-catalog/female-outfits/T02-B01-F01/browser/`
and `artifacts/verification/avatar-catalog/model-studies/female-outfit-T02-B01-F01-study/`. Native runner logs live under
`artifacts/verification/avatar-catalog/female-outfit-T02-B01-F01/`. History reports
bind their historical sources and do not establish current acceptance.

This remains an isolated technical candidate. Final clothing/hood silhouette,
texture likeness, mesh budgets, other wardrobe/headwear combinations, real slot
switching and broader ordinary app framing need separate acceptance. The bounded
representative desktop/phone browser cases show the complete female body and footwear;
refresh their proof on the final exported bytes. No
canonical or published avatar asset is promoted by this study.

## Painted face rebuild (2026-10-05)

The frozen H02 foundation now embeds a painted default face instead of the
diagnostic fixture; its geometry, hair, body, rig and actions are byte-identical.
The capsule was rebuilt with the recorded parameters (`--opening-relief .009
--back-relief .03 --back-clearance .0045 --controlled-components`): `garments.glb`
and every garment-only export came out byte-identical, while the files that embed
the head changed (`outfit.glb` 412b48ef…f23ec9). The full runner passed all 15
gates fresh, with the same 2.009 micrometre combined bound, and
`verify_model_studies.mjs` passed the study on desktop and phone. The hood is
still the shallow technical baseline; the fuller hood remains open.
