# Bear reference rebuild: portable implementation and verification plan

Updated 2026-10-22. This plan supersedes the rejected head35/procedural rebuild
steps. Read root AGENTS.md, docs/avatar-workflow.md, the Blender/browser skills
and the bear handoff before resuming. Use the primary checkout on
`feature/bear-companion-design`; preserve unrelated fitting work. No worktree,
PR, push or deploy is authorized. Root owns coupled 3D authoring; use agents for
independent code and read-only asset reviews.

## Accepted scope and current state

One storybook bear matching selected 2D B, one fixed blue-shirt/navy-trouser/sneaker
outfit and a 1.4-second success-only happy celebration. The user approved the
Meshy construction base, rejected gentle v2 motion as too subtle, and accepted
expressive v4 after an actual game-clock preview: **“Yes, keep this version.”**
Parent selfie faces, wardrobe switching and more outfits remain future work.

The user chose **finish locally for now**. Native/export files stay ignored and
local; remote storage/publication are deferred. Product manifest stays disabled.
The source manifest records identities, not remote recovery. Preserve this
checkout; the old head35 ZIP does not contain the generated bear.

| Artifact | Authority |
| --- | --- |
| `assets/avatar/concepts/2026-10-21/bear-rebuild/reference-b-fullbody.png` | Exact B crop; provenance in sibling reference.json; inspect320px review copy |
| `assets/avatar/catalog-a/companions/bear-v2/verification-summary.json` | Exact final paths/hashes, art approval, six proof descriptors, deferred storage |
| `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v4/celebration.blend` | Editable source SHA9376c704dfd46a590153dc9ae406e98e8dbee95993c2ca1eb4f26e50382e144f |
| Same revision `web-v1/model.glb` | Runtime SHA598ac628256d676867067268e96075bce7d47a5d81d2a613d5a7f9b104e56fc3 |
| Same revision `still-v2/` | Fresh 352×400 fallback atcamera 5.6, source-bound report; inspect320px review only |
| `docs/audits/2026-10-22-generated-bear-final-review.md` | Independent reference, deformation, framing and UI review |
| `docs/superpowers/handoffs/2026-10-19-bear-companion.md` | Current close-out plus historical evidence and publication contract |

## Completed asset work

- [x] Meshy 7.1 exact-reference generation, task 01a15fc4-4dc4-7116-aadf-3953ef4a9f1c,30 credits.
- [x] Remesh task 01a15fc7-1930-704d-b191-ce67f048917b,5 credits; measured 51,311 triangles (target 50,000).
- [x] Rig task 01a15fca-8ac6-74ad-a7c0-acd3ca841bab,5 credits;24 bones. Total 40/500 preapproved credits, 460 remaining; observed balance 2,060. No additional paid operation needed. Do not resubmit completed tasks.
- [x] Preserve original generation, remesh, fitted rig, metadata and four-angle reviews. Meshy API subscription failures are resolved history.
- [x] Root authored v4 broader raised-arm cheer, two 12cm bounces, head/torso sway and alternating accents. Saved exact builder/design inputs per revision. Original bind bones and body proportions remain unchanged.
- [x] Preserve rejected head35, proceduralblockout-v1–v10, arm-contactv1, gentlev2 and horizontal-armv3 studies with their actual evidence.
- [x] Actual Three.js raw-weight/skinning 169-pose probe, endpoint/root/floor checks, native/runtime parity 169 poses (max 3.482µm), arm-clearance 169 poses.
- [x] Geometry is one fused fixed-outfit mesh. Audit records 48 intrinsic bind contacts,max 62 total and zero NEW arm-torso/leg pairs; it proves neither zero contacts nor independently wearable garments.
- [x] Compress 1024px WebP textures plus normals/tangents/UVs, leaving positions/weights unchanged. EXT_texture_webp/KHR_mesh_quantization declared. Runtime 2,688,372 bytes/1,910,001 gzip bytes,51,311 triangles; validator 0 errors/0 warnings.
- [x] Strict 30 actual renderer views with real textures; actual game-clock five-viewport checks and user motion approval. CPU texture placeholders are not texture-rendering proof.

## Completed code/UI work and final gates

