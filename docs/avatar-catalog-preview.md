# Live avatar gallery and model inspection

Run `npm run dev` in the avatar worktree and open `/avatar-preview`. The default
development page is a read-only gallery of actual 2D references, current 3D
models, unbuilt concepts, outfits, studies and runtime assets. Search includes
IDs, labels and source paths. Category, representation, base, status and history
filters are stored in the URL; opening and returning from an asset preserves
them. Older attempts are available through **Include history**.

Opening an asset displays its reference sheets, available prompts and source
links. Model assets also mount one interactive 3D inspector; the gallery grid
does not create WebGL canvases. Reference-only assets explain that 3D is pending.
Fit verification and visual acceptance are separate facts; the current accepted
ID list is empty. Female references do not establish female 3D completion.

## Existing inspection links

Explicit model links retain the original model selector and controls:

- `/avatar-preview?model=study-h01-reference-a`: revised head on the study outfit.
- `/avatar-preview?model=head-style-reference-a`: head-only style study.
- `/avatar-preview?model=study-f04`: isolated orange-boot/trouser/sweatshirt study.
- `/avatar-preview?view=modular`: original runtime workbench.
- `/avatar-preview?agent=1`: original verification route.

Catalog-compatible models support Rest/Walk/Run, Pause/Resume, pose scrubbing,
front/side/back/three-quarter views, camera reset and skeleton inspection. Drag
to rotate and scroll/pinch to zoom. Unrelated standalone exports and head-only
assets do not use the shared gait clips. This tooling does not save or replace
the user's app avatar configuration.

## Inventory, refresh and source access

The Vite-only library endpoint `/__avatar_catalog/library.json` reads reference
manifests/images, progress metadata and authored/exported assets. See the
[shared workflow](avatar-workflow.md) before registering a new asset. New images
and exports are discovered automatically. The browser refreshes inventory every
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

Production builds do not expose the dev gallery or these endpoints. The renderer
still loads through `AvatarPresenter`; three.js stays in its lazy scene chunk.

## Verification

Run `npm run avatar:gallery:inspect` against the worktree dev server; override
its default port 3004 with `CATALOG_PREVIEW_URL`. The development verifier covers
desktop and phone browsing, reference-only inspection, model controls, deep links,
live additions/removal and recovery after a failed refresh. Its original captures,
320px review copies and identity/error report are under
`artifacts/verification/avatar-catalog/gallery/`.

Run `npm run avatar:catalog:inspect` to exercise the existing model selector and
full controls across representative models on desktop and phone. Reports are
under `artifacts/verification/avatar-catalog/inspection-page/`. Set
`CATALOG_INSPECTION_DEFAULT_MODEL=study-h01-reference-a` to use that study for
the initial animation checks. The reference/original/revised style audit remains
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
