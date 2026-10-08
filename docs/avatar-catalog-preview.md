# Curated avatar catalog and model inspection

Run `npm run dev` in the primary checkout and open `/avatar-preview`. The
read-only development catalog contains **43 logical designs**: nine character/
outfit entries, 20 wardrobe designs, 12 head/hair/expression targets and two motions.
One card represents one design; male/female fits and model revisions live inside it.

Use **Characters & outfits**, **Wardrobe**, **Faces & hair** and **Animations**.
Search matches names, IDs and review notes. Collection, category, base,
representation and review filters are stored in the URL and survive Back.
Opening a card displays focused references beside one interactive 3D inspector.
Choose **Character version** and **Model revision** to inspect a fitted base or an
older attempt. Missing fits explicitly show **3D pending**; they do not borrow the
other base's model. Related design links preserve the selected character base.
The card grid creates no WebGL canvases.

Visual review and recorded technical evidence are separate facts. Technical notes
state the evidence scope; these are not fresh fitting runs. Current art approval,
full combinations, budgets and product catalog acceptance remain open.

The focused references retain the original sheet, crop rectangle, original/crop
SHA-256 and exact generation prompt. **Open source sheet** preserves full context.
Dedicated construction sheets remain additional references. Source links are
collapsed into construction, technical evidence, exports and historical files.
**Archive** exposes raw source inventory, with **Include history** for older
attempts; archive search also matches source paths. Source models and reports
stay at their original paths to preserve historical proof provenance.

The female **T02/B01/F01 capsule** is distinct from O02's T02/B02/F02 recipe.
O01 exposes an older matching cap-free assembly with an explicit unverified note;
other exact outfit recipes remain pending. H01 defaults to the painted-face head
study, with older heads as revisions. E01–E06 are reference-only expression targets.
T06's shared target is four buttons, selected by the user on 2026-10-06; the
original three-button category sheet remains historical. T04 includes a proposed
dedicated four-view construction guide with three detail views. New sources and
exact prompts are retained under `assets/avatar/concepts/2026-10-06/`.
See [construction targets](avatar-construction-targets.md) for every design and
its outstanding dependencies.

Motion entries describe the intended movement and start the corresponding clip
on the chosen compatible character. Pause and pose scrubbing remain available.

B04 exposes three isolated repair attempts in its male revision selector. B03
also exposes its side-only repair, which reveals additional body contacts. These
are garment-only, rest-only comparisons with links to their source-bound failed
own-shell reports. Their technical state remains repair-needed and their art
review remains pending. Selecting an attempt does not replace the preferred
canonical model or imply that it is ready for animation or product use.
B04's later bilateral attachment candidate is a separate rest-only revision
with recorded native/export checks passing and art review pending. Its technical
note retains the initial construction provenance qualification and distinguishes
the fresh derived preservation check from the original fitting/export runs.

## Curated index and focused references

`assets/avatar/catalog/catalog.json` is the explicit design index. Items contain
labels, collection/category, description, references, variants, revisions and
related IDs. Revisions link raw `assetId` values and declare independent visual
and technical review states. `currentRevisionId` identifies the preferred model
per base. Updating art review does not promote a model to the product catalog.

Reference records use repository-relative `path`, optional `sourcePath`, exact
`prompt`, `sourceSha256`, `crop` (`left`, `top`, `width`, `height`) and `cropSha256`.
Derived PNGs live under `assets/avatar/catalog/references/<item-id>/`; original
sheets remain under `assets/avatar/concepts/`.

```bash
node tools/avatar/crop_catalog_references.mjs --check
node tools/avatar/crop_catalog_references.mjs --write
```

Check verifies source/crop bytes and extraction. Write reproduces derived crops
without modifying the index or original images. It rejects changed hashes and
unsafe output paths. A deliberate new crop requires updated coordinates and
source/crop hashes together. Hydration rejects duplicate IDs, missing links,
invalid current revisions, changed images and out-of-bounds crop rectangles.

Use `?item=T02&variant=female` for the fitted hoodie, `?item=character-female`
for the whole character and `?item=walk` for motion. Existing `?asset=...` links
inspect their exact source entry, even when it shares an ID with a design.

## Existing inspection links

Older `?model=...` links resolve to the corresponding asset in the gallery:

- `/avatar-preview?model=study-h01-reference-a`: revised head on the study outfit.
- `/avatar-preview?model=head-style-reference-a`: head-only style study.
- `/avatar-preview?model=study-f04`: isolated orange-boot/trouser/sweatshirt study.
- `/avatar-preview?view=modular`: gallery; the modular workbench is retired.
- `/avatar-preview?agent=1`: tool-only candidate rendering harness.

