# Live avatar asset gallery implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or
> superpowers:executing-plans to implement the tasks below. The user pre-approved
> recommendations and requested immediate implementation; no execution-choice
> or written-spec approval pause is needed.

**Goal:** Provide a live local avatar gallery with references, 3D inspection,
accurate milestones and source links for continuing work in Claude or Codex.

**Architecture:** Keep the existing preview inventory and explicit model route.
Add a server-only library adapter and allowlisted file/thumbnail endpoints.
Use a renderer-free manifest contract and separate gallery/filter/refresh/model
inspection units; the main gallery never loads a model canvas.

**Tech Stack:** React 19, TypeScript, Vite dev middleware, Node filesystem,
existing sharp, Vitest and Playwright. No new dependency or external service.

## File responsibilities

- `src/avatar/catalogLibrary.ts`: shared data contract and filtering behavior.
- `tools/avatar/catalogLibraryServer.ts`: discover and normalize library files.
- `tools/avatar/catalogPreviewServer.ts`: preserve existing inventory and add
  allowlisted library/file/thumbnail HTTP endpoints.
- `src/avatar/useCatalogLibrary.ts`: cancellable inventory refresh and recovery.
- `src/avatar/AvatarAssetGallery.tsx`: card grid, URL filters and detail routing.
- `src/avatar/AvatarAssetInspector.tsx`: references, prompts, metadata and sources.
- `src/avatar/CatalogModelInspector.tsx`: shared model controls and lazy renderer.
- `src/avatar/AvatarCatalogPreview.tsx`: legacy model selector and shared inspector.
- `src/avatar/AvatarPreviewScreen.tsx`: dev gallery entry with legacy exceptions.
- `tools/avatar/verify_asset_gallery.mjs`: focused development browser contracts.
- `docs/avatar-catalog-preview.md`, `docs/avatar-workflow.md`, `ROADMAP.md`:
  operational handoff and completion evidence.

## Task 1: Contract, inventory and safe transport

- [x] Add the renderer-free contract: `CatalogLibraryAsset` has `id`, `label`,
  `category`, `base`, `status`, `statusDetail`, `fitVerified`, `accepted`, `history`,
  `references`, `sources`, optional `previewUrl`, `model` and `supportsGait`.
  `CatalogLibraryManifest` has `version`, `generatedAt`, `assets`, `animations`.
- [x] Write behavioral server tests with temporary repositories. Use these
  concrete assertions for discovery and transport:

  ```ts
  const manifest = buildCatalogLibraryManifest(root);
  expect(manifest.assets.find(a => a.id === 'A02')?.status).toBe('pending');
  expect(manifest.assets.find(a => a.id === 'T02')?.references.length).toBeGreaterThan(0);
  expect(resolveCatalogLibraryFile(root, '/__avatar_catalog/files/.env')).toBeNull();
  const before = manifest.version;
  file('assets/avatar/concepts/new-reference.png');
  expect(buildCatalogLibraryManifest(root).version).not.toBe(before);
  ```
- [x] Run `npm run test:unit -- tools/avatar/catalogLibraryServer.test.ts` and
  observe failure before implementing the adapter.
- [x] Implement recursive discovery with directory-entry checks, stable relative
  IDs, tolerant missing optional metadata and explicit malformed-required-data
  errors. Use actual progress accepted/fit lists; repair metadata takes priority.
  Read male boards and female outputs/sheets; attach references by ID metadata.
  Keep current models distinct from discovered historical exports.
- [x] Include existing neighbor sources/proof and build scripts. Export
  `buildCatalogLibraryManifest(root)` and `resolveCatalogLibraryFile(root, url)`.
  Resolve only URLs present in the inventory, then realpath-check the approved
  asset/tools roots and reject escaping symlinks. Never expose arbitrary files.
- [x] Add `/__avatar_catalog/library.json`, `/__avatar_catalog/files/...` and
  `/__avatar_catalog/thumbs/...` to the dev-only plugin. Reuse GET/HEAD/range
  semantics, use typed MIME mapping, in-memory 320px thumbnail generation and
  bounded modification-keyed cache. Preserve old endpoint tests.
- [x] Run both server test files and confirm fresh passes.

## Task 2: Filtering, refresh and gallery UI

- [x] Write filter tests first for search paths, intersecting filters, history
  hidden by default, 2D/3D availability, male/female/shared distinctions and
  acceptance separate from fit verification. Run them to observe failure.
- [x] Implement `filterCatalogAssets(assets, filters)` as a pure function. Match
  search against ID/label/source paths/reference labels; compose all filters.
