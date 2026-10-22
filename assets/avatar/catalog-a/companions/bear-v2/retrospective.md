# Bear B reference rebuild — 2026-10-21

Status: Meshy base approved; refined celebration-v2 passes asset gates. Final animated-revision approval, game integration and storage/publication remain open.

The user rejected bear-v1/head35 because it did not resemble selected reference B. Its technical tests proved export/motion behavior, not fidelity to the artwork. The restart uses new stocky bear anatomy. Canonical human geometry, vertex maps and garments remain unchanged; fit a new rig after the bear shape is accepted.

## Inputs and revisions

- Authority: `assets/avatar/concepts/2026-10-21/bear-rebuild/reference-b-fullbody.png`; crop/source hashes in its sibling `reference.json`.
- Builder: `tools/blender/catalog/build_bear_reference_blockout.py`. Each revision retains exact `builder.py`, `design.json`, editable ignored `.blend`, four 320px renders and source-bound report.
- v1 exposed skin at shoulders and used disconnected-looking sleeve volumes.
- v2 joined the shirt volumes and lowered hidden upper-arm anatomy; shoulder caps remained too puffy.
- v3 reduced shirt caps and improved visible sneaker straps, exposing the hidden shoulder anatomy again.
- v4 lowered only hidden upper-arm caps, keeping the smaller shirt silhouette. Four fresh Blender 5.2.2 renders completed; independent review rejected its inflated shoulders and segmented arms.

- v5–v6 replaced shoulder spheres with sloping sleeve lofts, tapered arms/paws, raised the muzzle and made broad flat sneaker straps; side renders exposed sleeve/outer-arm coverage failures.
- v7 widened only the cuff region; four native views completed. Independent review found improvements but rejected triangular shoulder wedges, mitten-like wrists and rigid trouser/shoe shapes. User was shown v7 and asked for direction; response pending.
- v8 rotates sleeve cross-sections perpendicular to the arm, ending at an angled cuff, and smooths the wrist into a narrower paw. All four fresh 320px renders completed in Blender 5.2.2; root inspected all four. Independent v8 review found improved cuffs and no obvious leaks/holes, with small shoulder humps, rigid trousers/shoes, smaller eyes and stiff pose still open. User shape acceptance is pending. Trousers, reference pose, eyes/expression, surface detail and a softer shoulder transition still need refinement.

- v9 enlarged the eyes, refined sleeve roots and trouser cuffs, and added a separate head-tilt-only expression render. Source is saved with neutral head rotation. Independent review found improved warmth but protruding eye assemblies and ring-like cuffs.
- v10 recessed the eye assemblies 18mm and varied ankle fold heights, removing the extra cuff ridge. Five fresh native renders completed. Independent v10 review confirms less eye projection and softer cuff folds, while sleeve joins, simplified paws/shoes, stance and finish remain open. Likeness remains unaccepted; no new rig or runtime asset exists.

## Process changes

Review reference-versus-render silhouette and facial landmarks before rigging. The snapshot replay runner validates archived builder/design/helper hashes before execution. A fresh v10 native replay reproduced all five raw-pixel review buffers exactly, and seven behavioral tests cover changed/missing inputs, output preservation and argument handling; this closes the mismatch between a saved design JSON and later hardcoded geometry. Keep cameras fixed between shape revisions; distinguish pose/camera differences from anatomical differences. Single-view side/back reconstruction remains a proposal. Request critical likeness review, not merely a check for rendering defects. Technical passes cannot override explicit user art rejection.

For a new character, preserve canonical human assets while allowing different anatomy and a fitted rig; human vertex-index invariants apply to existing catalog fitting, not to this independent new bear. Keep separate clothing surfaces. Procedural fur/cloth bump in these native previews must be baked to supported textures before glTF review. Voxel blockouts require intentional deformation topology.

## Meshy trial and recovery

The remesh and rig tasks both succeeded. Remesh task
`01a15fc7-1930-704d-b191-ce67f048917b` cost 5 credits and produced **51,311 triangles**
(the request target was 50,000). Rig task `01a15fca-8ac6-74ad-a7c0-acd3ca841bab`
cost 5 credits and produced a 24-bone biped. Total session spend is **40/500 credits**,
460 remain; last observed provider balance is 2,060. Do not resubmit these tasks.

The current motion candidate is `bear-v2/revisions/celebration-v2/`: source
`celebration.blend`, SHA-256 `41bfa7023493474200382a81806a58efdb77f247be373e56b4fe2e3727952df8`;
runtime `web-v1/model.glb`, SHA-256
`0e852229403347e96f919627b2e46bb09f97fe771496c47c700f063dbd00afcc`.
The fixed outfit is one skinned mesh with one 1.4-second `celebrate` clip. The
runtime is 2,688,372 bytes / 1,909,368 gzip bytes, with 51,311 triangles and zero
Khronos errors/warnings. Its 1024px WebP textures and packed normals/tangents/UVs
use `EXT_texture_webp` and `KHR_mesh_quantization`; positions and weights remain
unquantized.

Fresh actual Three.js skinning and native parity cover 169 poses at 120Hz;
maximum source/export vertex error is 1.20727 micrometres. The clearance audit
records 48 intrinsic bind-pose contacts and at most 50 total contacts, with zero
**new arm-versus-torso/leg** contact pairs throughout the dance. This is not a
zero-contact or independent-garment/wardrobe claim. The first, more relaxed-arm
motion candidate caused substantial arm/trouser intersections and is retained
as rejected `celebration-v1`. Revision v2 uses 16-degree resting arm rotation;
its more open neutral pose is a visible compromise from reference B.

