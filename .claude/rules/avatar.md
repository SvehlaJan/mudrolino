---
paths:
  - "src/avatar/**/*.{ts,tsx}"
  - "public/avatar/**"
  - "tools/avatar/**"
---

# Avatar

An optional 3D companion behind `VITE_AVATAR_POC_ENABLED`, with `/avatar-preview`
as its workbench. Everything three.js lives under `src/avatar/`.

## Bundle boundary

`AvatarPresenter.tsx` lazy-loads `AvatarScene` via `React.lazy`, which is the
only thing keeping three.js, `@react-three/fiber`, and drei out of the main
bundle — it is the difference between a 452 kB and a 1,075 kB main chunk. Never
statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or
`skinnedGarment` from outside this directory; route new renderer work through
`AvatarPresenter` instead. After any change here, check `npm run build` output:
three.js belongs in `assets/AvatarScene-*.js`, never in `assets/index-*.js`.

A failed chunk load throws during render and is caught by
`AvatarRuntimeBoundary`, which hides the avatar. That is the intended
degradation — do not add a loading spinner or an error message in its place.

## Precache

The renderer chunk (`assets/AvatarScene-*.js`) and the GLBs (`avatar/**/*.glb`)
are both excluded from the workbox precache in `pwaConfig.ts`, because the
renderer cannot render offline without the models. Keep those two exclusions in
sync: precaching one without the other is wasted bytes.

## Assets

The app-facing base is `public/avatar/modular/male-base-plain.glb`, with walk and
run as separate GLBs — the base itself carries no animation clips, so `success`
and `failure` in `AvatarAnimationName` currently resolve to nothing. Garments
under `public/avatar/garments/` are skinned to the shared 24-bone armature and
rebound at runtime by `rebindGarmentToBaseSkeleton`.

Generation and cleanup pipelines are documented in `docs/avatar-clothing-pipeline.md`
and `docs/3d-avatar-knowledge-base.md`; the Blender and Meshy steps have their own
skills. Verify any runtime change in `/avatar-preview` on desktop and mobile.
