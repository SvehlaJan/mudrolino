# Bear companion — asset work package

Entry point: [implementation plan](../2026-10-19-bear-companion.md).
Complete Tasks 1–3 in order. These instructions describe new work; named bear
builders/verifiers do not exist at the planning baseline.

## Task 1: Restore, measure and freeze the starting outfit

**Read:** the entry point's model reading list and
`assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/retrospective.md`.

**Create:** `assets/avatar/catalog-a/companions/bear-v1/source-inventory.json`,
`bear-design.json`, `retrospective.md` and the implementation handoff.

- [x] **1.1 Check the toolchain without changing it.**

  ```bash
  node --version
  npm run avatar:blender -- --version
  ```

  Use local dependencies from `npm ci` if absent. After installing dependencies,
  run `npm run setup:browsers` before browser gates. Read the matching Blender
  executable through the wrapper; do not hardcode an application version.
- [x] **1.2 Restore only missing source bytes.** The starting assembly is
  `assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/outfit.blend`, before
  LOD reduction. The planning manifest pins it to
  `cb55aa76cddf3db3070465903595fefda1a37a02bfb3b08f053efec4d9d5d8be`.
  Its dependencies are the original shared fitting body, the painted/scaled H01
  foundation, T01 `sleeve-coverage-v1`, B01 and F01. Restore only what the measured
  construction needs; a newer intentional source revision requires new inventory
  and proof, not an overwrite to recover the planning hash.

  ```bash
  npm run assets:pull -- --prefix=assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/
  ```

  Run source-specific pulls for missing dependencies after reading
  `assembly-report.json`. The full assembled `.blend` normally contains its rig,
  meshes and materials. The command may access private R2 using existing local
  credentials; keep them in the environment/repo-local `.env` and out of output.
  If access is missing, report the exact missing source and continue the pure
  runtime tasks. Do not substitute an unrelated model or paid generation service.
- [x] **1.3 Inventory the actual scene.** Use a queued Blender read-only script
  and save: file SHA-256; armature name, 24 bone names/hierarchy/rest matrices;
  body mesh vertex/polygon indices, masks and weights; garment object names;
  material assignments; head/neck bounds; shoulders, wrists and shoe bounds;
  walk/run action signatures; source FPS and metres scale. Reuse
  `geometry_signature`, `rig_signature` and `motion_signature` from
  `tools/blender/catalog/build_catalog_head_style_study.py`.

  Expected source names are `Armature_Catalog`, `body_underlayer_male`,
  `H01_head`, `T01_crew_tee_outfit`, `B01_straight_trousers_outfit` and
  `F01_strap_sneakers_outfit`; trust the scene inventory if a newer source differs
  and record the mapping explicitly. The bear is gender neutral even though this
  fitting source has a historical male label.
- [x] **1.4 Save the construction parameters.** Measure the middle reference B
  in `assets/avatar/concepts/2026-10-19/bear-mascot/comparison-v1.png` and record
  head/body height ratio, head width, ear diameter/offset, muzzle width/projection,
  eye spacing, head/neck attachment and hand silhouette in `bear-design.json`.
  Store dimensions relative to measured head/neck anchors, not screen pixels.
  Include the reference SHA and explicit honey/muzzle/nose/eye material values.
  This is the input to a repeatable builder, not a guess hidden in a live scene.
- [x] **1.5 Freeze sources.** Work in the new `companions/bear-v1` directory.
  Save the immutable inventory and source hashes before construction. Existing
  canonical human sources, bone rest transforms, gaits and coverage vertex
  indices remain unchanged. Record the first unchecked step in the handoff.

**Done:** every required source is present and hash-accounted for; all scene
identities and proportions needed by Task 2 are measured. No technical pass or
art approval is inferred from this inventory.

## Task 2: Construct the fixed-outfit bear B

**Create:** `tools/blender/catalog/build_bear_companion.py` and bear-directory
`outfit.blend`, `outfit.glb`, `body.glb`, `garments.glb`,
`construction-report.json`, `bear-still.png` and 320px review renders.
The 3D files are ignored and later stored through `asset-manifest.json`.

- [x] **2.1 Implement the builder with this CLI contract.** It loads the frozen
  source, reads the explicit design configuration, and refuses to overwrite its
  input. Reuse the catalog's export, material and rig helpers after inspecting
  their current signatures. `build_catalog_t01.export()` disables texture
  coordinates; use the UV-preserving exporter for textured features.

  ```bash
  python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_companion.py --source=assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/outfit.blend --design=assets/avatar/catalog-a/companions/bear-v1/bear-design.json --output-dir=assets/avatar/catalog-a/companions/bear-v1
  ```

  The script's required arguments are `--source`, `--design`, `--output-dir`;
  add `--lod` in Task 3. Save a deterministic result given identical inputs and
  builder version, including a report with all input/output hashes.