The exact final GLB passed 30 actual browser views, including phone and short
landscape, with no console/request failures. See
`artifacts/verification/bear-companion/generated-v2/browser/browser-report.json`.
A controlled-seek video was inconclusive and is not actual product-clock proof.
The real correct-answer dance/UI probe is in progress. The fallback still was
freshly rendered from the unchanged source at 320×368 (2× the largest CSS slot).
Final animated-revision user approval, fresh integration gates and publication
remain open. A fresh storage preflight on 2026-10-21 found all four R2 variables
and `BLOB_READ_WRITE_TOKEN` absent; local models are not remotely backed up.

## Reusable implementation lessons

- Preserve the submitted task ID before waiting/polling so a timeout cannot erase
  the paid operation. Distinguish provider subscription errors from credit errors.
- Rig the successful remesh through its correct endpoint/task provenance; measure
  actual output triangles rather than treating the request target as a result.
- Imported Meshy armatures use object scale 0.01. Convert world metre motion
  through both the armature transform and bone basis; otherwise floor correction
  and hops can be scaled or directed incorrectly.
- Keep an action inactive while calculating poses, then bind its action slot when
  inserting keys. Preserve input config and exact builder beside every revision.
- Validate raw exported weights before GLTFLoader can normalize them. CPU texture
  placeholders establish skinning only; render real embedded textures separately.
- Compress textures and safe attributes before the dense sweep. In glTF Transform
  4.3.0, partial attribute quantization omitted the required extension marker with
  floating POSITION; declaring KHR_mesh_quantization explicitly removed validator
  errors. Keep the failed intermediates and revalidate the final bytes.
- Compare native/export poses with one fixed bidirectional vertex correspondence,
  not a fresh nearest-neighbour match per frame. Audit new arm/body contacts
  against the fused source separately from its intrinsic anatomical contacts.
- A paused/seek fixture is insufficient proof of real-time playback. Its 30
  settled poses passed, while a continuous query-seek video was inconclusive;
  actual correct-answer playback uses a test-mode viewer and the product clock.

Research and portable next steps:
`docs/audits/2026-10-21-reference-to-3d-agent-workflows.md` and
`docs/superpowers/plans/2026-10-21-bear-reference-rebuild.md`.

## Expressive motion and local approval — 2026-10-22

The user watched v2 actual playback and requested a more expressive dance. The
horizontal-arm v3 study approached the native review edges. V4 bends the elbows
up for a cheer and adds two 12cm bounces, alternating arm accents and head/torso
sway. Its geometry remains identical to the approved Meshy proportions. At the
old5.2 product camera the ears/paws clipped. Enlarging slots to 176×200 desktop,
144×164 phone/short and 112×128 combined, with camera 5.6, preserves legibility and
passes every visible captured frame across five real game viewports. Keep the
old clipped proof; native cropped review poses are not final product framing.

User approved the actual-clock v4 preview: “Yes, keep this version.” Exact GLB
SHA598ac628256d676867067268e96075bce7d47a5d81d2a613d5a7f9b104e56fc3,
nativeSHA9376c704dfd46a590153dc9ae406e98e8dbee95993c2ca1eb4f26e50382e144f.
169 native/runtime poses differ by at most 3.482µm; zero new arm/body contacts vs 48
intrinsic bind contacts, at most 62 total. Runtime51311triangles,1910001gzipbytes,
validator 0 errors/0 warnings; strict30views pass. Fresh still352×400 at camera 5.6
is saved separately and bound to unchanged native source. Inspect only320px copies.

The first broad integration run passed547/548. Its only failure was a false
still-size measurement: screenshot during ancestor opacity≈0.45 made pale pixels
fall below the unchanged color mask, shrinking154px to112px. The helper now waits
for opaque ancestors within1000ms; a focused browser regression reproduces40px
before and80px after. Do not loosen visual thresholds to hide entrance timing.
The final complete integration profile is running; its actual result belongs in
verification-progress.json and the handoff.

Remote storage/publication are explicitly deferred by the user. Preserve this
checkout's ignored native/export bytes. A source manifest records identity; it
does not prove remote recovery. The old head35 ZIP excludes the generated bear.

## Review capture integrity

A later v4 integration run passed550/551; the Czech final scene remounted during
capture. The trace showed a praise MP3 URL returning HTTP200 HTML (SPA fallback),
then native decode failure bypassing the test's held play() completion. Remount
occurred121ms after the answer, not at the1600ms companion expiry. Visual-review
tests now fulfill praise with an existing valid MP3 while keeping their normal
hold/release stub; real media/fallback/order tests remain separate and unchanged.

One CSS-scale page PNG now supplies both the review image and original saturation
measurement, eliminating duplicate captures. The helper requires the same
connected visual, event identity, representation and rectangle across capture;
it refuses stale pixels/metadata. A focused regression checks returned dimensions
from the same shot. Synthetic regression output is removed in finally so it
cannot masquerade as actual-model review evidence. The exact failed Czech scene
passed three repeats after the fix. Final aggregate proof is recorded separately.

## Final local gate

Fresh `npm run verify:integration -- --force` passed on2026-10-22:552 browser
cases,600 Vitest tests, lint (zero errors; one known warning), pure checks,
audio inventory, test/production builds and production bundle guard. The final
pipeline receipt is2026-10-22T04-23-57-611Z-integration.json; source-bound summary
is integration-report.json in this candidate directory.29 Python CLI/replay tests
also passed. The full release-only matrix was not run and publication remains
explicitly deferred. Commit close-out locates its commit via the handoff git-log
command; native/export files remain ignored and local-only.