Catalog-compatible models support Rest/Walk/Run, Pause/Resume, pose scrubbing,
front/side/back/three-quarter views, camera reset and skeleton inspection. Drag
to rotate and scroll/pinch to zoom. Inspection framing includes the normalized
model/garment bounds and their depth, with a visible margin in each view; reset
uses the same framing. Unrelated standalone exports and head-only
assets do not use the shared gait clips. The legacy parent customization UI and
home overlay have been removed; product avatar integration remains future work.

## Inventory, refresh and source access

The Vite-only library endpoint `/__avatar_catalog/library.json` reads the explicit
curated index alongside reference manifests/images, progress metadata and assets. See the
[shared workflow](avatar-workflow.md) before registering a new asset. New images
and exports are discovered automatically in Archive; curated designs require an
explicit index record. The browser refreshes inventory every
five seconds while visible and refreshes on return; a transient error retains
the last good library and offers retry. Model files are read locally rather than
copied to production assets. Build/artifact output remains ignored by the watcher.

The legacy `/__avatar_catalog/manifest.json` model endpoint remains compatible.
Its model URLs still reject native source files. New library source links have
their own explicit inventory allowlist, correct content types and realpath
checks. They expose only associated existing avatar assets, Blender sources,
builders and reports, never arbitrary repository files or secrets. New library/source/thumbnail
endpoints accept loopback clients and local Host headers only, keeping source
access on this MacBook despite the app server binding to the network. Only GET
and HEAD are supported. Card thumbnails are resized to 320px; original reference
images remain available from the asset inspector.

Production builds do not expose the dev gallery or these endpoints. The small
`?agent=1` renderer remains for source-bound browser proof when the avatar feature
flag is enabled. Verifiers intercept its four `/__avatar_fixture/*.glb` requests;
no public avatar models are shipped. The renderer still loads through
`AvatarPresenter`; three.js stays in its lazy scene chunk.

## Verification

Use a dedicated server for repeatable gallery verification. Vite queues a full
reload when source edits occur without a connected browser; delivering it on the
next connection can cancel initial module requests. Keep the verifier's strict
request checks and disable hot reload on the verification server:

```bash
DISABLE_HMR=true npm run dev -- --host 127.0.0.1 --port 3014 --strictPort
```

In a second terminal:

```bash
CATALOG_PREVIEW_URL=http://127.0.0.1:3014 npm run avatar:gallery:inspect
```

Stop that server afterward. Catalog inventory still refreshes through its own
polling, so live discovery/recovery remain exercised. The existing default port
is 3004; `CATALOG_PREVIEW_URL` selects the dedicated server. The development verifier covers
desktop/phone curated browsing, focused/original image access, missing fits,
female T02 current/older versions, animation playback, Archive/history, model
controls, legacy links, live discovery and failed-refresh recovery. Its original captures,
320px review copies and identity/error report are under
`artifacts/verification/avatar-catalog/gallery/`.

Run `npm run avatar:catalog:inspect` to exercise gallery asset links on desktop
and phone. It verifies Walk/Run motion, pause and scrubbing, camera presets,
skeleton visibility, zoom/reset and source transport across independent models
and representative outfits, including the current female capsule. Reports remain
under `artifacts/verification/avatar-catalog/inspection-page/`. The initial model
is `female-outfit-T02-B01-F01-study`; set
`CATALOG_INSPECTION_DEFAULT_MODEL=study-h01-reference-a` to use another current
gait-compatible study for the animation checks. The reference/original/revised style audit remains
in `docs/audits/2026-10-04-avatar-style-review.md`.

Chromium can mark Three.js streamed GLB reads `ERR_ABORTED` after consuming the
complete file. The existing inspector verifier retains the events, requires an
OK response and successful parsing for the exact model, and checks the full GLB
header/byte count independently. Other failures and unpaired cancellations fail.

## New model studies

Use `?asset=female-foundation-h02-study` for the female foundation with shared
gaits, `?asset=female-h02-head-study` for the UV face fixture, and
`?asset=female-h02-hair-study` for hair alone. `?asset=study-f02-independent-keys`
shows the bounded F02 repair in its representative outfit. All remain candidates;
F02 retains its repair-needed label for heel-tab own-shell contact.

`node tools/avatar/verify_model_studies.mjs` discovers every explicitly registered
`model_studies` entry and checks it on desktop and phone. Focus a newly changed
study with `--asset=<registered-id>` (repeat the option for multiple studies).
An empty inventory or unregistered ID fails before browser work. Reports and
320px reviews under `artifacts/verification/avatar-catalog/model-studies/` use
`all`, the selected ID, or a hash for a multi-study selection. It completes and hashes actual local model/gait HTTP GETs
before fulfilling the page request, then requires parsed models and moving gait
pixels. This avoids confusing Three.js streamed-loader cleanup with a failed
asset download. Reports retain both HTTP proof and page transport events.
