# Curated avatar catalog implementation plan

**Goal:** Let the user compare each avatar design with its current 3D versions and understand the next visual review action.

**Approved direction:** One entry per design, focused references, per-base revisions, independent art/technical status, motion briefs and playback, and an archive behind the catalog. Crop grouped sheets first; retain originals and provenance. Use the existing development-only viewer. User approved implementation on 2026-10-05.

**Architecture:** Preserve the raw local inventory and legacy deep links. Add an explicit `assets/avatar/catalog/catalog.json` index whose item records join focused references and existing source assets. Hydrate that index server-side into `CatalogItem` records; let the gallery browse designs and the inspector select a base/revision. Native models and source-bound historical reports are not relocated.

**Tech stack:** React/TypeScript, Vite local inventory endpoints, Sharp deterministic crops, Vitest, Playwright.

## Shared contracts

`CatalogItem` contains `id`, `label`, `collection`, `category`, `description`, `references`, `variants`, `relatedIds`, and an optional `motion` brief. Collections are `characters`, `wardrobe`, `faces-hair`, and `animations`.

Each variant has `id`, `label`, `base`, `references`, `revisions`, and optional `currentRevisionId`. Each revision has `id`, `label`, a hydrated raw `asset`, `visualReview` (`pending`, `changes-requested`, `approved`), `technicalReview` (`not-verified`, `recorded-pass`, `repair-needed`), and optional `reviewNote`/`technicalNote`. Recorded checks are evidence labels, not fresh model acceptance.

Focused references retain their original sheet path/URL and crop rectangle. Original sheets stay unchanged. Item JSON records explicitly identify references and raw asset IDs; missing models stay reference-only. Do not infer approval from filenames or successful rendering.

## Tasks

- [x] Add typed item/variant/revision contracts and behavioral tests for selection, filtering, per-base missing models, and art-versus-fit status. Run focused Vitest tests red, implement pure selectors, then rerun green.
- [x] Add the explicit catalog index and reproducible crop script. Register 20 wardrobe items, six head/hair designs, six expression targets, six reference outfits, the distinct female T02/B01/F01 capsule, two characters and two motions. Retain original prompt/source/crop provenance. Link existing male/female candidates, current painted faces and repair studies to the correct design. Exact reference outfits remain pending unless a corresponding model exists; never label the female capsule O02.
- [x] Hydrate curated items alongside raw inventory; validate IDs/paths/crop provenance and current revision references. Extend file/thumbnail allowlists to curated references, metadata and revision sources. Keep loopback/realpath/content-type checks and version refresh. Test malformed indexes, missing assets, file access and crop transport with Vitest.
- [x] Replace the default file grid with logical design collections and focused thumbnails. Preserve URL filters and Back behavior. Offer the raw inventory under Archive, including live discoveries and existing history filters.
- [x] Add per-base/current-revision selection, concise art/check facts, focused reference/model comparison, linked parts, expandable source groups and older revisions. Keep legacy asset/model links working. Add motion briefs and start the corresponding clip on a compatible character using the existing lazy renderer.
- [x] Update focused browser verification to cover curated card counts, female T02 discovery, missing female fits, crops/original transport, revision selection, animation playback, archive/history, deep links, live discovery and refresh recovery on desktop and phone. Retain 320px reviews and error/identity evidence.
- [x] Update workflow/gallery docs, ROADMAP and Decisions Log. Review specification coverage and code quality. Run focused unit checks, lint, gallery/browser inspection, and fresh `verify:edit -- --force`; state its actual selected profile and result. Open the completed gallery in Codex.

## Verification boundaries

No model geometry or animation bytes change, so fitting sweeps are not rerun or claimed fresh. Product integration and asset acceptance remain pending. The catalog displays recorded technical evidence separately from visual review. No paid generation, worktree creation, deployment, PR or model promotion is part of this change.

## Completed verification (2026-10-05)

- Focused catalog selection/index/server tests: 35 passed; TypeScript check passed.
- Crop provenance/extraction check: all 66 focused crops passed.
- Desktop and phone gallery verification passed, including older/current revision labels, motion playback, original-sheet links, Archive, live refresh and legacy links. Model inspection and full source transport also passed at both sizes; no unexpected console errors or failed requests. Reviewed only the 320px screenshot copies.
- Fresh `npm run verify:edit -- --force` selected **integration** and passed: lint (zero errors, one known ContentContext warning), all 191 unit tests, pure verifiers, audio inventory, test build, 474 browser tests, production build and bundle boundaries. Report: `artifacts/verification/2026-10-05T10-15-36-898Z-integration.json`. The earlier run failed solely on stale generated component inventory; it was regenerated before this fresh pass.
- Specification and code-quality reviews approved. Requested the completed gallery tab in Codex; loopback dev server remains on port 3004. No geometry/fitting verification or asset acceptance is claimed by these UI checks.
