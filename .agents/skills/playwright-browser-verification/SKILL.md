---
name: playwright-browser-verification
description: Use when verifying teo-learn browser UI rendering with Playwright, especially local Vite routes, React Three Fiber canvases, screenshots, or macOS sandbox browser-launch failures.
---

# Playwright Browser Verification

Use this repo-local skill with the global `playwright` skill when a change needs real browser verification, screenshots, canvas checks, or UI-flow debugging.

## Setup

Playwright is a dev dependency in this repo. If browser binaries are missing:

```bash
npx playwright install chromium
```

Start the app:

```bash
npm run dev
```

The dev server uses port `3000` when available and otherwise chooses another port, such as `3001`.

## macOS Codex Sandbox Gotcha

Playwright Chromium can fail inside Codex's default sandbox with:

```text
MachPortRendezvousServer... Permission denied
```

When that happens, rerun the same Playwright verification command outside the sandbox with escalation. Do not debug app code until browser launch succeeds outside the sandbox.

For React Three Fiber/WebGL checks, launch Chromium with software GL flags:

```js
await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle"],
});
```

If console output says `Error creating WebGL context` with `GL_VENDOR = Disabled`, first verify the browser was launched with those flags and outside the sandbox.

## Avatar Canvas Checks

For `/avatar-preview`, wait for app state before taking screenshots:

- `Status: available`
- `Clips:` is not `none found yet`
- `document.querySelector("canvas")` exists
- canvas width and height are nonzero
- `canvas.toDataURL("image/png").length` is nonzero

One-shot headless Chrome screenshots may capture the empty shell before the 18 MB GLB finishes loading. Prefer Playwright waits over fixed `--virtual-time-budget` screenshots.

## Visual Verification Pattern

Use desktop and mobile viewports:

- desktop: `1280 x 900`
- mobile: `390 x 844`

For mobile layouts, scroll the canvas into view before screenshotting:

```js
await page.locator("canvas").scrollIntoViewIfNeeded();
```

Capture screenshots into `/tmp` unless the user asks for persistent artifacts.

## Console Expectations

Known nonblocking console output:

- Vite dev connection logs
- React DevTools suggestion
- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`

Treat network errors, uncaught exceptions, WebGL context failures after using the flags above, missing clips, blank canvases, or zero-size canvases as blockers.
