# Repository cleanup implementation plan

> **For agentic workers:** Use the approved cleanup audit and this plan for bounded implementation. Preserve unrelated work, use the primary checkout, and leave changes uncommitted for review.

**Goal:** Complete the approved repository cleanup, including moving avatar evidence into a verified archive stored only on this MacBook.

**Architecture:** Runtime application assets remain in `src/` and the published bear manifest. Historical authoring data moves outside the checkout; exact, ignored local links preserve legacy logical paths, while a small tracked archive contract validates those links. An immutable verified snapshot is separate from the writable archived authoring tree. No archive upload, history rewrite, worktree, deployment, or commit is part of this change.

**Tech stack:** Existing React/TypeScript, Node filesystem tools, Python/ffmpeg helpers, Vitest, Playwright, local filesystem storage.

## Ownership and order

- Root: local archive/CLI, physical migration, audio-splitting consolidation, editor/dependency cleanup, active guidance, integration and final review.
- Source worker: unused source removal, shared praise selection, accessibility helpers and their focused checks.
- Documentation worker: historical-doc organization, current roadmap/release instructions, documentation index and links.
- Asset worker: approved-root traversal, gallery/fixture/store guards, compressed proof readers and focused checks.
- All workers leave commits/pushes and broad verification to root; source workers own disjoint files.

## 1. Preserve the pre-cleanup state

- [x] Record HEAD, tracked files, original logical paths, byte sizes, SHA-256 values, and symlink destinations.
- [x] Create `~/Archives/Mudrolino/repository-cleanup-2026-11-11` only after checking free space.
- [x] Preserve exact pre-cleanup tracked source from `git archive HEAD`, the uncommitted audit, and local avatar/Meshy/verification data in an independent snapshot.
- [x] Verify every archived file and relative symlink before removing or relocating originals; record archive identity and a completed verification receipt.
- [x] Preserve secrets outside the archive: exclude `.env*`, credentials, `.git`, dependencies and local agent settings.

## 2. Local archive contract and tested access

- [x] Add `tools/avatar/localArchive.mjs` and meaningful `localArchive.test.ts` fixture tests before implementation.
- [x] Expose `resolveAuthoringRoot(repo, relativeRoot, {required})`: accept ordinary in-repo roots or exact approved archive roots; reject retargeted, broken, nested-escape and lookalike links.
- [x] Add `assets/avatar/local-archive.json` with schema, archive identity, original HEAD and the three authoring roots; no machine-specific absolute path in tracked metadata.
- [x] Default storage is `~/Archives/Mudrolino/<archiveId>`; `MUDROLINO_ARCHIVE_ROOT` may explicitly override it.
- [x] Add explicit link/verify commands that refuse collisions and fail actionably when the local archive is absent. Verify tests cover identity, paths, file hashes and collision preservation.
- [x] Adapt catalog server, preview fixture and 3D manifest traversal to approved roots. Missing archives must not silently produce an empty asset manifest.
- [x] Move repository-dependent catalog acceptance assertions to an explicit archive verification gate; keep normal unit coverage synthetic and portable.

## 3. Archive physical authoring evidence

- [x] Move `assets/avatar/catalog-a`, `catalog` and `concepts` into the writable archive tree after the independent snapshot verifies.
- [x] Replace those authoring directories with ignored, validated local links; remove tracked evidence paths while retaining `asset-manifest.json`, the archive contract and production assets.
- [x] Preserve all snapshot builders, report bytes, reference provenance, unresolved studies and 3D sources. Do not substitute current code into archived source bundles.
- [x] Unify current JSON/gzip proof access with tests for identical decoded bytes/digests. Keep legacy expansions available on demand for historical direct-path scripts; preserve immutable originals.
- [x] Archive ignored historical verification/screenshots, Meshy downloads/provenance and redundant Blender backups. Retain current fresh verification in the checkout.
- [x] Archive retired modular scripts/launcher together with original tool sources; remove their obsolete active entry points and update references.

## 4. Source, dependency and helper cleanup

- [x] Delete the three unused overlays and declaration-only APIs listed in the audit; retain live audio helpers, types, migrations and browser storage keys.
- [x] Regenerate `componentInventory.generated.ts` and check completeness.
- [x] Unify eight praise selectors, preserving one random draw and each game's answer-lock/order semantics. Add focused behavioral coverage for default and selected praise.
- [x] Centralize generic accessibility adapters/filter/settle helpers, retaining type conversion and suite-specific policies.
- [x] Extract the duplicated ffmpeg splitting implementation; preserve both command entry points and their distinct thresholds/padding/session behavior. Add behavioral segment and command-construction tests before refactoring.
- [x] Remove the unused direct `autoprefixer` dependency through npm; preserve pinned browser tooling and update only the live lockfile.
- [x] Delete Cursor support/completed ledger, simplify the redundant root-only node_modules ignore rule, and correct the obsolete AI Studio comment while preserving `DISABLE_HMR`.

## 5. Documentation and guidance

- [x] Preserve the full previous roadmap and superseded PRDs/manuals/backlog as explicitly historical documents; keep links or redirects valid.
- [x] Replace obsolete deployment/force-push instructions with the current release procedure and genuinely pending manual checks.
- [x] Keep the current roadmap short, record cleanup decisions and completion, and remove already-completed timer extraction from pending work.
- [x] Remove the identical audit copy, repair citations, and add a current/history documentation map.
- [x] Document local-only archive setup/recovery, immutable versus writable data, missing-archive behavior and limitations for another machine.
- [x] Update AGENTS/area guidance and the cleanup audit with actual outcomes; retain shared Claude/Codex skills and useful historical acceptance evidence.

## 6. Verification and acceptance

- [x] Run targeted archive/path/security, source helper, audio Python and gallery-inventory checks while implementing; inspect every result.
- [x] Validate edited documentation links, archive inventory hashes, symlink destinations, tracked-tree reduction and absence of unintended source/data removals.
- [x] Run `npm run verify:edit` with the full changed-code scope and `npm run verify:integration` for shared source/audio/tool/build changes. Matching browsers are already installed.
- [x] Run explicit local archive verification, catalog access, source replay contracts and production bundle/offline checks as needed by the affected interfaces.
- [x] Keep strict audio recording inventory status truthful; this cleanup creates no recording or release exception and does not deploy.
- [x] Obtain independent spec/quality review, correct findings, and report measured results, remaining limitations and archive location.