- [x] Fetch the library through `useCatalogLibrary`, polling every five seconds
  when visible. Keep the previous manifest on failed refresh and expose retry;
  compare revisions, cancel on unmount and avoid overlapping requests.
- [x] Implement responsive gallery cards using real thumbnails, clear type and
  status badges, labeled shared `Field` controls and shared `Button` actions.
  Store `q`, `category`, `base`, `format`, `status`, `history` and selected `asset`
  in URL parameters. Preserve unrelated parameters; clear only owned filters.
- [x] Implement the asset inspector with original-reference links, selectable
  reference sheets, expandable prompts, explicit missing-model milestones,
  real source links and status facts. Keep reference-only views WebGL-free.
- [x] Extract `CatalogModelInspector` from the existing preview without changing
  tested legacy selectors/controls. Gallery details mount it only for a model;
  heads and unrelated exports disable incompatible gait controls.
- [x] Update route selection:

  ```tsx
  if (import.meta.env.DEV && params.get('agent') !== '1' && params.get('view') !== 'modular') {
    return params.has('model') ? <AvatarCatalogPreview /> : <AvatarAssetGallery />;
  }
  return <AvatarModularPreviewScreen />;
  ```
- [x] Run unit tests and `npm run lint`; resolve errors before browser checks.

## Task 3: Browser contracts, handoff and delivery

- [x] Write a verifier using existing Playwright/SwiftShader configuration. At
  1280×900 and 390×844 verify labeled filters, populated images, no gallery
  canvases, female reference-only detail, sources/prompts and return navigation.
  Open T02 or the current H01 study and require `catalog-ready`, a nonzero canvas,
  functioning gait/view controls and preserved legacy `?model` routes.
- [x] Add a temporary reference in a dedicated disposable concept directory,
  await automatic appearance without navigation/reload, remove it in `finally`
  and verify disappearance. Intercept one inventory failure and require the
  last good cards plus stale/retry feedback, then restore and require recovery.
- [x] Capture originals and 320px review copies with build identity, scene,
  viewport, checked time, errors and failed requests in the verification report.
  Run `node tools/avatar/verify_asset_gallery.mjs` against the worktree dev URL.
- [x] Run `npm run verify:edit -- --force`; because routing is touched this must
  include integration. Run the dedicated existing inspector verifier if shared
  controls changed. Check fresh results rather than relying on earlier proof.
- [x] Document gallery URLs, refresh behavior, supported manifest schemas,
  pending milestones, safe source links and Claude asset-registration guidance.
  Update ROADMAP task and decision row. Run `git diff --check` and review against
  every spec requirement. Commit with `feat: add live avatar asset gallery` and
  a body explaining the need for consistent references and inspectable progress.
  No PR, push or deployment is requested.

## Completion evidence

Implemented the approved gallery with 97 current assets, 43 model previews and
72 historical records at this handoff. Female reference designs retain separate
pending model milestones; no existing piece has been marked visually accepted.

- Fresh `npm run verify:edit -- --force` selected **integration** and passed:
  lint (zero errors, the known ContentContext warning), 112 unit tests, pure
  verifiers, development audio inventory, 472 browser checks, test/production
  builds and the production bundle guard. Report:
  `artifacts/verification/2026-10-04T19-38-54-776Z-integration.json`.
- Fresh `npm run avatar:catalog:inspect` passed the original model selector,
  representative desktop/phone models, full controls and modular workbench.
- Fresh `npm run avatar:gallery:inspect` passed at 1280×900 and 390×844. The
  desktop run additionally proved automatic additions/removal, retained cards
  after a 503/retry, and unchanged paused model pixels after inventory refresh.
  Report and 320px review copies: `artifacts/verification/avatar-catalog/gallery/`.
- Regenerated the development UI inventory to 109 entries after adding components.
  Independent review led to per-file animation revisions, explicit historical
  outfits, thumbnail conversion deduplication and rapid URL-filter fixes.
- The final gallery verifier cleanup waits for its temporary image load and the
  inventory removal poll; it no longer deletes files while its browser needs them.
  The verifier also includes the reproduced PUSH/POP race: opening a card and
  immediately going Back must restore both the URL and visible gallery. The UI
  cancels pending optimistic selection on native history events. Integration
  was rerun after that final navigation correction.

No release verification, deployment, push or pull request was performed. Known
pending recordings are still allowed by the development audio check.

The final adapter wording correction derives “discovered” versus “historical”
from the actual history flag. Its regression failed before the fix and passed
afterward; the complete unit, lint/pure and dedicated gallery checks were run
fresh after this server-only correction.
