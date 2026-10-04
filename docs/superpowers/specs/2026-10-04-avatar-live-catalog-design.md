# Live avatar asset gallery

The user selected gallery layout A and explicitly pre-approved the recommended
design, planning and implementation on 2026-10-04. Continue without additional
design or execution approval questions.

## Outcome and scope

Turn the default development `/avatar-preview` into a local, read-only visual
catalog. Cover approved 2D references, female references, current catalog models,
unbuilt wardrobe/head concepts, fitting studies, outfits, runtime assets and
historical attempts. No backend, paid generation, uploads, review comments or
approval writes are part of this change. The selfie product contract remains a
generated 2D texture applied to a reusable UV head; this gallery does not
implement that pipeline.

## Browsing and inspection

Use a responsive card grid with labeled search and filters for category,
representation, character base and status. Show current work by default; an
explicit history control exposes drafts and earlier exports. Search includes
names, stable IDs and source paths. Preserve search/filter parameters in the URL.
Display the actual matching result count and an actionable empty state.

Opening a card navigates to an asset inspector within the gallery, preserving
the gallery parameters for return navigation. The inspector displays available
2D sheets next to one interactive 3D preview. Reference-only assets display a
clear unavailable/pending model milestone. References can be opened at original
resolution and available generation prompts are expandable. Only render one
WebGL canvas for the opened model, never canvases in gallery cards.

Reuse the model preview's Rest/Walk/Run, pause, scrub, view presets, reset and
skeleton controls for compatible catalog models. Disable gait controls for
heads and unrelated standalone/runtime exports. Maintain the existing explicit
`?model=...`, `?view=modular` and `?agent=1` inspection routes unchanged.

Sources include existing GLBs, native Blender files, build scripts, progress,
retrospectives and available verification reports. Link only real inventoried
files. Do not invent proof for missing reports or label a fit-verified candidate
as visually accepted. Show fit verification and acceptance as separate facts.
Female assets must not imply that a fitted female 3D catalog already exists.

## Inventory and boundaries

A server-only inventory adapter reads `catalog-progress.json`, recursive concept
image manifests/images, current preview models, catalog source files and public
avatar GLBs. Recognize both `boards` and female `sheets`/`outputs` manifests.
Associate reference sheets with existing wardrobe IDs using their descriptive
metadata; show sheets as first-class references as well. Discover new images and
GLBs automatically. Current pieces retain stable IDs; file-derived records use
stable relative-path IDs. Explicit revisions, rejected exports, diagnostic variants and concept drafts are
history. Newly discovered canonical exports outside revision paths appear as
candidates; runtime assets remain separately identifiable.

A shared, renderer-free typed manifest contains gallery assets, references,
source links, optional preview model entries and a content revision. Separate
inventory construction, safe file serving, gallery filtering, refresh state and
React inspection components. Retain the existing model inventory endpoint for
compatibility. A new `/__avatar_catalog/library.json` endpoint supplies the
gallery. Production builds expose neither library endpoints nor development
gallery UI and retain the existing lazy three.js boundary.

New library, source and thumbnail endpoints accept only loopback clients with a
local Host header; the dev server also serves the app on the local network.
Only GET/HEAD may read explicit inventoried files. Reject traversal, unknown
paths, secrets and symlinks escaping approved avatar/source roots. Existing
legacy source-denial behavior stays intact; new source URLs have their own
allowlist. Correct MIME types and range handling must support GLB availability
probes. Serve resized 320px image thumbnails, generated in memory with bounded
caching keyed by file modification, while original references remain available.

## Live updates and failures

Poll the inventory every five seconds while the page is visible and refresh on
return to the page. Compare content revisions and retain the last good inventory
on transient failures, with a visible stale/retry state. Adding/exporting a file
must update the gallery without a full-page reload. Inventory updates preserve
selection, filters and viewer controls unless the selected model itself changes.
Show a clear missing-selection state if an open asset is removed.

Initial server/metadata failures show a recoverable error with retry. Missing
optional images, sources and proof degrade to explicit unavailable information.
Image load failures use a placeholder rather than a broken-image icon. Keep
keyboard navigation, labeled controls, visible focus and mobile layouts usable.

## Verification and delivery

Behavioral Vitest tests cover inventory discovery, reference association,
pending/female milestones, history, source allowlisting, traversal/symlink denial,
revision changes and filtering. A dedicated development Playwright verifier
covers desktop and phone gallery navigation, direct links, reference-only and
3D inspection, controls, live additions, refresh failure recovery and no page
errors/horizontal overflow. Inspect only review screenshots at most 320px wide.
Run the affected verification profile; routing changes require integration.
Check production exclusion and lazy renderer boundaries. Document how Claude
adds assets and metadata; update ROADMAP and commit only verified changes.
