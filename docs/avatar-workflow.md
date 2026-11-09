# Avatar workflow and agent handoff

Updated 2026-11-09 (bear companion `celebration-v6` published to Vercel Blob and live in production; canonical human catalog rules below). This is the entry point for both Codex and Claude. Use
`AGENTS.md` for repository rules, the shared Blender skill for execution, and
`tools/blender/catalog/README.md` for the detailed fitting/acceptance loop.
For the reusable reference-to-runtime process, read
[3D authoring guidance](avatar-authoring.md). Current candidate history below
does not replace its acceptance gates.

## Published bear learning companion — `celebration-v6` (2026-11-09)

The bear learning companion (`bear-v2` / runtime id `bear-v1`) is accepted, published on
Vercel Blob (`mudrolino-public-assets`, `fra1`), and live in production across all 11
mini-games (`src/avatar/companions/bear-v1.json`, `accepted: true`).

- **Runtime GLB**: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v6/web-v1/model.glb`,
  SHA-256 `db5ddc0dfe3d72ab7de2e80fc1a4ca853cd4bc1ae3cb1e665e3361ba50fe4d2a`
  (`3,552,892` bytes / `2,078,070` gzip bytes, under the `2,100,000` gzip budget).
- **Public URL**: `https://en1sa7u9gqowved5.public.blob.vercel-storage.com/avatars/bear-v1/db5ddc0dfe3d72ab7de2e80fc1a4ca853cd4bc1ae3cb1e665e3361ba50fe4d2a.glb`
- **Native source**: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v6/celebration.blend`,
  SHA-256 `20fb2aa84a168ef7560f0d6f20270067d392784fb695b3c4b3f74cf1339a2b20`, built by
  `tools/blender/catalog/build_generated_bear_celebration.py`.
- **17 clips + 6 bone-parented 3D accessories in one GLB**:
  - Clips: `celebrate`, `wave`, `clap`, `jump`, `finale` (`2.8s`), `idle` (`2.4s`),
    `search`, `think`, `listen`, `encourage`, `shrug`, `flex`, `bow`, `march`,
    `wiggle`, `peekaboo`, `stretch`.
  - Accessories (`parent_type = 'BONE'` on `Head` or `Spine02`, shared 64×64
    `AccessoryAtlas`, toggled via `userData.companionAccessoryId`):
    `accessory_crown`, `accessory_cap`, `accessory_glasses`, `accessory_bowtie`,
    `accessory_cape`, `accessory_medal`.
- **Verification**: 120Hz native/runtime parity across all 17 clips (`4,121` subframes)
  passed with `28.02 µm` max vertex error (`<= 30 µm` budget) and `0` new
  `arm-torso-leg` or `arm-head` contacts (`verification-progress.json` and
  `retrospective.md` under `assets/avatar/catalog-a/companions/bear-v2/`).
- **Fallback still**: `still-v2/bear-still.png` and `src/avatar/companions/bear-still.png`,
  rendered at `352×400` (`--camera-distance 5.6`, 2× the largest `176×200` CSS slot).
- **Asset manifest**: `assets/avatar/asset-manifest.json` tracks all `782` 3D files (`npm run assets:verify`).
  Historical `head35` (`bear-v1`) and procedural blockouts remain rejected comparison evidence.

## Resume in the correct checkout

Continue from the primary checkout at `/Users/svehla/playground/teo-learn`.
The user requested merging the avatar catalog into `main` and removing its
worktree. Check `git log -1` and `git status` before resuming and preserve local
changes. Follow the checkout authorization rule in `AGENTS.md`; launch Claude
in the primary checkout.

Verification reports copied from the former avatar worktree retain their
original commit, build identity and absolute-path provenance. They are historical
proof; run fresh checks for later model or code changes.

The live development catalog is http://127.0.0.1:3000/avatar-preview. One design
card joins focused references, per-base revisions and separate art/technical review.
Use `?item=T02&variant=female` for the fitted hoodie or `?item=walk` for motion.
The explicit design index and focused references are under `assets/avatar/catalog/`;
originals and source/proof paths stay unchanged. Archive contains raw source
inventory, with Include history for older attempts. The catalog refreshes as files change.
Use `?asset=female-outfit-T02-B01-F01-study` for the current female capsule and
`?asset=study-h01-painted-face` for the painted-face male head.
Older `?model=...` links resolve through the gallery; `?view=modular` opens the
gallery too. The old modular/customization UI and pre-catalog male assets have
been removed. See [viewer controls and checks](avatar-catalog-preview.md).

Authoritative inputs:

- [Approved palette-A gallery](../assets/avatar/concepts/2026-10-04/catalog-a/gallery.md):
  rounded matte Genmoji-like style, original category designs and construction sheets.
- [Female reference pack](../assets/avatar/concepts/2026-10-04/catalog-a-female/gallery.md):
  turnaround, six outfits, hoodie construction and accessory fit, with Claude
  modeling steps and exact prompts. Female 3D assets still need their own proof.
- [Progress and proof pointers](../assets/avatar/catalog-a/catalog-progress.json):
  status of each ID, study paths and outstanding repairs.
- `assets/avatar/catalog-a/foundation/catalog-body.blend`: shared fitting body/rig.
- Piece `.blend` files, builders and retrospectives: editable construction sources.
  Keep isolated fitting/style revisions separate until their dependent proof passes.
- See `ROADMAP.md` (`### 3D avatar — current direction`) and
  [per-design construction targets](avatar-construction-targets.md) for current
  human catalog wardrobe status and remaining open items.

