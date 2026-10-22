# Bear companion implementation handoff

Updated: 2026-10-21

Status: **Expressive generated bear v4 approved locally; full integration passed.**
The user approved the Meshy construction base, requested stronger motion after
watching gentle v2, and accepted the actual v4 preview on2026-10-22. Asset/browser/
UI proof passes. Publication/private storage are explicitly deferred by the user.
The following accepted-candidate section supersedes the historical evidence below.

Start with the [current rebuild plan](../plans/2026-10-21-bear-reference-rebuild.md),
[original implementation plan](../plans/2026-10-19-bear-companion.md), approved
[design](../specs/2026-10-19-bear-companion-design.md), root AGENTS.md and
[avatar workflow](../../avatar-workflow.md). These files suffice for Claude Code
or another agent without access to this chat.

## Current accepted local candidate — 2026-10-22

The user accepted the actual expressive celebration preview: **“Yes, keep this
version.”** Model: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v4/web-v1/model.glb`,
SHA-256 `598ac628256d676867067268e96075bce7d47a5d81d2a613d5a7f9b104e56fc3`.
Native source: sibling `../celebration.blend`, SHA-256
`9376c704dfd46a590153dc9ae406e98e8dbee95993c2ca1eb4f26e50382e144f`.
The exact paths/hashes, final art approval, six proof descriptors and storage state
are in `assets/avatar/catalog-a/companions/bear-v2/verification-summary.json`.

One fixed-outfit mesh,24 bones,1.4-second `celebrate`;51,311 triangles,
2,688,372 bytes/1,910,001 gzip bytes, zero validator errors/warnings. Fresh169-pose
native/runtime parity has maximum3.482µm error. Arm clearance has zero new
arm-versus-torso/leg pairs against48 intrinsic bind contacts (maximum62 total),
not zero contacts or independent wardrobe proof. Strict 30 actual renderer views
and five-size actual-clock framing/control checks pass. Independent reference,
asset and UI review: `docs/audits/2026-10-22-generated-bear-final-review.md`.

The more expressive cheer/bounces required a larger reserved area:176×200 desktop,
144×164 phone/short,112×128 combined, camera 5.6. The fallback is freshly rendered
352×400 from the same source (`still-v2/`), at least2× the largest CSS slot. The
still-size test's first failure was entrance-opacity measurement, not undersized
art; the bounded opacity wait has a reproducing browser regression. Final full
integration passed:552 browser cases,600 units, lint/pure/audio inventory, both
builds and bundle guard. See bear-v2/integration-report.json for exact receipts.

The user chose **finish locally for now**. Private backup/publication are deferred;
ignored `.blend`/`.glb` bytes remain local, the asset manifest is identity only,
and `src/avatar/companions/bear-v1.json` stays disabled. No public URL, remote
recovery, PR, push or deployment is claimed. The earlier head35 ZIP excludes the
Meshy replacement. Preserve this authoring checkout until remote backup is enabled.
Meshy spend is40/500 approved credits,460 remain; no further paid operation is needed.

## Checkout and ownership

- Primary checkout: `/Users/svehla/playground/teo-learn` or the equivalent local
  root, branch `feature/bear-companion-design`.
- Design/plan baseline: `0cc7fe4` / `f975418`. Locate the implementation commit
  with `git log -1 -- src/avatar/LearningCompanion.tsx` after close-out.
- Root authored every coupled Blender change. Code subagents implemented policy,
  resources, renderer, integration and publication tooling with separate spec
  and quality reviews. Separate agents reviewed final asset fidelity and the
  enlarged UI; read `docs/audits/2026-10-20-bear-companion-visual-review.md`.
- Existing unrelated untracked B04/F02/female fitting reports predate this lane.
  They were preserved and excluded from staging, manifest additions and uploads.
- No worktree, PR, merge, push or deployment was requested or performed. Creating
  a worktree still requires explicit authorization; use the primary checkout.

## Task state and next action

| Task | Actual state | Evidence / next action |
| --- | --- | --- |
| 1: frozen source | Complete | `bear-v1/source-inventory.json`; canonical source unchanged |
| 2: bear + fixed outfit | Meshy base explicitly approved | Preserve exact generated source/hash; review remesh/rig derivatives and retain one fixed outfit |
| 3: dance/LOD/proof | V4 approved and asset gates passed | Current exact hash/summary above;169 native/runtime poses,30 views,five actual-clock sizes |
| 4: policy/resources | Implemented; spec/quality passed | Behavioral Vitest and real browser failures/lifecycle cases |
| 5: one-shot renderer | Implemented; spec/quality passed | Real Three.js playback, parser/WebGL fallback, old gallery regression |
| 6: common game wiring | Implemented; final integration passed | All11 games, last correct, reduced motion, failure/lifecycle tests, larger slots |
| 7: publication | Guard implemented/tested; execution deferred | User chose local-only completion; resume storage/publication only when requested |
| 8: whole-branch proof | Final forced integration passed | 552 browser cases,600 units,lint/pure/audio inventory,both builds,bundle guard |
| 9: close-out | Local implementation verified | Locate committed close-out with git log -1 -- assets/avatar/catalog-a/companions/bear-v2/verification-summary.json; credentials/publication deferred |

Use the approved Meshy source as primary. Do not resume head35 scaling or make
procedural blockout-v10 the default without a new decision. Preserve the old
reports/assets and canonical human inputs/index maps.

## Meshy provenance and historical v2 proof

- Exact selected B crop:
  `assets/avatar/concepts/2026-10-21/bear-rebuild/reference-b-fullbody.png`;
  `reference.json` records crop provenance and SHA. Generated side/back volume
  remains reconstruction, with four-view review now available on actual mesh.
- Image-to-3D task `01a15fc4-4dc4-7116-aadf-3953ef4a9f1c`: **SUCCEEDED**,
  30 credits. API access works; observed balance 2,100→2,070. Earlier two 402
  `NoMorePendingTasks` Free-plan failures are resolved history, not a current block.
- Primary GLB:
  `meshy_output/20261021_204236_bear-b-reference-rebuild_01a15fc4/model.glb`,
  SHA-256 `a637c6d4d27fb2768d0fa6e815b49412145efb4be153c68cd7e4dcd783ac8d17`.
  It has 420,726 triangles, one mesh/material, three embedded images and no rig.
  Its `review-v1/generated-review-report.json` binds four 320px actual-mesh renders
  and saved review source. That report predates the user's construction-base
  approval; it is not a rigging/motion or final-art acceptance record.
The remesh and rig tasks both succeeded. Remesh task
`01a15fc7-1930-704d-b191-ce67f048917b` cost 5 credits and produced **51,311 triangles**
(the request target was 50,000). Rig task `01a15fca-8ac6-74ad-a7c0-acd3ca841bab`
cost 5 credits and produced a 24-bone biped. Total session spend is **40/500 credits**,
460 remain; last observed provider balance is 2,060. Do not resubmit these tasks.

Historical v2 motion is preserved in `bear-v2/revisions/celebration-v2/`: source
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

The exact v2 GLB passed 30 actual browser views, including phone and short
landscape, with no console/request failures. See
`artifacts/verification/bear-companion/generated-v2/browser/browser-report.json`.
A controlled-seek video was inconclusive. The later real correct-answer dance/UI
probe passed desktop, phone and short landscape:
`artifacts/verification/bear-companion/generated-v2/product-clock/product-clock-report.json`.
It preserves the actual animation clock while stubbing audio/speech completion;
it does not replace the aggregate integration gate. The fallback still was
freshly rendered from the unchanged source at 320×368 (2× the largest CSS slot).
The user reviewed that actual v2 clip and requested a more expressive reaction.
The wider horizontal v3 study was retained; expressive v4 with raised elbows was
then completed and accepted. Its larger product footprint and all fresh proof
are listed in the accepted-candidate section above. Do not resume v2 or v3.
A fresh storage preflight on 2026-10-21 found all four R2 variables
and `BLOB_READ_WRITE_TOKEN` absent; local models are not remotely backed up.

Root owns coupled 3D authoring; agents handle code and stable-artifact reviews.
Read the [tool research](../../audits/2026-10-21-reference-to-3d-agent-workflows.md).
No additional MCP or paid animation operation was required. The current pipeline
uses source-bound builders and actual exported-motion checks.

## Historical head35 model and user feedback

All historical paths below begin `assets/avatar/catalog-a/companions/bear-v1/`.

- Native runtime source: `outfit-lod.blend`, SHA-256
  `608b7d6c0f5c28299d820fe5812d4aa8c599bbf4f870308b0a05124374f98c7e`.
- Runtime model: `outfit-lod.glb`, SHA-256
  `f391a612b80dd63f069cf5f5d9514a585f9f3e1040f2593974762cb8a8ea16d4`,
  3,347,792bytes / 1,674,562bytes gzip / 93,127 triangles.
- Static construction: `revisions/head35-construction-v1/outfit.blend` and saved
  `bear-design.json`; motion source: `revisions/head35-motion-v1/outfit.blend`.
  Canonical human input remains
  `assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/outfit.blend`, SHA
  `cb55aa76cddf3db3070465903595fefda1a37a02bfb3b08f053efec4d9d5d8be`.
- At head35 verification, `bear-still.png` and the bundled still were identical
  320×368 transparent renders. Their exact historical hash is in its summary;
  the bundled still now follows the Meshy rebuild.
- Embedded clip: exactly one `celebrate`, 1.4s, 43 keys at30fps, stationary with
  broad arm gestures, gentle sway and6mm pelvis bob. Shared rest rig and retained
  canonical gait key signatures remain unchanged; the bear itself has dance
  proof only. No wardrobe-wide, selfie, human expression or real-device FPS claim.

The user said the **whole head**, not only the facial features, was too large.
Every head component scales together around the neck anchor. Head45 was18%
smaller than head55 and still too large. Current head35 reduces linear head
size another22.2%, without changing the body/outfit or dance. Head envelope is
0.29435m of1.72935m total height (17.0%). The user subsequently rejected its
likeness on 2026-10-21. Its full technical proof remains scoped to this historical
candidate; concept selection or independent review never granted art acceptance.

A supplemental actual-GLB comparison proves12 non-head surface attributes,
world transforms, oriented triangle multisets and all72 animation track values/
times match head45. Three rigid sphere meshes differ only in triangle ordering;
the strict ordered-index attempt and semantic diagnosis remain in the revision.
Independent review led to smoother arms, rounder paws and less tee flare. Mild
wrist/slim-trouser differences remain style observations. Full previous head100,
head55 and head45 proof is retained in separate `revisions/proven-head*-v1/`
namespaces with historical path maps. Earlier report paths are historical evidence.

## Historical technical model evidence (bear-v1 only)

`verification-summary.json` binds source/model/still and every report by hash:

- `native-dance-report.json`: all169 quarter-frame native and actual runtime poses,
  zero contacts, zero visible removed faces from32 cameras, maximum1.086µm
  all-rendered-surface source/export error against a30µm threshold.
- `runtime-report.json`: real GLTFLoader + AnimationMixer + SkinnedMesh evaluation,
  169 samples, 24 joints, four normalized weights, floor/clip/budget checks and
  maximum0.245m evaluated movement. Temporary full position payload is ignored.
- `structure-material-report.json`: rigid head/neck/paws, frozen rig and15 solid
  material/color parity checks. No texture-image payload in this geometric face.
- `gltf-validation.json`: zero Khronos errors and warnings on the exact GLB bytes.
- `budget-report.json`: phone95k triangles /2.1MB gzip limits passed; clip payload
  41,452bytes, incremental57,596GLB /18,488gzip bytes; endpoints match.
- `browser-report.json`:30 actual renderer captures across5 poses,4 desktop views,
  phone and short landscape; changing pixels, full framing, completed matching
  GETs and zero errors/failed requests. Final run used dedicated loopback3005
  with `DISABLE_HMR=true`; images are in ignored `browser-final35/`.

The full head35 gate measured the isolated revision before promotion. Root native/
structure reports declare identical-byte canonical path aliases and bind the
unchanged original revision reports by SHA. No new measurements are claimed for
copying; the exact native/model hashes match. Runtime compact proof retains the
full169-sample payload hash.

Clearance checks compare different meshes, not every intentional garment
self-overlap. Follow the catalog README diagnostic policy and visible review;
this record does not claim zero whole-garment self pairs.

The existing gallery also passed fresh desktop/phone walk, run, pause, scrub,
camera, skeleton, zoom and reset checks;74 desktop models and4 phone models were
inspected. Report: `artifacts/verification/avatar-catalog/inspection-page/browser-report.json`.
Existing catalog cleanup cancellations are retained under its established
transport policy; the strict bear renderer sweep accepts none.

## Runtime behavior and UI review

The shared GameShell observes one completed-success identity. Ordinary and last
correct answers share one bounded event; partial assembly/letter progress and
failed final rounds never trigger it. Existing item→verdict audio and progression
rules are preserved. One-shot loading can be interrupted, never delays controls,
and late data cannot restart an expired reaction. Reduced motion skips renderer/
model fetching and shows the still. Model/parse/chunk/WebGL/context failures fall
back without repeated requests. Actual parsing is outside the R3F reconciler,
because pinned R3F9.6 can forward caught render errors to window.reportError.

Success slots reserve160×184 desktop,128×148 narrow phone/standard shortland,
and96×112 combined narrower-short dimensions. Short screens place the bear beside
copy. Product camera 5.2 fills the slot; gallery remains7.2. Focused4browser checks
passed actual colored-character minimum heights and still/3D parity within8%.
Independent UI review inspected current Slovak phone/short-results/desktop-still
captures and found readable character and reachable controls. Fresh head35 Slovak/Czech phone success, short-landscape results and desktop
reduced-motion captures were independently reviewed. Their exact test fingerprint
is122e82510e7ee92c00b23e67e48a2f162b1ed28353b2e0be103273c08c13bc5a.
The bear measures127px on phone/landscape and156–157px desktop, stays fully
visible and separate from readable praise/uncropped controls. Fine facial details
are less legible after the requested reduction; no new blocking visible defect
was found. Continuous dance quality and user art approval remain separate.

## Verification close-out

Fresh head35 `npm run verify:integration -- --force --workers=3` passed548/548
browser cases,495/495 unit tests, lint, pure verifiers, development audio, both
builds and production bundle checks. Report:
`artifacts/verification/2026-10-20T19-48-37-446Z-integration.json`. All gates ran
fresh. Production/input fingerprint:
`7bc4e7bcc8b98390143516d67a19042fcb6a7be7ae09c0d08b3ef9e09e917f87`;
test fingerprint:
`122e82510e7ee92c00b23e67e48a2f162b1ed28353b2e0be103273c08c13bc5a`.
The smaller model and matching bundled still are included. These build identities
record the pre-commit base plus the complete working-tree fingerprint; committing
those exact bytes does not create a new untested implementation. Focused13/13 responsive/WebKit and8/8 production/offline passed; all3 WebKit
projects rendered actual3D. Reports:
`artifacts/verification/bear-companion/release-focused-head35-final.json` and
`production-offline-head35-final.json`. Expanded32-capture/video follow-up passed. Central exact-source receipt:
`artifacts/verification/bear-companion/shipping-review-final.json`.

The32 captures cover320×568,667×375,1280×900 and568×320, both locales, normal
success, final before-results, results and reduced-motion still. Sidecars record
browser148.0.7778.96, explicit unseeded status, exact build/model/still hashes,
action-clock elapsed intervals and actual phases before/after screenshots. All8
final-before screenshots are `answered-correctly`; all8 results are
`session-complete`, with the same celebration key. Images are<=320px wide;
48px controls fit without overlap, with zero console/request failures.
`game-reviews-head35/` preserves the final set. Before results, the decorative
bear appears over the already-locked completed question; Back remains clear.

The320×568 VP8 video in `dance-preview/mudrolino-bear-happy-dance.webm` records
3.64s of actual correct-answer reaction, natural expiry and Continue. Cold
loading briefly shows the matching still and consumes event time; it does not
claim every1.4s clip frame was3D. Two distinct actual poses are retained.
Fresh lint after final ignored-runner edits passed with only the known
ContentContext warning. Owned preview4176 was closed; final receipt records no
listeners on4173–4176. Root also stopped its owned3005 viewer after strict30 proof.

Retained head35 failures: a deeper archived `.ts` review script entered broad
TypeScript discovery and broke relative imports; its exact bytes are now a
non-compiling `.ts.txt` snapshot. That run was interrupted, not passed. Another
attempt failed because the interrupted run left its owned4173 preview listener;
that exact PID/command was verified and stopped before the successful fresh run.
No product source defect or runtime change was needed for those failures.
Expanded capture attempt1 exposed only a strict artifact assertion on browser
geometry rounding (147.999992px versus148px); its partial output is retained.
The ignored runner now allows0.005px measurement tolerance, preserving slot/
framing/viewport assertions and the real1600ms event window. A second capture
attempt mislabeled some Czech final-before scenes because missing draft audio
fell through to an immediately completing test TTS stub. That set is retained
as phase-inaccurate, not accepted proof. The final artifact-only harness supplies
valid bundled praise to its silent held-audio fixture and asserts/records the
actual phase on both sides of every screenshot. Product timing/audio is unchanged.

### Historical head45 baseline

Fresh `npm run verify:integration -- --force --workers=3` passed548 browser
cases,495 unit tests, lint, pure verifiers, development audio, both builds and
production bundle checks. Report:
`artifacts/verification/2026-10-20T19-27-09-051Z-integration.json`. All gates ran
fresh; no proof reuse. Production fingerprint:
`4527ced65ad6045846344b91750db6cd2278b4982f7e719641cfd05f03ff2577`;
test fingerprint:
`be5c67822f98adf2a7330814f126fe7865622e12ef1e6659959ec2b9b1307f72`.
Focused responsive/WebKit13/13 and production/offline8/8 passed; reports:
`artifacts/verification/bear-companion/release-focused-final.json` and
`production-offline-final.json`. These checks use the head45 baseline; they
do not establish head35 model proof.

Head45 compact568×320 success/results/reduced-motion captures passed in both
Slovak and Czech:96×112 slots, colored body93–97px,48px controls in viewport
with no overlap/errors/failed requests. The320×568 actual-game video preserves
normal timing, cold fallback, natural expiry and Continue; roughly0.3s of the
reaction initially uses the still, so it does not claim every clip frame rendered
in3D. Central report: `artifacts/verification/bear-companion/shipping-review-final.json`.
Review media/metadata: `combined-narrow-short/` and `dance-preview/` under that
artifact root. All13/8 results and media bind the exact head45 GLB/still/build.

Earlier focused WebKit short landscape exposed a real resize bug. Baseline10 repeats
failed10/10; after measuring the fixed wrapper instead of Fiber's mutable canvas,
coalescing resize through RAF and cancelling on unmount,10 repeats passed10/10.
The new live667×375→568×320 regression failed before and passed after the fix.
Independent review passed the supported positive fixed-size slots. Initial
zero-sized/hidden hosts are outside this private component's supported invariant;
they would require deferred first configuration before render. Do not generalize
it to such hosts without that change. Fresh strict30 captures passed after the
repair, followed by the fresh548-case aggregate above. Do not inherit this
asset proof for a later model revision.

Known development inventory:391 expected recordings with240 known pending;
development audio check passes, strict release remains unavailable. No release
or deployment is authorized.

Retained failed/interrupted evidence: stale generated UI-component inventory
(fixed by generator;122 entries, focused4tests passed), one interrupted aggregate
(exit130), a stale preview listener left by that interruption (identified by PID/
command/start time and stopped), and first-load dev-HMR cancelled-module sweeps.
Waiting for network idle alone did not remove the HMR failure; a fresh dedicated
HMR-disabled viewer passed30 captures. No cancelled run is called a fresh pass.

## Storage, publication and portable resume

The user chose **finish locally for now**. Current Meshy native/export bytes are
local-only; preserve the authoring checkout and original generated source. The
2026-10-21 preflight found all four R2 variables and `BLOB_READ_WRITE_TOKEN`
absent. Credentials, private restore proof and public publication are deferred,
not prerequisites for completing the requested local revision. The asset
manifest records bytes but cannot restore this rebuild on another machine.

Historical head35 preflights are recorded in
`artifacts/verification/bear-companion/private-storage-preflight-head35.log` and
`publication-preflight-head35.log`. Private dry-run exits1 for missingR2 setup;
publication validation reaches and correctly stops at `Exact model revision
requires recorded user art approval`. These expected refusals are not passing
storage/publication results and do not cover the Meshy replacement.

Local close-out:

The complete integration profile passed:552 browser cases,600 units, all eight
gates. V4 art and independent visual review are complete. Locate this change with
`git log -1 -- assets/avatar/catalog-a/companions/bear-v2/verification-summary.json`.
Owned code, review media, manifest and reports belong to this commit; ignored native
bytes stay local and unrelated fitting work is preserved. No PR, push or deployment.

When storage/publication is separately requested, inspect the intended asset
manifest, prove private upload plus restore/hash retrieval, then use the guard
below with configured server-side Blob credentials. Enabling the manifest needs
verified immutable public bytes/CORS and accepted matching still. PR, merge,
push and release require their own user instructions; pending recordings still
block release.

### Generated publication contract

`tools/avatar/publish_bear_companion.mjs` now supports explicit
`candidateId: 'bear-v2'` or `--candidate=bear-v2`. With no selection it retains
the existing bear-v1 guard. The generated summary is
`assets/avatar/catalog-a/companions/bear-v2/verification-summary.json`, with
`schemaVersion: 2`, `id: 'bear-v2'`, `profile: 'generated-fixed-outfit'` and
`technical.status: 'passed'`. Model/source/still paths may select a new revision
inside that bear-v2 directory; traversal and symlink escapes are rejected.
Hash-bound descriptors retain the existing `candidate.model` (path/SHA/bytes),
`candidate.source` (path/SHA) and `candidate.still` (sourcePath/SHA/bundledPath)
shape. The bundled path is fixed to `src/avatar/companions/bear-still.png` and
must match the verified source image. Animation remains `celebrate`, 1400ms.

All six report descriptors are under `technical.checks`, each with `path` and
`sha256`; paths below are relative to the bear-v2 directory:

| Key | Required file |
| --- | --- |
| native | `native-runtime-parity.json` |
| clearance | `arm-clearance-audit.json` |
| optimization | `optimization-report.json` |
| runtime | `runtime-report.json` |
| browser | `browser-report.json` |
| still | `still-report.json` |

Copy runtime/browser JSON unchanged from their measured revision so embedded
paths and hashes retain provenance. Native parity binds the current source/GLB,
all 169 quarter-frame poses, maximum 30µm error, the exact runtime report SHA via
`samples_sha256`, and its matching `positions_sha256`. The clearance profile is
`generated-fixed-outfit-arm-clearance`: all 169 poses, zero new arm-versus-torso/
leg pairs relative to recorded intrinsic bind contacts; no wardrobe-fit claim.
Optimizer output must match the current GLB path/SHA/bytes with zero errors and
warnings.

Runtime binds the current GLB and the `runtime.contract` file, whose
`contract_sha256` and path inside bear-v2 are checked and snapshotted. Both the
contract and report thresholds require the publisher's exact 24-bone skeleton,
one `Bear_fixed_outfit` mesh and stationary `Hips` root. Actual report bone/mesh
names must match. It requires 169 frames at 30fps/four substeps, 1.4s, at most 95k
triangles/2.1MB gzip, skin motion over 2cm, weight error/root drift/endpoint errors
at most 1e-5, floor penetration at most 7mm and no failures. Browser retains the
strict 30-view matching-GET/framing/no-error/no-failed-request requirements.
Still proof must be `rendered` from the current source/hash at frame 0, 352×400,
maximum CSS slot [176,200], camera distance5.6, minimum pixel ratio2, with `reviews.still` matching the verified image path/SHA.

Exact model art approval/date and `storage.private: 'stored'` remain required;
V4 art approval is recorded, while private storage remains deferred. Future authorized invocation is:

```bash
node tools/avatar/publish_bear_companion.mjs --candidate=bear-v2
```

Runtime id/manifest and immutable public namespace remain **bear-v1**. The guard
preserves public GET hash/byte verification, local snapshots and atomic manifest
replacement. Recorded focused verification: **138 offline tests passed** (47
legacy, 91 generated), TypeScript and syntax passed. This verifies the guard,
not an upload, remote backup or production enablement.

Research and reusable process lessons live in
`docs/audits/2026-10-19-avatar-authoring-process-research.md`, the bear retrospective
and both repo-local Blender/browser skills. Preserve per-revision inputs, cheap
actual-export motion screens, independent contact/opening checks, one Blender
owner and serialized heavy browser/Blender sweeps.

## Local portable asset bundle

`artifacts/verification/bear-companion/bear-v1-local-assets.zip` is the CRC-checked
**historical head35** transfer bundle: ignored native/GLB files, revision proof/
images and the frozen starting outfit. Its sidecar binds those historical
identities. It excludes the new Meshy source and all bear-v2 derivatives. This
local ZIP is neither remote backup nor art approval; preserve the Meshy
authoring checkout until a separate rebuild transfer/restore is verified.

The modified repo skills passed frontmatter/body-constraint checks through
`js-yaml`. The official Python quick-validator was unavailable because PyYAML
was missing; do not report it as a successful official validation.

## Review capture reliability

The first model-sized still check failed during parent opacity; wait for opaque
ancestors without relaxing the saturation mask. A later v4 full run550/551 failed
because a missing Czech praise MP3 returned SPA HTML, decoded as an error and
released the test's held playback. Trace timing was121ms after answer, not the
1600ms companion expiry. Review-only media routing now serves a valid existing
MP3 while preserving hold/release. A single screenshot supplies both review and
measurement; the helper rejects changed visual/event/representation/rectangles.
Synthetic capture artifacts are removed in finally. Actual audio/order/fallback
and product timing code remain unchanged. The failed receipts are retained.

## Completion audit and remaining requirements

- V4 exact-model art approval and independent reference/asset/UI review are complete.
- Source/export/still identity,169 native/runtime poses, arm-clearance scope,
  validator/mobile budget, strict30 views and actual-clock five-size framing pass.
- Final forced integration passed:552 browser cases,600 units, lint/pure/audio
  inventory, test/production builds and bundle checks; exact receipts in the candidate integration-report.json.
- Local completion includes saved research, rejected revisions, reusable builders,
  CLI task recovery, actual raw-weight/skin probes, publication guard and fade
  regression. No modified skill or instruction is required to interpret the new
  generated lane; the shared workflow and this handoff provide the portable entry.
- Private source backup/publication are explicitly deferred. Keep the product
  manifest disabled and preserve this checkout's ignored generated model bytes.
