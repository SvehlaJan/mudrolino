# Local authoring archive

Avatar evidence and historical authoring data are stored **only on this MacBook**, as requested. They are no longer part of the current tracked tree. The production app still uses its published bear manifest and bundled still; core games do not require this archive.

## Location and contents

Default location: `~/Archives/Mudrolino/repository-cleanup-2026-11-11`.

| Path inside the archive | Purpose |
| --- | --- |
| `archive-manifest.json` | Verified inventory of original paths, sizes, SHA-256 values and symlink text. |
| `repository-before-cleanup.tar` | Exact tracked source at `61211c3884fff259e28a70f75d5a03c1ba23b496`, including retired scripts and original dependency metadata. |
| `snapshot/` | Independent, read-only preservation of avatar data, Meshy downloads/provenance, previous verification/screenshots/traces and the uncommitted cleanup audit. |
| `working/assets/avatar/` | Writable original authoring folders, kept separate from the preservation snapshot. |
| `working/meshy_output/` | Original Meshy downloads and task lineage. This checkout keeps an ignored local link for interrupted-task recovery. |
| `working/artifacts/` and `working/test-results/` | Previous local proof/captures/traces; new verification writes fresh artifacts into the checkout. |

The initial snapshot contains **14,231 entries**, approximately **6.15 GB of file content**, plus the **243.9 MB** source tar. Every copied file and symlink was verified against its original before relocation. The snapshot files are read-only. The committed contract pins the inventory's SHA-256; the mutable working tree is intentionally not treated as immutable proof.

No archive data was uploaded. Existing private R2 storage and its retained `asset-manifest.json` cover 3D formats only; they cannot restore these local-only images, JSON reports or source snapshots.

## Link and verify

From the checkout:

```bash
npm run archive:verify
npm run archive:link
npm run archive:test
```

`archive:verify` reads and hashes the complete immutable snapshot and source tar. It can take time. `archive:link` creates only the three exact authoring links declared by [`local-archive.json`](../assets/avatar/local-archive.json):

- `assets/avatar/catalog-a`
- `assets/avatar/catalog`
- `assets/avatar/concepts`

These ignored links point into the archive's `working/` tree. Existing data is never overwritten. Wrong identities, changed inventories, missing targets, retargeted links and escaped parent directories are rejected. Catalog serving still limits access to inventoried files under the exact approved roots; arbitrary external symlinks are not authorized.

For a deliberately relocated archive, set the parent directory explicitly:

```bash
export MUDROLINO_ARCHIVE_ROOT="/path/to/repository-cleanup-2026-11-11"
npm run archive:verify
npm run archive:link
```

This environment variable is for local Node tooling; it is not a `VITE_*` public build setting. An existing link pointing to the old location must be inspected and removed explicitly before relinking. The command refuses to replace it automatically.

## Another checkout or an unavailable archive

Normal unit tests use synthetic fixtures. Asset-specific acceptance tests live in the explicit `archive:test` gate; they fail with restoration instructions when authoring data is missing, rather than silently passing skipped checks. The gallery and 3D inventory tools likewise report missing archives. In particular, inventory generation refuses to replace the retained asset manifest with an empty result.

The archive is not recoverable from a fresh clone. Restore this local directory before authoring/catalog work. App development, production builds and the published companion are separate from those local authoring requirements.

## Historical recovery

Use a new empty directory to inspect/reconstruct the old tree. For example:

```bash
archive="$HOME/Archives/Mudrolino/repository-cleanup-2026-11-11"
restore="$(mktemp -d /tmp/mudrolino-before-cleanup.XXXXXX)"
tar -xf "$archive/repository-before-cleanup.tar" -C "$restore"
cp -R "$archive/snapshot/assets/avatar/." "$restore/assets/avatar/"
```

Previous ignored proof/capture directories and Meshy provenance are also available under `snapshot/`; copy only what the historical task requires. Historical reports retain their original tool hashes and paths. They establish historical proof scope, not fresh acceptance of today's changed tools. Never rewrite a signed historical report to claim it originally used the current implementation.

The JSON/gzip proof reader supports original decompressed bytes and digests. Expanded legacy reports remain preserved for direct-path historical scripts; they are no longer noisy untracked files in the checkout. Source snapshots and duplicate report aliases likewise remain inside the local archive, preserving exact replay inputs without cluttering the tracked repository.

Keep new model/report revisions in the writable working tree with their own provenance. Do not write authoring output into `snapshot/`, replace its inventory, or edit the archived original source to make a current check pass.