## Current UI and runtime proof boundary

`/avatar-preview` is the live development gallery. The legacy home overlay,
parent customization screen, modular workbench and pre-catalog male models are
retired. Catalog construction sources, shared rig/gaits, references and all
fitting history remain. The bear learning companion (`src/avatar/companions/bear-v1.json`)
is integrated in production; customizable human catalog integration awaits final
wardrobe acceptance.

`/avatar-preview?agent=1` is a small tool-only rendering harness. Browser verifiers
intercept `/__avatar_fixture/body.glb`, `/__avatar_fixture/garments.glb`,
`/__avatar_fixture/walk.glb` and `/__avatar_fixture/run.glb` with source-bound
candidate bytes. This harness ships no public models and is not a wardrobe UI
or proof of production slot switching. Use `verify_catalog_preview.mjs` for its
actual candidate rendering checks and the gallery for visual review.

Historical generation context remains in
[the clothing pipeline](avatar-clothing-pipeline.md) and
[the 3D knowledge base](3d-avatar-knowledge-base.md). Their old runtime paths and
customization steps document retired experiments; use this handoff and the
catalog README for current work.

## Register assets for the gallery

After adding references or exporting models, use Archive to confirm the
new files and their status. Images under `assets/avatar/concepts/` are discovered
without editing React code. Curated designs require a record in
`assets/avatar/catalog/catalog.json`, with references, per-base revisions linked
to raw asset IDs, preferred revision and separate visual/technical review states.
Use `node tools/avatar/crop_catalog_references.mjs --check` to verify focused
references and their source/hash/rectangle provenance. Keep authoritative sheets outside `drafts/`; retain
superseded references there so history identifies them correctly. Existing male
`boards` and female `sheets`/`outputs` metadata formats are supported. Record the
actual output filename, shared wardrobe IDs, descriptive title and exact prompt
in the reference manifest to associate a sheet with the relevant model.

Keep canonical piece exports and their `.blend` sources together. Record stage,
retrospective and proof paths in `catalog-progress.json`; promote isolated studies
only after their own acceptance work. Give female fitted variants separate paths
and actual per-base proof. A file being viewable does not establish acceptance.
Use the source links to reach builders/proof rather than copying model artifacts
into the frontend. The gallery is an inspection tool; it does not edit metadata.

Register isolated models through `model_studies` in `catalog-progress.json`:

```json
{
  "id": "female-foundation-h02-study",
  "label": "Female foundation + H02 hair study",
  "path": "female/foundation/studies/h02-envelope",
  "model": "female-foundation.glb",
  "kind": "study",
  "base": "female",
  "stage": "State actual proof and remaining work",
  "reference_ids": ["H02", "T01"],
  "gait_compatible": true,
  "builder": "tools/blender/catalog/build_catalog_female_foundation_study.py"
}
```

