# Typography & Font Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current broken Fredoka typography with **Nunito** as the primary default font across the app, ensuring full Slovak diacritic rendering (`ľ`, `ĺ`, `ť`, `ď`, `ň`, `ô`, `ä`, `č`, `š`, `ž`), and add **Shantell Sans** as a selectable playful font in Parent Settings (*Rodičovská zóna*), persisted locally with 100% offline self-hosted WOFF2 assets.

**Architecture:** 
- Bundle self-hosted `.woff2` files for Nunito and Shantell Sans in `public/fonts/`.
- Declare `@font-face` rules in `src/index.css` supporting Latin and Latin-Extended subsets across full weight ranges.
- Extend `appSettingsStore.ts` to persist `fontFamily: 'nunito' | 'shantell'` and toggle `:root[data-font="..."]`.
- Integrate a "Písmo" selection card in `SettingsContent.tsx` using `SegmentedChoice`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph Storage & State
        S[appSettingsStore.ts] -->|load/save| LS[(localStorage)]
        S -->|applyFontFamily| DOM[document.documentElement.dataset.font]
    end

    subgraph Styling
        DOM -->|data-font='shantell'| CSS[src/index.css]
        CSS -->|--font-app| TH[Tailwind @theme & body]
        FONTS[public/fonts/*.woff2] -->|@font-face| CSS
    end

    subgraph UI
        ST[SettingsContent.tsx] -->|select font| S
        APP[App.tsx] -->|sync on load| DOM
    end
```

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Playwright, WOFF2 web fonts.

## Global Constraints

- No external CDN links (offline PWA and privacy compliance).
- Backward compatibility: keep `--font-fredoka` mapped to `var(--font-app)` so existing Tailwind classes don't break.
- Typecheck with `npm run lint` and build with `npm run build`.

---

### Task 1: Font Assets Download & Verification

**Files:**
- Create: `public/fonts/nunito-latin.woff2`
- Create: `public/fonts/nunito-latin-ext.woff2`
- Create: `public/fonts/shantell-latin.woff2`
- Create: `public/fonts/shantell-latin-ext.woff2`
- Create: `tools/verify_fonts.ts`
- Delete: `public/fonts/fredoka-latin.woff2`
- Delete: `public/fonts/fredoka-latin-ext.woff2`

- [ ] **Step 1: Download upstream WOFF2 files**

Download the official Google Fonts variable font subsets for Nunito and Shantell Sans:
```bash
curl -s "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofINeaBTMnFcQ.woff2" -o public/fonts/nunito-latin.woff2
curl -s "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIO-aBTMnFcQIG.woff2" -o public/fonts/nunito-latin-ext.woff2
curl -s "https://fonts.gstatic.com/s/shantellsans/v11/0FlDVP29UYubUR-ELuKVnC82187mvptv6702eS_Yhbd_V8K0-6k7-g.woff2" -o public/fonts/shantell-latin.woff2
curl -s "https://fonts.gstatic.com/s/shantellsans/v11/0FlDVP29UYubUR-ELuKVnC82187mvptv6702eS_Yhbd_V8K0-qk7.woff2" -o public/fonts/shantell-latin-ext.woff2
```

- [ ] **Step 2: Write font verification test script**

Create `tools/verify_fonts.ts`:
```ts
import fs from 'fs';
import path from 'path';

const REQUIRED_FONTS = [
  'nunito-latin.woff2',
  'nunito-latin-ext.woff2',
  'shantell-latin.woff2',
  'shantell-latin-ext.woff2',
];

for (const font of REQUIRED_FONTS) {
  const filePath = path.join(process.cwd(), 'public/fonts', font);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing font file: ${font}`);
  }
  const size = fs.statSync(filePath).size;
  if (size < 5000) {
    throw new Error(`Font file too small or empty (${size} bytes): ${font}`);
  }
  console.log(`✓ ${font} exists (${size} bytes)`);
}
```

- [ ] **Step 3: Run verification script**

Run: `npx tsx tools/verify_fonts.ts`
Expected: Output showing all 4 fonts exist and are non-trivial size.

- [ ] **Step 4: Remove old fredoka font files**

```bash
rm -f public/fonts/fredoka-latin.woff2 public/fonts/fredoka-latin-ext.woff2
```

- [ ] **Step 5: Commit**

```bash
git add public/fonts/ tools/verify_fonts.ts
git commit -m "chore: add nunito and shantell sans woff2 font files"
```

---

### Task 2: Settings Store Font Persistence

**Files:**
- Modify: `src/shared/services/appSettingsStore.ts`
- Create: `src/shared/services/appSettingsStore.verify.ts`

**Interfaces:**
- Produces: `AppFontFamily = 'nunito' | 'shantell'`
- Produces: `applyFontFamily(font: AppFontFamily): void`

- [ ] **Step 1: Write the failing verification test**

Create `src/shared/services/appSettingsStore.verify.ts`:
```ts
import { DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings, AppFontFamily, applyFontFamily } from './appSettingsStore';

// Mock localStorage
const store: Record<string, string> = {};
global.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
} as unknown as Storage;

// Test default
const initial = loadAppSettings();
if (initial.fontFamily !== 'nunito') {
  throw new Error(`Expected default fontFamily to be 'nunito', got '${initial.fontFamily}'`);
}

// Test save & load
saveAppSettings({ locale: 'sk', fontFamily: 'shantell' });
const updated = loadAppSettings();
if (updated.fontFamily !== 'shantell') {
  throw new Error(`Expected fontFamily 'shantell', got '${updated.fontFamily}'`);
}

// Test invalid fallback
store['hrave-ucenie-app-settings'] = JSON.stringify({ locale: 'sk', fontFamily: 'comic-sans' });
const fallback = loadAppSettings();
if (fallback.fontFamily !== 'nunito') {
  throw new Error(`Expected fallback to 'nunito', got '${fallback.fontFamily}'`);
}

console.log('✓ appSettingsStore font tests passed');
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx tsx src/shared/services/appSettingsStore.verify.ts`
Expected: FAIL (fontFamily not in AppSettings)

- [ ] **Step 3: Update `appSettingsStore.ts`**

Update `src/shared/services/appSettingsStore.ts`:
```ts
const STORAGE_KEY = 'hrave-ucenie-app-settings';

export type AppFontFamily = 'nunito' | 'shantell';

export interface AppSettings {
  locale: string; // BCP 47: 'sk' | 'cs' | 'en' | 'fr' | ...
  fontFamily: AppFontFamily;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'sk',
  fontFamily: 'nunito',
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return {
      locale: typeof stored.locale === 'string' ? stored.locale : DEFAULT_APP_SETTINGS.locale,
      fontFamily: stored.fontFamily === 'shantell' ? 'shantell' : 'nunito',
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded
  }
}

export function applyFontFamily(font: AppFontFamily): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.font = font;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/shared/services/appSettingsStore.verify.ts`
Expected: PASS (`✓ appSettingsStore font tests passed`)

- [ ] **Step 5: Commit**

```bash
git add src/shared/services/appSettingsStore.ts src/shared/services/appSettingsStore.verify.ts
git commit -m "feat: add fontFamily support to appSettingsStore"
```

---

### Task 3: CSS & Theme Token Configuration

**Files:**
- Modify: `src/index.css`
- Modify: `src/shared/ui/tokens.ts`

- [ ] **Step 1: Update `@font-face` and CSS variables in `src/index.css`**

Replace the Fredoka `@font-face` declarations with Nunito and Shantell Sans declarations, configure `:root`, and alias `--font-fredoka` to `--font-app`:
```css
@import "tailwindcss";

@font-face {
  font-family: 'Nunito';
  src: url('/fonts/nunito-latin-ext.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Nunito';
  src: url('/fonts/nunito-latin.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Shantell Sans';
  src: url('/fonts/shantell-latin-ext.woff2') format('woff2');
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Shantell Sans';
  src: url('/fonts/shantell-latin.woff2') format('woff2');
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

:root {
  --font-app: "Nunito", sans-serif;
}

:root[data-font="shantell"] {
  --font-app: "Shantell Sans", cursive, sans-serif;
}

@theme {
  --font-fredoka: var(--font-app);
  --font-app: var(--font-app);
  --font-spline: "Spline Sans", sans-serif;
  
  --color-primary: #f53d4c;
  --color-bg-light: #F4F1EA;
  --color-bg-dark: #221011;
  --color-surface: #FFFFFF;
  --color-text-main: #5D453E;
  --color-shadow: #D5CABD;
  --color-success: #B5EAD7;
  --color-accent-blue: #C7CEEA;
  --color-accent-orange: #F6A03C;
  --color-soft-watermelon: #FF9AA2;
}

body {
  background-color: var(--color-bg-light);
  font-family: var(--font-app);
  color: var(--color-text-main);
  user-select: none;
  overflow-x: hidden;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

- [ ] **Step 2: Update `src/shared/ui/tokens.ts`**

Update `screenBg` to use `font-app`:
```ts
screenBg: 'bg-bg-light text-text-main font-app',
```

- [ ] **Step 3: Run linter to check styles and build**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/shared/ui/tokens.ts
git commit -m "style: configure nunito and shantell sans in index.css and theme tokens"
```

---

### Task 4: Parent Settings Font UI & App Root Synchronization

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/shared/components/SettingsScreen.tsx`
- Modify: `src/shared/components/SettingsContent.tsx`

- [ ] **Step 1: Wire `applyFontFamily` and state in `src/App.tsx`**

Ensure `applyFontFamily(appSettings.fontFamily)` is executed on initial render and whenever `appSettings.fontFamily` updates, and pass `appSettings` and setter to `SettingsScreen`.

- [ ] **Step 2: Add Font Card to `SettingsContent.tsx`**

Add `Type` icon from `lucide-react`. When `isHome` is true, display:
```tsx
<SettingsCard>
  <div className="flex items-start gap-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
      <Type size={24} className="sm:h-7 sm:w-7" />
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-xl font-bold leading-tight sm:text-2xl">Písmo</h3>
      <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
        Štýl písma v celej aplikácii.
      </p>
    </div>
  </div>
  <div className="mt-5">
    <SegmentedChoice
      options={['nunito', 'shantell'] as const}
      selected={appSettings.fontFamily}
      activeClassName="bg-accent-blue"
      formatLabel={(value) => value === 'nunito' ? 'Zaoblené (Nunito)' : 'Hravé (Shantell)'}
      onSelect={(value) => {
        onUpdateAppSettings({ ...appSettings, fontFamily: value });
      }}
      columns={2}
    />
  </div>
</SettingsCard>
```

- [ ] **Step 3: Run linter and tests**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/shared/components/SettingsScreen.tsx src/shared/components/SettingsContent.tsx
git commit -m "feat: add font family selector in parent settings"
```

---

### Task 5: Visual Verification with Playwright

**Files:**
- Create: `tools/verify_font_rendering.mjs`

- [ ] **Step 1: Write Playwright screenshot verification script**

Create `tools/verify_font_rendering.mjs` to capture:
1. Home screen with Nunito (verifying "Koľko jabĺčok vidíš?" diacritics).
2. Settings screen with Font card.
3. Home screen after switching to Shantell Sans.
4. An in-game screen (`/words` or `/alphabet`) verifying tile legibility.

- [ ] **Step 2: Run verification script**

Run: `node tools/verify_font_rendering.mjs`
Expected: Screenshots saved to `.gemini/antigravity/brain/.../screenshots/` and verified with no errors.

- [ ] **Step 3: Run project build**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit and finalize**

```bash
git add tools/verify_font_rendering.mjs ROADMAP.md
git commit -m "test: verify nunito and shantell sans typography and settings switch"
```
