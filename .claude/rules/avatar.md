---
paths:
  - "src/avatar/**/*.{ts,tsx}"
  - "public/avatar/**"
  - "tools/avatar/**"
  - "tools/blender/**"
  - "assets/avatar/**"
---

# Avatar

`/avatar-preview` is a development-only live asset gallery. Catalog models,
references, native sources and fitting history live under `assets/avatar/`.
The old modular workbench, parent customization UI, home overlay and pre-catalog
male exports are retired. Future product integration needs accepted catalog assets.

## Bundle boundary

Keep three.js, React Three Fiber and drei under `src/avatar/`. Route renderer
work through lazy `AvatarPresenter` so these dependencies stay outside the main
bundle. Never statically import `AvatarScene`, `AvatarModel`,
`AvatarSkeletonOverlay` or `skinnedGarment` from outside this directory. Check
`npm run build` after renderer changes: the dependencies belong in the lazy scene
chunk. `AvatarRuntimeBoundary` hides a failed renderer load.

The scene chunk and avatar GLBs remain excluded from Workbox precache; preserve
that boundary when integrating accepted models later.

## Current asset workflow

For catalog models, Blender tooling or selfie personalization, start with
`docs/avatar-workflow.md` and the shared Blender skill. Selfies become generated
2D face textures on a reusable UV-mapped head; fictional head studies are style
references. Retain catalog construction sources, shared rig/gaits and rejected
fitting attempts until their dependent proof and acceptance are resolved.

`/avatar-preview?agent=1` is a tool-only rendering harness behind
`VITE_AVATAR_POC_ENABLED`. Browser verifiers intercept its four
`/__avatar_fixture/{body,garments,walk,run}.glb` requests with candidate bytes;
no public models are shipped. This proves candidate rendering, while per-piece
production slot integration remains open. Verify renderer changes on desktop
and mobile with the existing fixture tooling; use the gallery for visual review.

`docs/avatar-clothing-pipeline.md` and `docs/3d-avatar-knowledge-base.md` retain
historical generation/cleanup context. Their old runtime paths and modular UI
instructions describe retired experiments; current execution follows the shared
handoff and `tools/blender/catalog/README.md`.
