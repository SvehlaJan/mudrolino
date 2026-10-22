---
name: playwright-browser-verification
description: Use when verifying teo-learn browser UI rendering with Playwright, especially local Vite routes, React Three Fiber canvases, screenshots, or macOS sandbox browser-launch failures.
---

# Playwright Browser Verification

Use the repo's Playwright scripts and installed dependencies for browser UI,
screenshots, canvas checks and debugging. No global skill or harness-specific
browser tool is required. For animated character acceptance, also read
`docs/avatar-authoring.md`.

## Setup

Playwright is a dev dependency in this repo. If browser binaries are missing:

```bash
npx playwright install chromium
```

That download is blocked in some sandboxes (Claude Code on the web returns `403 ... no rule or allowlist entry allows host "cdn.playwright.dev"`). Those environments pre-stage a browser under `PLAYWRIGHT_BROWSERS_PATH` instead — `npm run test:e2e` picks it up automatically via `e2e/browserResolver.ts`. For a one-off script that calls `chromium.launch()` directly, pass that binary yourself:

```js
await chromium.launch({ executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` });
```

Do not chase a failed `playwright install` in such an environment; use the pre-installed browser.

Start the app:

```bash
npm run dev
```

The dev server uses port `3000` when available and otherwise chooses another port, such as `3001`.

## macOS sandbox browser launches

Playwright Chromium can fail inside a restrictive harness sandbox with:

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

## Stable renderer sweeps

For a final source-bound sweep, use a dedicated owned viewer with
`DISABLE_HMR=true VITE_AVATAR_POC_ENABLED=true` on an available loopback port.
The bear first-navigation trace showed a development reload cancelling module
GETs even when the fixture later became ready. Waiting for network idle alone
did not remove that failure; a fresh HMR-disabled viewer passed all30 captures.
Keep failed runs and cancellations in their reports. Never filter them away or
call a warmed/restarted result the original pass. Wait for request settling
between pose navigations as well as model/clip readiness.

For a custom R3F root, measure/observe a stable wrapper rather than the canvas
whose pixel styles Fiber updates. Use untransformed layout dimensions, skip
unchanged sizes, coalesce observer updates outside delivery via RAF, and cancel
queued work on unmount. The bear's live667×375→568×320 probe caught a canvas
stuck at128×148 while its slot became96×112; WebKit also exposed repeated
ResizeObserver loop errors. Keep actual canvas-to-slot resizing in browser proof,
not merely the presence of a responsive outer div.

## Avatar Canvas Checks

For `/avatar-preview`, wait for app state before taking screenshots:

- `Status: available`
- `Clips:` is not `none found yet`
- `document.querySelector("canvas")` exists
- canvas width and height are nonzero
- `canvas.toDataURL("image/png").length` is nonzero

One-shot headless Chrome screenshots may capture the empty shell before the GLBs finish loading (the base body and each garment are a few hundred KB each, and the renderer itself is a lazy chunk). Prefer Playwright waits over fixed `--virtual-time-budget` screenshots.

## Visual Verification Pattern

For UI redesign visual verification, run:

```bash
npm run shots
```

Options include `--base=<url>`, `--scene=<id>`, `--viewport=<canonical-name>`, and optional `--output=<directory>`.

Screenshots are saved to the git-ignored `artifacts/ui/<UTC-date-time>-<pid>-<short-git-sha>/<scene>/<viewport>.png` directory (or the specified `--output` directory) for manual inspection.

The canonical viewports are:
- `narrowPhone`: `320 x 568`
- `smallPhone`: `360 x 640`
- `phonePortrait`: `390 x 844`
- `shortLandscape`: `667 x 375`
- `phoneLandscape`: `844 x 390`
- `tabletPortrait`: `768 x 1024`
- `tabletLandscape`: `1024 x 768`
- `desktop`: `1280 x 900`
- `desktopLarge`: `1440 x 900`
- `desktopWide`: `1920 x 1080`

For mobile layouts or one-off canvas checks, scroll into view before screenshotting:

```js
await page.locator("canvas").scrollIntoViewIfNeeded();
```


## Console Expectations

Known nonblocking console output:

- Vite dev connection logs
- React DevTools suggestion
- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`

Treat network errors, uncaught exceptions, WebGL context failures after using the flags above, missing clips, blank canvases, or zero-size canvases as blockers.

## Optional R3F failure proof

Test both malformed GLB parsing and unavailable WebGL in the actual browser;
assert a usable still/feedback view and zero uncaught `pageerror` events. A
React ErrorBoundary showing a fallback does not prove no global error escaped.
In installed Fiber 9.6.0, the reconciler sends caught errors to `reportError` too:
[pinned renderer source](https://github.com/pmndrs/react-three-fiber/blob/v9.6.0/packages/fiber/src/core/renderer.tsx).
Use installed/pinned APIs rather than master documentation for this path.

The bear implementation parses its optional GLB outside the reconciler, catches
and caches the outcome, and reuses already-fetched bytes. It constructs WebGL
before `createRoot` so renderer creation failures are also local. Do not suppress
window errors or mutate reconciler internals. See
`src/avatar/companionModelLoader.ts` and `e2e/avatar-companion.spec.ts`.

For brief feedback, observe the rendered state and its canvas/decorative props
atomically; a later Playwright roundtrip can miss the 1600ms window under load.
Keep the product's expiry unchanged. Verify actual draw calls stop after removal,
context disposal, retained event time on remount, and failures remain failed on
later rounds. Serialize heavy software-GL suites with dense Blender verification;
record interrupted or contention-failed runs separately from fresh passing proof.

## Brief animated feedback and media races

Verify actual game-clock playback as well as settled poses. Record readiness and
event lifetime; count visible rendered-model frames for motion framing and check
that loading/still presentation remains usable. Measure the figure, cover the
full action envelope and combined narrow/short breakpoint. Keep synthetic test
images separate from source-bound model review receipts.

Wait for inherited entrance opacity before measuring screenshot colors: faded
pixels can fall below a saturation mask and falsely shrink the figure. Prefer
one CSS-scale page PNG for both review and cropped pixel measurement. Require the
same connected visual, event, representation and rectangle across capture;
another element screenshot can outlive a brief reaction/remount. See
`e2e/support/companionFixture.ts` and `e2e/companion-measurement.spec.ts`.

When held media still allows a scene to advance, inspect trace response type/body
and fallback events before blaming expiry. HTTP200 HTML from a missing MP3 can
cause decode failure and TTS completion. Visual tests may serve an existing valid
clip while controlling completion; scope that override to visual tests and
preserve separate real-media/audio-order/fallback coverage.
