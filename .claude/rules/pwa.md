---
paths:
  - "src/pwa/**/*.{ts,tsx}"
  - "vite.config.ts"
  - "index.html"
  - "tools/pwa/**"
---

# PWA

`src/pwa/pwaConfig.ts` is the single source for the manifest, the HTML head tags
injected at build time, and the workbox precache rules. `pwaConfig.verify.ts`
asserts all of it — extend the verifier alongside any change.

`index.html` is not the place for metadata. `vite.config.ts` overwrites its
title and injects head tags from `pwaConfig`, so an edit there is either
overwritten or invisible. The empty `<title></title>` in the source file is
deliberate.

Head tags currently cover theme color, Apple metadata, the apple-touch-icon, and
both favicons. Do not remove the favicon links: without them every page load
requests a nonexistent `/favicon.ico`, and that 404 fails the entire e2e suite
through its console-error assertions.

Icons under `public/pwa/` are generated from `teo-icon-source.svg` by
`npm run pwa:icons`. Edit the SVG and regenerate; never hand-edit the PNGs.

Precache exclusions are deliberate: the avatar GLBs and the lazy
`assets/AvatarScene-*.js` chunk are both left out, since the renderer is useless
offline without the models.
