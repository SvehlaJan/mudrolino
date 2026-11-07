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

## Multi-clip animation PoC and `celebration-v5` — 2026-11-05

With a 200-credit pre-approved Meshy budget, four stock humanoid animation presets
were tested on rig `01a15fca-8ac6-74ad-a7c0-acd3ca841bab` (`--action-id` `28`
`Big_Wave_Hello`, `59` `Victory_Cheer`, `22` `FunnyDancing_01`, `466` `Regular_Jump`;
3 credits each, **12 / 200 credits spent**, 188 remaining, provider balance 2,048).
Raw Meshy clips exhibited up to 624 `arm-torso` and 629 `arm-head` triangle
intersections because stock human mocap drives the clavicles and elbows through
the bear's wide torso and cheeks. Post-processing the Meshy clips in Blender
(locking `LeftShoulder`/`RightShoulder` and overriding upper-arm abduction)
eliminated `arm-torso` contacts on `wave_28` (`367 -> 0`) but still left `297`
`arm-head` contacts from the human elbow trajectory grazing the bear's cheek.

Procedural Blender multi-clip authoring (`build_generated_bear_celebration.py` +
`motion-design.json`) using the 3-axis world-rotation helper (`Y` frontal raise
with `+16°` rest ceiling, `Z` transverse forward swing `-sign * deg`, `X` axial
palm roll) produced **`celebration-v5/`** with six uniform 1.4-second (`42`-frame)
clips: refined `celebrate`, `wave`, `clap`, `jump`, `finale`, and `idle`.
Exporting with `animation_mode='ACTIONS'` and optimizing via `optimize_generated_bear.mjs`
yielded `celebration-v5/web-v1/model.glb` (`2,955,120` bytes, `1,996,676` gzip bytes,
SHA-256 `090fcffdaddf805cc495faf4de8c586b1d8449a411566fad31a5285bec931e30`).
Across all 1,014 sampled 120Hz frames (`6` clips × `169` frames), BVH clearance
recorded **0 new `arm-torso-leg` pairs and 0 new `arm-head` pairs**, and
Three.js-vs-Blender vertex parity passed within `9.395 µm`.

## Posed-space `celebration-v6` upgrade and 17-clip + 6-accessory suite — 2026-11-06

Interactive workbench review of `celebration-v5` revealed that `world_rotation`
and `add_world_rotation` converted world axes via `bone.bone.matrix_local` (the
unposed rest matrix), skewing child `ForeArm` and `Hand` rotations once parent
`Shoulder`/`Arm` bones rotated. Adding `rotate_world(arm, bone_name, world_axis, degrees)`
(which converts `world_axis` via `pb.matrix.to_3x3().normalized().inverted()` in
current posed space) and `rotate_local(arm, bone_name, local_axis, degrees)` to
`bear_companion_common.py` enabled 17 procedural clips in **`celebration-v6/`**
(`celebration-v6/web-v1/model.glb`, `3,552,892` bytes, `2,078,070` gzip bytes,
SHA-256 `db5ddc0dfe3d72ab7de2e80fc1a4ca853cd4bc1ae3cb1e665e3361ba50fe4d2a`):
1. `celebrate` (`1.4s`): standing high overhead V-cheer (`hop = 0`) lifting `Shoulder` (`9.5°`), `Arm` (`82.5°` from rest with `21°` forward pitch), and `ForeArm` (`38°`) so both paws rise to ear height.
2. `wave` (`2.2s`): standing high right-paw wave (`hop = 0`) with 5 frontal-plane hand waves and a forward-facing palm (`-Y`).
3. `clap` (`2.2s`): standing 5-beat chest clap (`hop = 0`) held at constant chest height (`plateau_envelope`) where the flat palm normals face inward and meet cleanly without semi-raise phasing.
4. `jump` (`1.4s`): 3-stage jump with a `16.3 cm` wind-up crouch, `21.5 cm` mid-air star-jump apex, and single-move arm return on landing.
5. `finale` (`2.8s`): 4-cycle disco/boogie dance with `Hips` pelvic tilt (`±12° Y`) and twist (`±15° Z`) counter-balanced by `Spine02`/`Spine01`/`Spine` S-curve bend and alternating high overhead punch / waist pump.
6. `idle` (`1.4s`): gentle caregiver breathing sway and warm head nod.
7. `search` (`2.2s`), `think` (`2.2s`), `listen` (`2.0s`), `encourage` (`1.8s`), `shrug` (`1.8s`), `flex` (`2.0s`), `bow` (`2.0s`), `march` (`2.4s`), `wiggle` (`2.0s`), `peekaboo` (`2.2s`), and `stretch` (`2.2s`): 11 expressive character animations paired with 6 bone-parented 3D accessories (`searchGlass`, `thinkBulb`, `flexMask`, `bowHat`, `marchFlag`, `wiggleLeftMaraca`/`wiggleRightMaraca`) in `src/avatar/companionAccessories.ts` and `tools/blender/catalog/bear_accessories.py`, audited for zero snout/head/paw clipping.
All 4,121 sampled 120Hz poses pass BVH clearance (`0` `arm-torso-leg` and `0` `arm-head` pairs) and native-vs-runtime parity (`28.02 µm <= 30 µm`).
