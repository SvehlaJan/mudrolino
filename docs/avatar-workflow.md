# Avatar workflow and agent handoff

Updated 2026-10-05 (reference audit). This is the entry point for both Codex and Claude. Use
`AGENTS.md` for repository rules, the shared Blender skill for execution, and
`tools/blender/catalog/README.md` for the detailed fitting/acceptance loop.

## Resume in the correct checkout

Continue from the primary checkout at `/Users/svehla/playground/teo-learn`.
The user requested merging the avatar catalog into `main` and removing its
worktree. Check `git log -1` and `git status` before resuming and preserve local
changes. Follow the checkout authorization rule in `AGENTS.md`; launch Claude
in the primary checkout.

Verification reports copied from the former avatar worktree retain their
original commit, build identity and absolute-path provenance. They are historical
proof; run fresh checks for later model or code changes.

The live development gallery is http://127.0.0.1:3004/avatar-preview. Open a card
for references, model inspection, prompts and source files. The read-only gallery
refreshes as local asset files change; use Include history for older attempts.
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
  status of each ID, study paths and outstanding repairs. Accepted IDs are empty.
- `assets/avatar/catalog-a/foundation/catalog-body.blend`: shared fitting body/rig.
- Piece `.blend` files, builders and retrospectives: editable construction sources.
  Keep isolated fitting/style revisions separate until their dependent proof passes.

At this handoff, eleven wearables retain fitting-candidate status; B03/B04/F02
need corrective repair. F04's independent checks and isolated T05/B01/F04 core
have passing proof, while complete O05/A02 and promotion remain open. The isolated
F02 study removes bilateral leakage but retains its heel-tab own-shell failure.
The female H02 study has a compatible rig and reusable UV face fixture. The H01
revision is a style study, with no facial UV export or expression targets. These
are useful milestones, not an accepted production catalog. The female foundation is an isolated candidate; its separately fitted wardrobe
and style acceptance remain in scope.

## Current UI and runtime proof boundary

`/avatar-preview` is the live development gallery. The legacy home overlay,
parent customization screen, modular workbench and pre-catalog male models are
retired. Catalog construction sources, shared rig/gaits, references and all
fitting history remain. Product avatar integration will use accepted catalog
assets in a future phase.

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

After adding references or exporting models, use the live gallery to confirm the
new files and their status. Images under `assets/avatar/concepts/` are discovered
without editing React code. Keep authoritative sheets outside `drafts/`; retain
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

See [gallery behavior and verification](avatar-catalog-preview.md) for routes,
refresh recovery and supported controls. After changing gallery tooling run the
focused browser verifier as well as the affected repository verification profile.

## Repeatable asset work

Choose one reference/category and representative outfit. Reuse category geometry
helpers for consistent construction; fit the new shell to the fixed scaffold.
Keep style edits separate from rig/body changes. Use the per-piece loop in
`tools/blender/catalog/README.md`, including openings, bilateral correctives,
attachments, full-cycle body/layer fit, export/material parity and actual runtime
rendering. Write a retrospective after each piece and apply the demonstrated fix.

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

Parallelize authoring, review and documentation; serialize Blender through the
shared per-user advisory queue across worktrees:

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

Current H01 combines modeled eyes, nose, lips, beard and hair in rigid Head-weighted
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

Next: follow the order in `docs/audits/2026-10-05-avatar-reference-audit.md`. Head
size needs a decision first (it reverses the 2026-10-04 "keep proportions"
choice), then hair volume, hoods (including the fuller female T02 hood) and A01.
Footwear, bottoms and rib bands are independent. Repair F02 heel-tab own-shell
contact and B03/B04 corrective leakage. Keep real-selfie generation, expressions,
headwear compatibility and final acceptance as separate work.

## Tooling assessment (checked 2026-10-04)

