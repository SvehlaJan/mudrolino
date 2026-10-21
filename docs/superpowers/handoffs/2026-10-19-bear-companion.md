# Bear companion implementation handoff

Updated: 2026-10-21

Status: local implementation, head35 technical model proof, game/profile checks
and separate asset/UI reviews passed. The candidate is committed for review. Exact user art acceptance, private storage and public publication remain
open. The product manifest is disabled. This is a tested candidate lane, not a
production-release record.

Start with the [plan](../plans/2026-10-19-bear-companion.md), approved
[design](../specs/2026-10-19-bear-companion-design.md), root AGENTS.md and
[avatar workflow](../../avatar-workflow.md). These files suffice for Claude Code
or another agent without access to this chat.

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
| 2: bear + fixed outfit | Fitted candidate; art pending | Head35 local candidate; whole-head size feedback pending; independent visual review |
| 3: dance/LOD/proof | Technical model proof passed; private storage pending | Hash-bound `verification-summary.json`, 169 poses, 30 browser captures |
| 4: policy/resources | Implemented; spec/quality passed | Behavioral Vitest and real browser failures/lifecycle cases |
| 5: one-shot renderer | Implemented; spec/quality passed | Real Three.js playback, parser/WebGL fallback, old gallery regression |
| 6: common game wiring | Implemented; final integration passed | All11 games, last correct, reduced motion, failure/lifecycle tests, larger slots |
| 7: publication | Guard tool implemented/tested; execution blocked | Exact art approval + R2/Blob credentials required |
| 8: whole-branch proof | Local head35 proof passed | Fresh548/495,13 responsive/WebKit,8 production/offline,32 phase-audited captures and actual video |
| 9: close-out | Local candidate committed | Resolve commit with the git-log command above; external acceptance/publication remain open |

Do not rebuild already proven geometry merely to resume. First verify its hashes,
inspect current status and restore missing private bytes if storage has since
been completed. Rebuild only after a requested art change or an actual defect.

## Current model and user feedback

All current paths below begin `assets/avatar/catalog-a/companions/bear-v1/`.

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
- `bear-still.png` and `src/avatar/companions/bear-still.png` are identical
  320×368 transparent renders. Their exact hash is in the summary.
- Embedded clip: exactly one `celebrate`, 1.4s, 43 keys at30fps, stationary with
  broad arm gestures, gentle sway and6mm pelvis bob. Shared rest rig and retained
  canonical gait key signatures remain unchanged; the bear itself has dance
  proof only. No wardrobe-wide, selfie, human expression or real-device FPS claim.

The user said the **whole head**, not only the facial features, was too large.
Every head component scales together around the neck anchor. Head45 was18%
smaller than head55 and still too large. Current head35 reduces linear head
size another22.2%, without changing the body/outfit or dance. Head envelope is
0.29435m of1.72935m total height (17.0%). Its exact size/model question remains
pending; no elapsed wait, concept selection or independent review grants art
acceptance. The local candidate has its own full technical proof.

A supplemental actual-GLB comparison proves12 non-head surface attributes,
world transforms, oriented triangle multisets and all72 animation track values/
times match head45. Three rigid sphere meshes differ only in triangle ordering;
the strict ordered-index attempt and semantic diagnosis remain in the revision.
Independent review led to smoother arms, rounder paws and less tee flare. Mild
wrist/slim-trouser differences remain style observations. Full previous head100,
head55 and head45 proof is retained in separate `revisions/proven-head*-v1/`
namespaces with historical path maps. Earlier report paths are historical evidence.

## Technical model evidence

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
copy. Product camera5.2 fills the slot; gallery remains7.2. Focused4browser checks
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

Current bear native/export bytes are **local-only**. On2026-10-20 a fresh check
found all four R2 variables and BLOB_READ_WRITE_TOKEN absent. Asset inventory
passed zero missing/changed/unlisted/link mismatches. Private push dry-run stops
before network with missing credentials. The manifest alone cannot restore these
new bytes on another machine. Preserve the authoring checkout.

The tested publication CLI validates exact source/model/still/report hashes,
full169/30 evidence, clip/budgets, user revision approval and private storage;
then immutable Blob path/URL and downloaded hash before atomic manifest update.
Fresh head35 preflights are recorded in
`artifacts/verification/bear-companion/private-storage-preflight-head35.log` and
`publication-preflight-head35.log`. Private dry-run exits1 for missingR2 setup;
publication validation reaches and correctly stops at `Exact model revision
requires recorded user art approval`. These expected refusals are not passing
storage/publication results. It does not upload or enable production.

Next external steps, in order:

1. Obtain the user's head-size/final-model approval, or make the requested
   revision and rerun dependent asset/game proof. Record approval against exact
   GLB SHA/date; size feedback alone is not publication approval.
2. Supply R2 credentials, inspect the intended manifest, then `npm run assets:push`
   and prove restore/hash retrieval. Update summary private storage only after
   success. Do not upload unrelated fitting work.
3. Configure the server-side `BLOB_READ_WRITE_TOKEN` and run `node tools/avatar/publish_bear_companion.mjs`.
   Verify immutable URL/CORS and actual published production behavior as the
   plan specifies. Keep the private/native files out of git.
4. Follow the user's separate PR/merge/release instructions. Do not ship with
   pending recordings or treat feature-branch preview as production.

Research and reusable process lessons live in
`docs/audits/2026-10-19-avatar-authoring-process-research.md`, the bear retrospective
and both repo-local Blender/browser skills. Preserve per-revision inputs, cheap
actual-export motion screens, independent contact/opening checks, one Blender
owner and serialized heavy browser/Blender sweeps.


## Local portable asset bundle

`artifacts/verification/bear-companion/bear-v1-local-assets.zip` is a CRC-checked
local bundle of ignored bear native/GLB files, revision proof/images, and the
frozen starting outfit. Its JSON sidecar records exact bytes/SHA and current
model/native/still identities. Extract at a matching feature checkout root and
follow this handoff. This is a local transfer artifact, not remote backup or art
approval; other catalog inputs still use normal R2 recovery. Preserve the
authoring checkout until private storage succeeds.

The modified repo skills passed frontmatter/body-constraint checks through
`js-yaml`. The official Python quick-validator was unavailable because PyYAML
was missing; do not report it as a successful official validation.


## Completion audit and remaining requirements

- Local code: shared success integration covers all11 games, final correct,
  lifecycle/timing/failure/reduced-motion behavior; fresh548/495 integration
  proves the frozen implementation and head35 model.
- Local3D: saved builders/parameters/native/exports,169 native/runtime poses,
  strict30 renderer views,15 materials, validator and phone budgets pass.
  Independent reference/asset review is recorded in the audit.
- Success presentation: enlarged responsive slots and closer product camera
  have actual game captures and separate UI review. Final focused browser/media
  receipts in the verification close-out must match the current asset.
- Experience: primary-source research, rejected revisions, per-revision inputs,
  export/motion/coverage lessons and shared Blender/browser skills are saved.
- External requirements remain incomplete: user size/model acceptance, private
  source storage, immutable public model publication/CORS and enabled production
  behavior. The manifest remains disabled; local tests do not establish those.
