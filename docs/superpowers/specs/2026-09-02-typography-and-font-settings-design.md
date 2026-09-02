# Typography & Font Settings Design Specification

## Overview & Background

"Hravé Učenie" is a preschool learning web app with games teaching the Slovak alphabet, syllables, counting, and words. The current typography uses an incomplete, heavily subsetted build of "Fredoka" (`fredoka-latin-ext.woff2` ~4.5 KB) declared with `font-weight: 400 600;`. 

In runtime inspection, several critical typography and diacritic rendering bugs were observed:
1. Slovak characters with carons and acutes (`ľ`, `ĺ`, `š`, `ť`, `ď`, `ž`) suffer from broken decomposed accents or fall back to system fonts (e.g. rendering as `Kol'ko jabl~cok vidis?`).
2. Heavy font weights (`font-black` 900, `font-bold` 700, `font-extrabold` 800) exceed the declared `@font-face` weight range of 400–600, triggering synthetic browser distortion or system font fallback.

## Goals

1. **Flawless Slovak Typography**: Make **Nunito** the primary default font across the application, providing complete Latin Extended-A coverage with proper Slovak accents and native weights 400–900.
2. **Font Choice in Parent Settings**: Allow parents to switch the app's look and feel to an alternative playful typeface, **Shantell Sans** (a friendly comic/marker book style), persisted in local storage.
3. **100% Offline & Child Privacy**: Self-host all font files locally in `public/fonts/` as `.woff2` files so the app functions fully offline in PWA mode with zero external CDN dependencies or network tracking.
4. **Instant Visual Switch**: Support instantaneous theme switching without page reloads using a root dataset attribute and CSS variables.

## Non-Goals

- Replacing the existing color system or `shadow-block` tactile UI style.
- Modifying game engines or round loops.
- Adding third-party fonts that require external CDN streaming.

---

## Architectural Details

### 1. Font Assets (`public/fonts/`)

Download and commit complete, modern WOFF2 variable font files from upstream Google Fonts with Latin and Latin-Extended subsets:
- `nunito-latin.woff2` (U+0000-00FF, basic Latin)
- `nunito-latin-ext.woff2` (U+0100-02BA..., Slovak/Czech diacritics including `ľ`, `ĺ`, `ť`, `ď`, `ň`, `ô`, `ä`, `č`, `š`, `ž`)
- `shantell-latin.woff2` (U+0000-00FF)
- `shantell-latin-ext.woff2` (U+0100-02BA...)

The deprecated, defective `fredoka-*.woff2` files will be removed.

### 2. CSS & Theme Tokens (`src/index.css`)

Update `@font-face` declarations:
```css
@font-face {
  font-family: 'Nunito';
  src: url('/fonts/nunito-latin-ext.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, ...;
}

@font-face {
  font-family: 'Nunito';
  src: url('/fonts/nunito-latin.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, ...;
}

@font-face {
  font-family: 'Shantell Sans';
  src: url('/fonts/shantell-latin-ext.woff2') format('woff2');
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0100-02BA, ...;
}

@font-face {
  font-family: 'Shantell Sans';
  src: url('/fonts/shantell-latin.woff2') format('woff2');
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, ...;
}
```

Define CSS variable `--font-app`:
```css
:root {
  --font-app: "Nunito", sans-serif;
}

:root[data-font="shantell"] {
  --font-app: "Shantell Sans", cursive, sans-serif;
}
```

Bind `@theme` and `body`:
```css
@theme {
  --font-fredoka: var(--font-app); /* Retains backward-compatibility for existing Tailwind classes */
  --font-app: var(--font-app);
}

body {
  font-family: var(--font-app);
}
```

### 3. Application State & Storage (`src/shared/services/appSettingsStore.ts`)

Extend `AppSettings` interface:
```ts
export type AppFontFamily = 'nunito' | 'shantell';

export interface AppSettings {
  locale: string;
  fontFamily: AppFontFamily;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'sk',
  fontFamily: 'nunito',
};
```

In `loadAppSettings()`, parse `fontFamily` and fallback to `'nunito'` if invalid or missing:
```ts
fontFamily: stored.fontFamily === 'shantell' ? 'shantell' : 'nunito',
```

Add a helper to apply the font attribute to the DOM document element:
```ts
export function applyFontFamily(font: AppFontFamily): void {
  document.documentElement.dataset.font = font;
}
```

### 4. Settings UI (`src/shared/components/SettingsContent.tsx`)

In Parent Settings (*Rodičovská zóna*), add a **Písmo** card (rendered when `isHome` is true):
- Icon: `Type` icon from `lucide-react`.
- Title: "Písmo"
- Description: "Štýl písma v aplikácii."
- Control: `SegmentedChoice` with options:
  - `nunito`: "Zaoblené" (podtitul / náhľad: *Nunito*)
  - `shantell`: "Hravé" (podtitul / náhľad: *Shantell Sans*)
- Selecting an option immediately updates `appSettings`, saves to `localStorage`, and updates `document.documentElement.dataset.font`.

---

## Verification Plan

### Automated Checks
- `npm run lint`: TypeScript type-checking and ESLint verification.
- `npm run build`: Vite production bundle verification.

### Visual & Browser Verification (Playwright)
- Capture desktop (1280x900) and mobile (390x844) screenshots of:
  - Home screen (`/`) with Nunito and with Shantell Sans.
  - Subtitle "Koľko jabĺčok vidíš?" to verify that `ľ`, `ĺ`, `č`, `š`, and `í` render with authentic diacritics without fallback.
  - Game screen (e.g. `/words` and `/alphabet`) to verify tile typography.
  - Settings screen (`/settings`) showing the font selection card and state change.