Blender is now **5.2.2 LTS** at `/Applications/Blender.app`. The previous 5.1.1
app is retained at `/Applications/Blender 5.1.1.app`. The shared CLI selects the
standard app; use `BLENDER_BIN` for explicit fallback. Native settings migration
preserved the existing Blender Lab MCP extension, confirmed configured and loaded
on a fresh normal startup. See the [upgrade audit](audits/2026-10-04-blender-lts-upgrade.md)
for checksum/signature, migration and the passing 16-pose export smoke. The separate H02 head uses a UV-preserving export profile with its own fixture proof. [Official LTS support](https://www.blender.org/download/lts/).

A later process audit found Claude Desktop's Blender MCP extension running; the
earlier direct-config inspection missed that extension-based connection. This
Codex session still exposes no callable Blender MCP tools. Addon loading is
confirmed, but no end-to-end Claude client call was made here. Preserve existing
client configuration rather than adding a duplicate server.

For a new third-party MCP connection, current upstream is **mcp-for-blender**,
formerly blender-mcp, with Claude and Codex support. That is an optional alternative
to the installed extension, not an update that was installed here.
[Upstream setup](https://github.com/ahujasid/mcp-for-blender).

For a deliberate installation session, upstream currently documents:

```bash
claude mcp add blender uvx mcp-for-blender
codex mcp add blender -- uvx mcp-for-blender
```

These are setup references, not commands run by this handoff. Pin a tested package
version in client args once selected, match its addon and record both versions.
GUI clients may need an absolute path to `uvx`. Only one MCP client should own the
live Blender scene; cross-agent reproducibility still comes from saved code and
CLI proof. Paid generation integrations need their own authorization; connecting
MCP does not authorize spending credits.

Existing glTF-Transform, Khronos validation, Playwright and native Blender checks
already cover the key verification needs. Highest-value additions are a canonical
face UV fixture and a small reusable Blender Asset Library of validated category
parts/materials. A new generator service is lower priority than consistent
references, category construction and fit checks. The subsequent user-authorized Blender update is recorded in the upgrade audit;
MCP client configuration was preserved.

## Historical wrap-up verification (2026-10-04)

This section records the earlier code/assets. Its modular-workbench checks do
not describe current UI; that workbench and pre-catalog male exports were retired
on 2026-10-05. The retained catalog sources, references and fitting history are
still available in the live gallery.

Fresh checks on 2026-10-04: lint passed with zero errors and the known
ContentContext warning; 96 unit tests passed; all pure verifiers passed after
rerunning outside the sandbox because tsx IPC was denied there. Both skill
entry points passed the skill-creator validator. Focused CLI tests cover literal
paths/arguments, version selection and failure propagation; real Blender also
returned exit 1 for an intentional Python exception.

F03 opening regression at its 0.185m boundary accepted the safe source and
rejected the unsafe fixture, with the master SHA unchanged. Desktop/phone
catalog inspection and the existing modular workbench passed through the new
npm command, including Walk/Run, pause/scrub, camera/zoom/reset and skeleton.
Reports are under `artifacts/verification/avatar-catalog/wrap-up/` and
`artifacts/verification/avatar-catalog/inspection-page/`. The fresh timestamped
capture was smoke-checked separately. The subsequent fresh `verify:edit -- --force` selected and passed integration
before the requested commit: lint, 96 unit tests, pure verifiers, audio inventory,
integration browser checks, production build and bundle boundaries. Report:
`artifacts/verification/2026-10-04T15-34-07-813Z-integration.json`. No release
profile was run. These checks do not accept unfinished models or implement
selfie generation; female references are a modeling input.

## Historical model batch findings (2026-10-04)

- Female foundation/H02: a separate study preserves the shared 24-bone rig,
  body vertex order, bind pose and walk/run actions. Dense 163-pose gait and six
  head gestures clear the hair; rejected envelopes remain alongside the final
  continuous rear shape. Inspect front/back/side views after technical clearance:
  collision-free hair can still read as separate hanging strips.
- F02: remove exactly twelve inherited Left deltas from the Right corrective.
  Canonical masters remain unchanged. Independent/outfit sweeps and export/runtime
  pass, while 178 heel-tab/shell triangle pairs persist at run 12.25 on both old
  and repaired sources. Distance-to-shell and own-shell contact are different gates.
- A repaired helper does not repair saved masters. Audit the saved bilateral keys
  before dense fitting; bound repairs by exact coordinate differences and compare
  unchanged source fields. Reproduce new failures on the original source.
- Bind browser proof to isolated source paths, completed model/gait GETs and changing
  gait pixels. Use `--outfit-dir`, `--output-dir`, `--preview-url` and `--production`
  on `verify_catalog_preview.mjs`; source/report symlinks must stay within their roots.
  The ordinary runtime F02 captures crop shoes; complete framing acceptance remains
  open even when the gallery inspector can show the full outfit.

Run `node tools/avatar/verify_model_studies.mjs` for registered study playback on
desktop/phone. Evidence and 320px reviews live under
`artifacts/verification/avatar-catalog/model-studies/`. Final style remains pending
until user feedback; no study is promoted to the published avatar by these checks.

Fresh model-batch browser proof: eight desktop/phone gallery cases passed with
model/gait HTTP byte hashes, parsed models and moving Run pixels. The female
head/hair correctly disable gaits. Gallery framing includes the complete F02
outfit; ordinary app runtime framing still crops footwear and remains open.
The strengthened UV gate also rejects a corner swap that preserves the UV multiset.
User reviewed the concrete 320px front/back views and chose: keep these
proportions; fit the first female outfit next. This accepts that direction for
the next study and leaves complete style/wardrobe acceptance open.

Fresh final repository gate: `npm run verify:edit -- --force` selected integration
and passed lint (zero errors, known ContentContext warning), 127 unit tests, all
pure verifiers, audio inventory, 472 browser checks, production build and bundle
boundaries. Report: `artifacts/verification/2026-10-04T20-43-49-878Z-integration.json`.
Dedicated gallery desktop/phone and all eight model-study cases passed on current
model bytes. No release profile or deployment was run.


## First female outfit continuation

The user chose to keep the reviewed female proportions and fit T02/B01/F01 next.
The isolated source is `assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01/`;
inspect `?asset=female-outfit-T02-B01-F01-study`. This orange hoodie/navy trouser/
one-strap sneaker capsule is a technical combination, not reference O02. Keep
canonical masters and the frozen H02 foundation separate. Final status and exact
proof pointers are in `catalog-progress.json` and the study retrospective.

Input decision: preserve the reviewed female proportions and fixed H02. This
T02/B01/F01 capsule uses approved category construction; it is not reference O02.

The untouched garment probe exposed two real issues: T02 collided with H02 hair
(up to 717 pairs in run 7.25), and incident-face-safe F01 masking exposed roughly
194 opening-adjacent body pairs that the older vertex mask hid. Preserve the
114mm face-safe cutoff below the 118mm opening; change the shell/closure instead
of erasing visible ankle anatomy. B01 and initial garment layers were clear in
the diagnostic poses, requiring fresh complete proof rather than a refit claim.

Projecting the existing thick, folded hood onto the shirt reduced contacts but
crumpled its topology. The projected closure also crossed its shoe shell. Fit
sampled points on a new parameterized surface first, then add controlled
thickness and transfer actual cloth weights. Keep sewn anchors distinct from
intentional free portions. Role attributes make joined pocket/hood/tongue/strap
checks reproducible without changing approved material colors.

The fixed naked body/hair regression samples remained clear. The minimum
bidirectional vertex-to-surface distance was 11.703mm at run 7.25; it is an upper
bound on the true triangle minimum, not guaranteed clearance. Remaining contacts
were exclusively in a narrow central hood region after the shirt-back relief.
This supports testing a thinner controlled hood, without changing the chosen
hair or body geometry/binding.

Source preservation alone is insufficient proof: check independently saved piece
masters against assembled counterparts; validate face UV/image transport in the
runtime-consumed body.glb as well as outfit.glb; guard all removed-face openings;
and bind the combined runtime error to a current passing deformation report.

The first complete controlled-component sweep also exposed front-pocket own-shell
contacts that a four-pose probe missed. Require complete detail sweeps before
counting fit. The new runner overwrites previous success with running state,
validates structured native proof and binds reuse to source/verifier hashes and
exact sample inventories. A skipped runtime is not a pass.

Blender LINEAR scalar quaternion curves normalize component interpolation;
glTF LINEAR quaternion tracks use SLERP in Three.js. At intermediate samples the
same saved keys differed by up to 191.39 micrometres at a bone position. This was
an inherited animation-evaluation difference, not justification to change the
30 micrometre transport tolerance. Preserve native-action fit and actual-runtime
pose fit separately, and compare exported skinning under equivalent poses.

For a new model browser proof, use
`node tools/avatar/verify_model_studies.mjs --asset=<registered-id>`. It discovers
registered studies instead of maintaining a hard-coded list, rejects duplicates
and follows explicit repair/history metadata. Scope reports to the changed study
and retain proof for unchanged source bytes.

User feedback on 2026-10-05: **make the female T02 hood fuller and more
recognizable in the next visual pass**. The current shallow hood remains a
technical baseline, not accepted art. Keep the reviewed body/head/hair fixed;
shape a fuller lower bowl/opening using the controlled surface helper and rerun
all affected fit/detail/native/runtime gates. Do not restore the rejected folded
projection or trade exposed anatomy for clearance.


### First outfit technical result

Fresh final model runner passed **15/15 gates**. Both the saved native actions
and actual glTF pose profiles have 163 samples for each independent piece and
the combined outfit, plus 164 samples for each detail role. Strict body/head/
hair/layer/pocket/hood/closure contacts are zero; B01's intentional embedded seam
is reported separately (940 native / 939 runtime pairs). Six head gestures,
removed-face openings and both fictional-face UV/image exports pass. Sixteen
equivalent source/export/Three.js poses have a combined 2.009 micrometre bound
under the unchanged 30 micrometre threshold; all 12 GLBs/material checks pass.

The final report captures 49 catalog Python helpers and 62 dependencies, checking
unchanged helper bytes at completion. Reuse requires that exact current inventory.
The final sweep was **fresh**, not a reused interim result. Reports:
`assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01/`; aggregate runner:
`artifacts/verification/avatar-catalog/female-outfit-T02-B01-F01/runner-report.json`.

Fresh `npm run verify:edit -- --force` selected integration and passed zero-error
lint (known ContentContext warning), 161 unit tests, all pure verifiers, audio
inventory, 472 browser tests, production build and bundle boundaries. Report:
`artifacts/verification/2026-10-05T04-58-55-291Z-integration.json`. This is not a
release profile or deployment; the technical study does not accept the shallow
hood, implement a real selfie endpoint or promote canonical assets.


Final browser refresh on the final candidate bytes passed two scoped study cases
(desktop/phone), four production-candidate cases (rest/walk/run/phone run), and
both live-gallery cases with 102 current assets. Candidate GET hashes match
`outfit.glb` bfb4e2f83310b8aac574b89d59d50d047d280ef4890189db3d322e9c2c1f6002;
the production fixture independently binds `body.glb` and `garments.glb` hashes.
No unexpected console errors or failed requests were reported. Review copies
were inspected at 320px width. Reports: `artifacts/verification/avatar-catalog/
model-studies/female-outfit-T02-B01-F01-study/report.json`,
`female-outfits/T02-B01-F01/browser/browser-report.json`, and
`gallery/report.json` beneath the same avatar-catalog report root. The production
fixture replaces the body and a combined garment slot for rendering proof;
per-piece female production slot mapping remains open. The first refresh attempt
found stopped local servers; both were restarted before these fresh passing runs.


## Legacy cleanup verification — 2026-10-05

The pre-catalog male assets and modular/customization/home UI are removed. The
live gallery retains 95 current assets / 41 model previews; catalog construction
sources, references and fitting history are preserved. See the completed
[cleanup plan](superpowers/plans/2026-10-05-retire-legacy-avatar.md) for exact
verification scope and report paths. Final lint, 162 unit tests and pure contracts
pass; integration's 472 browser tests and production boundaries pass. The migrated
inspector also passes behavioral and transport checks across 27 desktop/four phone
models, and the isolated production fixture passes all four candidate cases.
