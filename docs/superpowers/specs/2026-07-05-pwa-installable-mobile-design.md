# PWA Installable Mobile Design

Date: 2026-07-05

## Goal

Make Teo Learn installable on mobile as a Progressive Web App, with reliable offline support for the core preschool game flow after the app has been installed or loaded once. The first pass should be practical and maintainable: use standard Vite PWA tooling, avoid custom service worker code unless necessary, and keep temporary Teo branding easy to replace during the expected rebrand.

## Research Baseline

- MDN installability guidance: Chromium-based browsers require a web app manifest with `name` or `short_name`, 192px and 512px icons, `start_url`, `display` or `display_override`, and HTTPS or localhost serving.
- `vite-plugin-pwa` provides Vite integration for manifest generation, service worker registration, Workbox precaching, and React update prompt support through `virtual:pwa-register/react`.
- web.dev recommends a manifest linked from app HTML, solid-color manifest colors, install icons that include 512px assets, and maskable icons for Android adaptive icon shapes.
- iOS install support is different from Android: Add to Home Screen is user-driven from the browser share flow, and the Android-style `beforeinstallprompt` flow is not available on iOS.

Primary references:

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://web.dev/learn/pwa/web-app-manifest
- https://github.com/vite-pwa/vite-plugin-pwa/tree/main/docs
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html

## Chosen Approach

Use `vite-plugin-pwa` with a generated Workbox service worker and prompt-based updates.

Alternatives considered:

- Minimal installable PWA: faster, but weaker because core audio/game assets may still fail offline.
- Custom service worker: more control, but higher maintenance and more cache invalidation risk.

The chosen approach gives installability and offline core games without hand-writing service worker lifecycle code.

## PWA Identity

Temporary install identity:

- `name`: `Teo Learn`
- `short_name`: `Teo`
- `lang`: `sk`
- `description`: Slovak preschool learning app with games and parent-recorded content.
- `display`: `standalone`
- `scope`: `/`
- `start_url`: `/`
- `orientation`: `portrait-primary`
- `theme_color`: solid hex matching the current app palette
- `background_color`: solid hex matching the current loading/background palette

The implementation should centralize app identity values in one PWA config area so a later rebrand can replace names, colors, and icon paths without searching through unrelated app code.

## Icon Assets

Generate a simple temporary Teo icon set under `public/pwa/`:

- `pwa-192x192.png`
- `pwa-512x512.png`
- `pwa-maskable-512x512.png`
- `apple-touch-icon.png`

The icon should be high-contrast and readable at small sizes. A friendly rounded Teo face or simple Teo mark is preferred over a detailed scene. The maskable icon must keep the important artwork inside the safe center area so Android launchers can crop it without losing the mark.

Because rebranding is expected, icon generation should be treated as a temporary brand asset, not as a permanent visual identity system.

## Offline Scope

The first PWA pass should support offline core games:

- Cache the built Vite app shell and route assets.
- Cache local fonts so installed mode renders consistently offline.
- Cache built-in audio under `public/audio/**`.
- Cache core public assets needed by home, games, settings, and parent authoring.
- Preserve custom parent recordings through the existing IndexedDB audio override store.

Out of scope for this pass:

- Full offline guarantee for avatar/3D garment assets.
- Push notifications.
- Background sync.
- App store packaging.

Large avatar and 3D assets can be added later with a deliberate storage budget and route-specific caching strategy.

## Update Behavior

Use prompt-based updates rather than silent auto-update.

The service worker registration should track:

- `offlineReady`: app has cached its core shell/assets.
- `needRefresh`: a new version is available.
- `updateServiceWorker(true)`: intentionally reload into the new version.

The user should not be automatically reloaded while a child is in a game. Updates should be parent-controlled from the home-screen affordance.

## Install And Update UX

Add a compact parent-facing PWA affordance on the home screen near existing parent controls. It should not appear inside active game routes.

States:

- Install available: show a compact install action such as `Pridať Teo`, with an install/download icon.
- iOS install guidance: when native prompt support is unavailable, show concise instructions for Share -> Add to Home Screen.
- Installed or standalone: hide the install CTA, or show only a subtle parent-facing installed status.
- Offline ready: show a small dismissible confirmation.
- Update available: show a compact prompt with `Aktualizovať` and `Neskôr`; update reloads intentionally.
- Offline/no network: avoid disruptive banners; cached core content should continue working.

The UI should use existing shared primitives and remain visually quiet compared with the child game controls.

## Implementation Units

1. PWA configuration
   - Add `vite-plugin-pwa`.
   - Configure manifest metadata.
   - Configure Workbox precaching for generated build assets, fonts, audio, and selected public assets.
   - Add TypeScript declaration support for `virtual:pwa-register/react`.

2. PWA assets
   - Generate temporary Teo icon PNGs.
   - Add standard, maskable, and Apple touch icon files under `public/pwa/`.

3. PWA registration/state
   - Add a small hook/provider/component that registers the service worker.
   - Track install availability, standalone/installed mode, offline readiness, and update availability.

4. Home affordance
   - Add the compact install/update control to the home screen parent area.
   - Keep it out of child game routes.
   - Provide iOS install instructions when browser prompt support is unavailable.

5. HTML metadata
   - Add the minimal meta tags needed for theme color and mobile install polish.
   - Do not overfit to legacy Safari-only behavior where the manifest and current browser behavior are sufficient.

6. Verification
   - Run `npm run lint`.
   - Run `npm run build`.
   - Inspect generated `dist/manifest.webmanifest`, service worker, and precache manifest.
   - Use Playwright to smoke the home screen and game routes after a production build/preview.
   - Run browser PWA checks where available.
   - Manually verify Add to Home Screen on iOS and install prompt on Android/Chromium.

## Risks And Constraints

- Browser install behavior varies across iOS, Android, and desktop.
- iOS Add to Home Screen cannot be triggered programmatically.
- Large public assets can bloat precache size and slow first install; avatar/3D assets are intentionally deferred.
- Service worker updates can surprise users if applied silently; this design uses parent-controlled prompts.
- PWA installability depends on HTTPS in deployed environments, though localhost works for development.

## Acceptance Criteria

- The app exposes a valid manifest with Teo temporary branding, installable icons, `start_url`, `scope`, and standalone display mode.
- A production build emits a service worker and manifest.
- Core game routes and built-in audio can be served from cache after initial load/install.
- Custom recordings remain available offline through the existing IndexedDB storage.
- A parent-facing home affordance handles install availability, iOS instructions, offline-ready status, and update-available status.
- No update prompt appears inside active child game routes.
- Rebranding requires changing a small centralized set of PWA metadata and icons.