- [x] **2.2 Build the head as bear geometry.** In the cloned scene, replace the
  human head/hair/face with a rounded head, round ears, lighter muzzle, small dark
  nose, gentle eyes/eyebrows and closed smile. Bind head/face/ear surfaces rigidly
  to `Head`; keep their world-space rest alignment and a covered neck junction.
  Keep the original rig and human files untouched. Use simple matte surfaces
  and geometry/paint appropriate for an approximately 120px feedback character;
  fur strands, dynamic fur and facial animation are outside this version.
- [x] **2.3 Fit the visible body to the identity.** Make the copied exposed
  neck/arms/hands honey brown with single-user material copies so the human
  material datablocks are preserved. Preserve the shared body topology and mask
  indices. A soft paw silhouette can use bear-specific hand surfaces bound to
  `LeftHand`/`RightHand` and a reversible coverage mask on the cloned body. Fit
  those surfaces through sleeve openings. Preserve semantic separation between
  body/head and the three garments; a combined runtime export is allowed, but
  do not bake the clothes into an inseparable authoring mesh.
- [x] **2.4 Match B rather than accepting a bear head on C's silhouette.** Compare
  head/torso/limb ratios against `bear-design.json` in front and three-quarter
  views. First reach the intended balance through the head, muzzle, ears and
  surface shapes around the frozen rig. If it cannot match B within this fitting
  envelope, document the measured discrepancy and present that concrete candidate
  for proportion review. Do not silently alter the shared joint centres or switch
  to concept C. Bear-specific garment/body revisions may be built in the isolated
  directory and require fresh proof; full wardrobe compatibility is not required.
- [x] **2.5 Fit T01/B01/F01 explicitly.** Check neck, sleeves, shirt hem, waistband,
  ankles, shoes and all visible cut boundaries at rest. Preserve source garment
  colours/material roles. The known human tee underarm compromise was accepted
  for particular historical outfits; it is not automatically accepted for this
  bear and new dance. Correct a bear-specific gap or show it as an unresolved
  candidate limitation. A report must not label a visible new gap as a pass.
- [x] **2.6 Produce the model review.** Render front, side, back, three-quarter
  and a small face/feedback-size view at <=320px width. Use the catalog setup's
  neutral lighting/material pipeline. Export a transparent, still, warmly smiling
  `bear-still.png` from this model, with enough resolution for DPR 2 at its final
  UI size. Keep the canvas framing and foot margins consistent with the runtime.
  This still will be bundled for reduced motion/loading fallback.
- [x] **2.7 Save the candidate and retrospective.** Record changed objects,
  measured ratios, preserved rig/gaits/source hashes, fit findings, rejected
  revisions and output files. Present the actual 320px model captures for
  revision-specific user art review after technical screening. Continue Tasks
  3–6 while review is pending; publication stays pending.

**Done:** reproducible bear-B candidate in one outfit, complete authored sources,
separate objects, source-bound construction report and usable transparent still.
Art approval and motion/export/runtime acceptance are separate fields.

## Task 3: Author, optimize and prove the celebration

**Create:** `tools/blender/catalog/build_bear_celebration.py`,
`tools/avatar/verify_bear_companion.py`, `tools/avatar/verify_bear_runtime.mjs`;
bear-directory `outfit-lod.blend`, `outfit-lod.glb`, dance/export/budget reports
and `verification-summary.json`.
**Modify:** `src/avatar/AvatarRuntimeFixture.tsx` for one tool-only bear branch.

- [x] **3.1 Author a small stationary dance.** Implement the new queued script:

  ```bash
  python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_celebration.py --blend=assets/avatar/catalog-a/companions/bear-v1/outfit.blend --duration=1.4 --fps=30
  ```

  Save an action named exactly `celebrate`, from frame 0 to 42 at 30fps. Start
  and end in the same warm, relaxed pose. Suggested motion keys: rest at 0,
  gentle left sway/arm lift at 7, centre at 14, right sway at 21, centre at 28,
  smaller delighted arm lift at 35, rest at 42. Keep root horizontal travel zero;
  use small knee/torso/arm movement rather than jumping or a full spin. Keep both
  feet on/above the floor with at most 2mm penetration. Bound intended pelvis bob
  to 10mm and side sway to 20mm, and capture that range for camera fitting.
  These are implementation defaults, not instructions to claim art acceptance.
- [x] **3.2 Bake the correct transforms.** Inspect local bone axes and produce
  proper quaternion rotation keys in the existing bone space. Bake any IK into
  the original 24 deformation bones, excluding temporary constraint rigs from
  export. Assign the new action and its layered action slot before writing keys;
  see the Blender skill's `action_slot` example. Keep existing walk/run actions
  intact in the editable source, but export only `celebrate` in this runtime GLB.
  Preserve intentional hip bob in runtime using `preserveHipsPosition`.