- [x] Existing all 11-game success identity/last-correct behavior, one-shot lifetime,
  audio order, reduced-motion still and optional-renderer failure remain preserved.
- [x] Enlarge reserved slots 176×200 desktop,144×164 phone/short,112×128 combined;
  camera 5.6 retains readable bear size while fitting expressive motion. Gallery
  camera remains 7.2; shared UI-kit uses the same presentation.
- [x] Fresh 352×400 fallback is rendered from current native source at 2× maximum
  CSS dimensions; no old-pixel upscaling. Strict hash/source-bound still gate.
- [x] Fix test measurement to wait for opaque ancestors, preserving the original
  pixel mask/tolerance. First full run 547/548 failed only during entrance opacity;
  regression reproduces 40px before/80px after. Keep the failed receipt.
- [x] Capture review pixels and dimensions from one PNG, checking unchanged
  visual/event/representation/rectangle. Scope valid praise media to visual-review
  tests so missing Czech clips cannot release held playback during capture.
  The previously failing Czech scene passes three repeats; actual product audio
  order/fallback/expiry contracts are unchanged. Remove synthetic regression
  receipts so they cannot be mistaken for actual-model proof.
- [x] Add both-locales 568×320 feedback/completion control coverage and advance
  E2E fixture to exact v4 model. Test-only interception never becomes a public URL.
- [x] Extend guarded publisher explicitly for bear-v2 generated proof; default
  bear-v1 behavior unchanged. 138 focused offline tests pass; final unit suite 600.
- [x] Finish final `npm run verify:integration -- --force`, recording fresh lint,
  unit, pure, audio-inventory, browser, test/production build and bundle results.
  Fresh final result:552 browser cases,600 units and all eight gates passed.
  Initial547/548 and550/551 failures remain preserved; neither is called passing.
- [x] Commit all owned code/inputs/reviews/reports/manifest after checks pass.
  Exclude unrelated B04/F02/female reports and ignored3D files. Do not open a PR.

## Reproduce or iterate without losing evidence

All commands run from repo root; choose NEW output folders for revisions. Retain
failed runs. Restore ignored files from this authoring checkout until remote
backup exists. Read each verifier's CLI for arguments; never fit the bear onto
canonical human vertex maps or silently alter accepted sources.

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_generated_bear_celebration.py --glb=assets/avatar/catalog-a/companions/bear-v2/revisions/meshy-rig-v1/rigged.glb --design=assets/avatar/catalog-a/companions/bear-v2/motion-design.json --output-dir=NEW_REVISION
node tools/avatar/optimize_generated_bear.mjs --input=NEW_REVISION/celebration.glb --output-dir=NEW_REVISION/web-v1
node tools/avatar/sample_generated_bear_runtime.mjs --glb=MODEL_GLB --contract=RUNTIME_CONTRACT_JSON --output-dir=NEW_RUNTIME_OUTPUT
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/verify_generated_bear_motion.py --blend=SOURCE_BLEND --glb=MODEL_GLB --samples=NEW_RUNTIME_OUTPUT/samples.json --report=NEW_PARITY_REPORT
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/audit_generated_bear_clearance.py --blend=SOURCE_BLEND --report=NEW_CLEARANCE_REPORT
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/render_bear_still.py --blend=SOURCE_BLEND --output-dir=NEW_STILL_OUTPUT --width=352 --height=400 --camera-distance=5.6
```

Before browser proof, run assets:manifest/verify and use an owned HMR-disabled
viewer. Browser verifier accepts only registered local companion paths. Actual
product-clock capture must observe rendered3D frames; preparatory GPU draws are
not visible action frames. Settled seek screenshots do not establish real-time
playback; the older inconclusive seek-video is retained separately.

## Deferred remote stage

Only resume when the user requests storage/publication and configures server-side
R2/Blob credentials. Prove private upload and restore/hash retrieval; then use
`node tools/avatar/publish_bear_companion.mjs --candidate=bear-v2`. The full schema
and fixed report descriptors are in the handoff's generated-publication-contract
section. Final v4 passes local proof/art validation and currently refuses at
`Private source storage must be complete before public publication`, as intended.
This refusal is not an upload or remote-backup pass. Public activation requires
immutable public GET/hash/bytes/CORS proof and matching still. Release is separate
and pending recordings still block it.