Paths are relative to `assets/avatar/catalog-a`; models stay within their study
folder. Use `kind: "head"` for head/hair views, `repair_needed: true` for an open
failure, and `history: true` for superseded attempts. Gait compatibility must be
proven before enabling playback. Registration always retains candidate status,
without inferred fitting or acceptance. Logical female wardrobe milestones remain
pending until separately fitted; filenames alone establish no proof.

Rejected garment-only exports can also be linked directly as alternate revisions
in `assets/avatar/catalog/catalog.json`, with `sourcePaths` for the actual repair,
preservation and failed fitting reports. Keep `technicalReview: "repair-needed"`
and the preferred `currentRevisionId` unchanged. Do not use a playback override
to bypass the recorded-pass requirement; these comparisons remain rest-only.

See [gallery behavior and verification](avatar-catalog-preview.md) for routes,
refresh recovery and supported controls. After changing gallery tooling run the
focused browser verifier as well as the affected repository verification profile.

## 3D files live outside git

`.blend` sources and every `.glb` export are git-ignored (2026-10-13). Git keeps the
code, reports, renders and `assets/avatar/asset-manifest.json`: each 3D file's path, size
and SHA-256, plus relative symlinks. The bytes live in a private Cloudflare R2 bucket,
content-addressed as `sha256/<hash>`, so renames and duplicates cost nothing and a pulled
file is checked against its hash. Credentials go in `.env` (see `.env.example`).

- `npm run assets:pull [-- --prefix=assets/avatar/catalog-a/T04]` restores missing or
  changed files (`--dry-run` previews).
- After building or changing models: `npm run assets:manifest`, commit the manifest, then
  `npm run assets:push`. `assets:verify` compares the disk with the manifest.

The production app will need only accepted runtime exports (the phone LODs and the
walk/run clips, about 2 MB gzip each). Publish those to Vercel Blob when the avatar is
integrated, not through git.

## Repeatable asset work

Choose one reference/category and representative outfit. Reuse category geometry
helpers for consistent construction; fit the new shell to the fixed scaffold.
Keep style edits separate from rig/body changes. Use the per-piece loop in
`tools/blender/catalog/README.md`, including openings, bilateral correctives,
attachments, full-cycle body/layer fit, export/material parity and actual runtime
rendering. Write a retrospective after each piece and apply the demonstrated fix.

For attachment repair, use diagnosed poses to explain the defect, then screen
each proposed change without saving across the complete dense own-shell and
distance sweep. A few cleared poses cannot justify a saved fitting candidate:
B04's bounded target study cleared five diagnostic poses but left contacts later
in the run cycle. Preserve rejected studies; run the broader source/export/outfit
gates when the full cheap screen clears. Shared body weights remain fixed. A
detail-only attachment revision may transfer real underlying shell weights with
an explicit changed-vertex inventory and unchanged-field proof.

Prefer these repo commands; `package.json` and each script's `--help` are the
command reference:

```bash
npm run avatar:blender -- --version
npm run avatar:blender -- tools/blender/inspect_avatar_glb.py --help
python3 tools/avatar/verify_catalog_piece.py --help
npm run avatar:catalog:inspect
npm run avatar:catalog:capture
```

Capture runs use a fresh timestamped review directory;
`CATALOG_STYLE_REVIEW_OUTPUT` can select a deliberate output path. Existing dated
review evidence is preserved by default.

`BLENDER_BIN` selects an executable path (spaces are supported) or a command on
PATH. An invalid explicit override fails rather than silently selecting another
version. The shared runner uses `--python-exit-code 1`: Blender otherwise can
print a Python exception and still exit successfully. Verification runs preserve
stage logs and current source hashes; historical reports are not refreshed by
changing a status label.