- [x] **3.3 Produce the phone LOD.** Extend the new bear builder's `--lod` mode
  to use the catalog's culling/decimation primitives on the isolated bear sources.
  The existing `build_catalog_lod.py` only recognizes named H01/H02 heads and
  exports with the gait-oriented profile; calling it unchanged can miss the bear
  head or drop the dance. Use explicit bear object sets and active-action export.
  Avoid changing canonical helpers if a small wrapper is enough.

  ```bash
  python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_companion.py --source=assets/avatar/catalog-a/companions/bear-v1/outfit.blend --design=assets/avatar/catalog-a/companions/bear-v1/bear-design.json --output-dir=assets/avatar/catalog-a/companions/bear-v1 --lod
  ```

  In LOD mode the source already contains the bear and dance: optimize/export it,
  rather than constructing a second head. Write only `outfit-lod.*`, its budget
  report and the refreshed still. Require <=95,000 rendered triangles and <=2.1MB
  gzip for the model/outfit; report the embedded clip's contribution separately.
  Keep four normalized skin influences, prune sub-export-threshold weights, and
  preserve material/UV assignments. Recheck every reduced surface through dance.
- [x] **3.4 Implement fresh dance-specific native/export proof.** New verifier CLI:

  ```bash
  python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/avatar/verify_bear_companion.py --blend=assets/avatar/catalog-a/companions/bear-v1/outfit-lod.blend --glb=assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb --substeps=4 --output-dir=assets/avatar/catalog-a/companions/bear-v1
  node tools/avatar/validate_gltf.js assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb
  ```

  The new verifier must inspect all 169 quarter-frame samples, including both
  endpoints, and write report JSON before exiting nonzero on failure. Check:
  body/garment/head/layer clearance, visible garment opening coverage, shoe/floor
  clearance, weights, materials, UVs and textures, exactly one intended clip and
  its 1.4s duration, nonconstant intended motion, rest/rig preservation and budgets.
  Compare evaluated source with the actual exported animation, including runtime
  quaternion interpolation, not only Blender's original curves. Use the existing
  30 micrometre source/export threshold and rendered-surface comparison methods.
  Do not simply run `verify_catalog_outfit_export.py`, which samples walk/run.
  Any deliberately joined face surfaces are described explicitly; they are not
  an excuse to exclude head/shirt or sleeve/paw contacts.
- [x] **3.5 Extend the guarded agent fixture.** In `AvatarRuntimeFixture.tsx`,
  recognize `?agent=1&companion=bear`. This branch uses the fixed
  `/__avatar_fixture/bear-v1.glb` as the full model with embedded `celebrate`,
  no external garments/animation URLs, and `preserveHipsPosition`. Add bounded
  inspection `pose` (0–1) and a known camera `view` for deterministic captures.
  Keep the existing `agent=1` walk/run fixture unchanged; never accept arbitrary
  file paths/remote URLs from the query. Preserve the route's current dev/POC guard.
- [x] **3.6 Implement the actual-renderer proof script.** New CLI:

  ```bash
  DISABLE_HMR=true VITE_AVATAR_POC_ENABLED=true npm run dev -- --port=3003 --host=127.0.0.1 --strictPort
  ```

  In a separate terminal, once the owned server is ready:

  ```bash
  node tools/avatar/verify_bear_runtime.mjs --base=http://127.0.0.1:3003 --output-dir=artifacts/verification/bear-companion
  ```

  Model the script on `tools/avatar/verify_catalog_preview.mjs`: intercept the
  one fixed bear URL with the hash-checked LOD bytes, support HEAD/GET, wait for
  the model/clip/canvas rather than sleeping blindly, and capture distinct dance
  poses at all three representative sizes. Save 320px review copies and source,
  viewport, frame, build/commit and failure metadata. Verify no clipping at every
  sampled camera extent; compare both pixels and declared clip/pose. A static
  frame with a canvas present is insufficient. Re-run this after Task 5 changes
  playback and after any model bytes change.
- [ ] **3.7 Consolidate proof and commit owned files.** Native/export, runtime,
  material and budget report hashes must all match the current candidate. If the
  runtime check must wait for code completion, mark that exact stage pending and
  continue Task 4; do not write an overall pass. Run lint, Vitest and affected
  pure verifiers before committing code. Register and privately store candidate
  sources using the R2 manifest workflow in main-plan Task 7.2 now, before a
  cross-machine handoff. First check for preexisting missing manifest entries:
  the full manifest rebuild scans local disk, so a partial checkout must restore
  its missing entries with `npm run assets:pull` before rebuilding. Inspect the
  resulting diff for unrelated changed files and coordinate those separately.
  If R2 access is unavailable, explicitly mark the candidate local-only and save
  its exact paths/hashes; do not claim another machine can restore it. A local
  executor may continue pure/runtime work with those bytes. Commit scripts,
  configuration, reports, retrospective and the intended manifest changes;
  never force-add `.blend` or `.glb` bytes.

**Done:** the actual bear/outfit/dance LOD passes newly run, hash-bound proof and
the summary lists each stage. Later one-shot/gameplay proof and final user art
approval remain separate acceptance requirements.
