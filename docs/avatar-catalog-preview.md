# Inspecting the Blender catalog

Run `npm run dev` in the avatar-catalog worktree, then open `/avatar-preview`.
The development default inventories real authored models, independent pieces on
their matching covered body, complete outfits and the current orange-boot/navy-
trouser fitting study. Choose an entry, Rest/Walk/Run, Pause/Resume, a pose on the
slider, or a camera preset. Drag to rotate; scroll/pinch to zoom; reset the
camera or enable the skeleton overlay. Candidate and repair status remain visible.

The original modular workbench is `/avatar-preview?view=modular`; existing
`?agent=1` verification keeps its original behavior. This catalog view does not
save or replace the user's app avatar configuration.

Catalog models are served directly from `assets/avatar/catalog-a/` by the Vite
development-only plugin. Only inventoried GLBs are available; Blender source,
environment files, traversal and escaping symlinks are excluded. Generated
models are not copied to public production assets. Build/artifact output writes
are ignored by the development watcher so verification does not reload the viewer.

Skinned pieces bind to the shared rig for all categories. Complete outfits drive
their embedded corrective targets. Opt-in inspection controls preserve existing
renderer behavior outside the catalog. The lazy three.js chunk remains behind
AvatarPresenter. Mobile inspection uses full-body framing.

Verification command: `node tools/avatar/verify_catalog_inspection.mjs` against
the worktree dev server (default port 3004; set `CATALOG_PREVIEW_URL` to override).
Reports and 320px review copies are saved under
`artifacts/verification/avatar-catalog/inspection-page/`.

The separate first H01 face refinement is
`/avatar-preview?model=study-h01-reference-a`; its head-only view is
`?model=head-style-reference-a`. Both remain labeled studies. Set
`CATALOG_INSPECTION_DEFAULT_MODEL=study-h01-reference-a` when running the browser
verification command to exercise its Walk/Run and pose controls directly.
The reference/original/revised visual audit is recorded in
`docs/audits/2026-10-04-avatar-style-review.md`.

Chromium can mark Three.js streamed GLB reads `ERR_ABORTED` after receiving the
complete file. The browser check retains those events, requires an OK response
and successful GLTF parsing for that exact model, and independently checks the
full GLB byte count/header. Other request failures and unpaired cancellations fail.