Use one authoring agent, one model and one bounded change at a time. Optional
subagents are limited to narrow read-only checks of stable artifacts. Serialize
Blender through the shared per-user advisory queue; checkout/worktree use still
requires the authorization described in AGENTS.md:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py SCRIPT [arguments]
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py --id=T05 --garment=T05_crew_sweatshirt --outfit=T05-B01-F01-A01 --head-check
```

Wrap an entire sequential runner once; nested queue wrappers fail explicitly.
Unwrapped jobs bypass the lock. The wrapper forwards interrupts, preserves exit
status and leaves the lock held by its direct child if the wrapper is killed.
For live MCP work, use one client as scene owner,
save a revision script and source before handing off, and run the same CLI gates.
Keep failed studies/reports. Dependency links, Python caches and Blender `.blend1`
backups are ignored; canonical `.blend` files and deliberate revisions remain visible.

## Selfie personalization: 2D texture on a reusable head

The product contract is a selfie-derived stylized **2D face texture**, applied to
a reusable 3D head. H01-H06 remain fictional style/hair references; they are not
instructions to generate a personalized 3D mesh for every user. The previous
face-first study remains useful visual evidence. Its proposed personalized head
and expression-first sequence is superseded by this clarification.

Proposed data flow:

1. A parent chooses a selfie behind the parent gate. A server/serverless endpoint
   transforms it into a neutral, frontal palette-A face with even lighting and
   recognizable identity. Keep provider credentials server-side.
2. Align eyes/nose/mouth to one canonical face template, remove the background and
   return a masked PNG plus skin-tone metadata. Validate format/dimensions and
   let the parent preview, regenerate, accept or reset the result.
3. Apply that image to a UV-mapped facial region on the rounded reusable head.
   Blend the face boundary into the head's skin tone. Keep side/back geometry and
   compatible hair as reusable assets; hair variants can be chosen separately.
4. Persist only the accepted generated asset and metadata locally by default.
   Raw selfies are transient by default; backend/provider retention must be
   configured and disclosed before launch. Local reset deletes the generated asset.
   A provider call sends the image outside the device; this feature needs a thin
   backend even though the rest of the app is local-first.

The generic head supplies actual volume, shading and the neck attachment. The
texture supplies identity through features, brows, coloring and beard marks.
A front selfie does not recover the person's exact side profile or skull shape.
Preserve likeness within that deliberate stylization and review front/three-quarter/
side angles rather than promising an exact 3D scan.

The original, now earlier H01 combines modeled eyes, nose, lips, beard and hair in rigid Head-weighted
geometry. Its head GLBs have no TEXCOORD_0. Simply pasting a face image would leave
duplicate features. Author a **separate texture-ready head study** with one named
`face_surface` material, a stable UV template/mask, neutral skin material and
compatible simplified feature geometry. Remove conflicting baked/vertex color
tints and modeled beard details from that version. Export UVs and base-color
textures explicitly; the garment exporter currently uses `export_texcoords=False`.

Begin with a local sample texture, then one consenting real-selfie proof when
provided. Verify recognizable identity, no duplicated eyes/mouth, seam blending,
orientation/color and neck/hair/clothing clearance in the real viewer. Prove UV
and image preservation through GLB reimport. A small face decal at `face_anchor`
is an optional placement experiment; the intended finish is a fitted UV surface.
Only after the neutral texture works, test consistent blink/smile texture variants
or generic facial morphs. No selfie upload/generation endpoint exists yet.

The new female H02 study supplies `canonical-face-layout.json`, a mask and a
fictional sample PNG. Its head has a front facial material region, separate hair
and preserved shared rig/actions. This proves a reusable texture transport fixture;
it does not prove selfie likeness, a production upload flow or facial expressions.
Use its canonical coordinates and mask as the next image-generation output contract.
The original H01 exports remain unchanged and lack this UV surface.

Both bases now have painted default faces (2026-10-05). H02's `sample-face.png`
and the texture-ready H01 study (`H01/style-revisions/painted-face/`, whole-head
`face_surface`, no modeled eyes/brows/lips or vertex-color beard) come from
`node tools/avatar/paint_catalog_face.mjs --face=H02|H01`. The painter draws a front
view in head millimetres and samples it at each texel's surface point; its head
functions must match the builders' surface formulas. Pass the PNG to the builder
with `--face-image`. The H01 transport gate is `verify_catalog_head_texture.py`.

Next: heads are **+30% on both bases** (user decision 2026-10-07): use
`H01/style-revisions/painted-face-scale-130/` and `female/foundation/studies/h02-scale-130/`.
Head-dependent pieces fit to measured head envelopes, not fixed coordinates: see
`build_catalog_a01_fitted.py` (under-hat hair key, envelope crown) and
`verify_catalog_headwear.py` (fit gate: no floating, no intersections, gait and
gestures). Priorities are in `docs/audits/2026-10-07-avatar-fit-and-tooling-audit.md`.
Done as of 2026-10-08: A02, female T01 and exact O01, hood refits, T06 buttons,
B04/F02 promoted after measurement, exact male O02/O04, B03 thigh coverage and
A03/A04 glasses on both bases. Open decision: the run leg-fold contact in B03/O03.
Next: tee-sleeve skinning (see-through arms in motion), A05, A06 and the rest of
the female wardrobe. Hair variants H03–H06 are radial shells on the same reusable heads
(`build_catalog_hair_variant.py`, verified per outfit); caps/beanies need a refit per hair. Check holes in gait poses too (`--pose-stride`). Compare self and detail contact counts with
the passing sibling garment (`audit_catalog_detail_shell.py`), not with zero. Keep
expressions, real-selfie generation and final acceptance separate.

## Tooling & MCP notes

- **Blender**: **5.2.2 LTS** at `/Applications/Blender.app` (with `5.1.1` retained at
  `/Applications/Blender 5.1.1.app`). The shared CLI (`tools/avatar/blender_cli.py`)
  selects the standard app; set `BLENDER_BIN` for an explicit override.
- **Blender MCP**: Optional (`mcp-for-blender`, https://github.com/ahujasid/mcp-for-blender).
  Only one MCP client should own a live Blender scene at a time; cross-agent
  reproducibility always comes from saved builder scripts and CLI proof through
  `tools/avatar/blender_queue.py`. Connecting MCP does not authorize paid generation credits.

## Reusable catalog fitting invariants

- **Female foundation/H02**: A separate study preserves the shared 24-bone rig,
  body vertex order, bind pose and walk/run actions. Inspect front/back/side views
  after technical clearance: collision-free hair can still read as separate hanging strips.
- **Bilateral corrective isolation**: A repaired helper does not repair saved masters.
  Audit saved bilateral keys before dense fitting; bound repairs by exact coordinate
  differences and compare unchanged source fields. Distance-to-shell and own-shell
  contact are independent gates.
- **Incident-face-safe opening cutoffs**: Preserve face-safe cutoffs below garment
  openings; change the shell/closure instead of erasing visible ankle/neck anatomy.
- **Controlled hood/pocket surface fitting**: Projecting a thick folded detail onto a
  shirt can crumple topology. Fit sampled points on a parameterized surface first, then
  add controlled thickness and transfer actual cloth weights. Keep sewn anchors distinct
  from intentional free portions, and use role attributes for reproducible detail sweeps.
- **Quaternion interpolation tolerance**: Blender `LINEAR` scalar quaternion curves
  normalize component interpolation, whereas glTF `LINEAR` quaternion tracks use SLERP
  in Three.js (differing by up to ~191 µm at intermediate samples on human gaits).
  Preserve native-action fit and actual-runtime pose fit separately, and compare
  exported skinning under equivalent poses against the 30 µm transport tolerance.
- **Classify contacting body polygons against the complete bent limb**: Before proposing
  a garment offset, check whether contacts come from a folded foot vs. thigh/crotch
  (`B03`), and record control saturation alongside pose values.
- **Validate complete ordered pose inventories**: Derived measurement reports must
  reject missing endpoints or relabelled frames even when surviving numeric maxima
  are unchanged.
- **Browser captures**: Use `node tools/avatar/verify_model_studies.mjs --asset=<registered-id>`
  with a dedicated `DISABLE_HMR=true` local server as documented in
  `avatar-catalog-preview.md` so buffered Vite reloads cannot cancel initial module loads.
