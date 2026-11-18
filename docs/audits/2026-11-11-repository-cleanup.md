# Repository cleanup outcome

Completed 2026-11-11 on `feature/repository-cleanup-audit` (based on `61211c3884fff259e28a70f75d5a03c1ba23b496`) and merged into `main` on 2026-11-18.

The user approved the complete audit and requested that avatar evidence be archived **only locally on this MacBook**. The original audit is preserved byte-for-byte in the immutable local snapshot at `snapshot/docs/audits/2026-11-11-repository-cleanup.md` (SHA-256 `f42ae8abb4abb7b7911b4be52c64ee6441ab7b0331d9e8c561a2ccbb2b253278`). This file records the implemented outcome.

## Measured reduction

| Measure | Before | Tracked tree after this change |
| --- | ---: | ---: |
| Logical tracked content | 240.6 MB | About 10.8 MB |
| Avatar evidence files | 2,658 files / 229.84 MB | Outside the tracked tree, locally archived |
| Python files | 606 | 183 |
| Python content | 3.97 MB | About 1.30 MB |
| Current roadmap | About 144 KB | About 11 KB, with complete historical copy retained |

Identical historical snapshots were already deduplicated by Git, so checkout reductions are not advertised as equivalent clone-size savings. Git history has not been rewritten.

## Local preservation and recovery

Archive: `~/Archives/Mudrolino/repository-cleanup-2026-11-11`.

- Independent read-only snapshot: **14,231 entries**, **6,149,873,018 bytes** of file content, with file hashes and exact symlink text checked before relocation and rechecked afterward.
- Pre-cleanup tracked source: `repository-before-cleanup.tar`, **243,865,600 bytes**, SHA-256 `98b2685f276b1f070c37218acf100a74f3e8a9870385590313bc812671979f0c`.
- Writable originals are under `working/`; they are separate from the immutable snapshot.
- The tracked [archive contract](../../assets/avatar/local-archive.json) pins the snapshot inventory's digest and identity. Three ignored links preserve `assets/avatar/{catalog-a,catalog,concepts}` logical paths.
- Previous screenshots/verification/traces and Meshy downloads/lineage are retained locally. New verification writes fresh artifacts in the checkout.
- Four redundant writable `.blend1` autosaves (22,122,807 bytes) were removed only after matching their immutable originals. Historical JSON expansions, repeated source bundles and report aliases remain in the archive for exact direct-path replay; they no longer clutter Git or dirty status.
- No archive upload, paid generation, new 3D construction, or publication was performed. Existing R2 recovery remains limited to 3D formats; the published application uses its separate runtime assets.

See [local archive guidance](../local-archive.md) for verification, relinking, recovery and another-machine limitations. A fresh clone does not contain the private authoring evidence.

## Removed and consolidated

- Removed Cursor support, the redundant VS Code dev launcher, completed Superpowers progress ledger, unused Blender launcher and seven retired modular-avatar scripts. Their original source remains in the preserved source tar.
- Removed the three unused legacy overlay implementations and regenerated gallery metadata. Live audio helpers, game contracts and compatibility fixtures remain.
- Pruned the audited unused aliases, constants and APIs, including the uncalled praise method. Removed the unused direct `autoprefixer` dependency through npm and updated the lockfile.
- Unified eight praise selectors in [praise.ts](../../src/shared/praise.ts), preserving one random draw, selected entry identity, fallback and answer-lock placement.
- Centralized generic axe adapters, serious-impact filtering and overlay settling in [accessibility.ts](../../e2e/support/accessibility.ts), retaining the necessary Playwright type adapter and suite-specific policies.
- Shared ffmpeg mechanics in [audio_split_core.py](../../tools/audio/audio_split_core.py), retaining both original CLIs, thresholds, padding, timestamp formats, option order and recording/application flow.
- Added [JSON/gzip proof access](../../tools/avatar/proof_io.py) with original decompressed-byte hashing. The catalog serves gzip sources with the correct MIME type and preserves declared legacy source identities without modifying old reports.
- Adapted catalog discovery, preview/fixtures, local companion serving and asset collection to exact approved archive links. Missing data cannot silently overwrite the asset manifest with an empty inventory; nested escapes, retargeting and collisions remain rejected.
- Moved evidence-dependent acceptance tests into an explicit archive gate. Ordinary unit coverage uses synthetic fixtures; no missing-data skips are used to claim those archive contracts pass.

## Documentation and local housekeeping

The [documentation map](../README.md) separates current guidance and historical evidence. Original PRDs, backlog, avatar manuals, migration instructions and the full roadmap are retained under [history](../history/README.md), with redirects and repaired references. The current roadmap/release checklist no longer prescribes the obsolete force-push or repeats already-completed timer extraction. The duplicate development-efficiency audit was removed and its case-study citation repaired.

Active agent guidance explains archive setup and retains shared Claude/Codex skills. Old browser data keys, locale content, recordings, backup/migration contracts and accepted runtime manifests are unchanged. Retired historical exports are identified as historical paths; source links for removed scripts are pinned to their original Git revision.

Conservative `git gc --no-prune` packed loose objects while preserving unreachable history. Git's nine identified leftover temporary garbage files (4,198,915 bytes) were independently copied/verified under `working/git-temporary-garbage` before removal. Connectivity checking passed; `git count-objects` reports zero loose objects and zero garbage. The local Git directory is about 2.2 GB rather than 2.9 GB; historical objects remain packed, not erased.

## Fresh verification

| Check | Result |
| --- | --- |
| Final `verify:integration` | Passed all nine gates: lint, unit, pure, development audio inventory, test build/browser, development browser, production build and bundle guard. |
| Default unit suite | **678 tests / 88 files passed**. |
| Integration browser coverage | **581 passed**, zero skips, unexpected failures or flaky cases. |
| Actual development-server browser checks | **2 passed**. |
| Explicit local archive gate | **24 tests / 5 files passed** after final local housekeeping. |
| Portability with archive deliberately unavailable | **678 unit tests passed** and production build passed. |
| Production/offline checks with archive unavailable | **8 passed**. |
| Immutable snapshot/source tar verification | **14,231 snapshot entries** plus source tar verified. |
| Retained 3D inventory | Zero missing, changed or unlisted files/links. |
| Independent review | Spec/security/source review accepted after compressed-source and path-guard corrections. |

Final aggregate report: `artifacts/verification/2026-11-11T21-25-44-634Z-integration.json`; detailed local logs use the `artifacts/verification/cleanup-*` prefix. Earlier work included an interrupted archive run during repeated inventory parsing and a subsequent 5-second archive-test timeout. Those are not counted as passes. Inventory parsing is now cached with stat/contract invalidation; the separate large I/O gate has an explicit 30-second budget, while ordinary unit budgets are unchanged.

The known ContentContext fast-refresh warning remains. **240 recordings are still intentionally pending**: development inventory accepts only declared omissions; strict audio/release verification remains failing until the recordings are complete. This cleanup supplies no release exception and performs no deployment.
