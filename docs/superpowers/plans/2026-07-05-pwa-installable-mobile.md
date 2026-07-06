# PWA Installable Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Vite React app installable as a mobile PWA with offline support for core games, built-in audio, and parent-controlled install/update UI.

**Architecture:** Use `vite-plugin-pwa` with generated Workbox service worker output instead of custom service worker code. Centralize temporary Teo PWA metadata in `src/pwa/pwaConfig.ts`, generate temporary PNG icons from a small SVG source, register service worker state through a focused hook, and add one compact parent-facing control to the home screen header.

**Tech Stack:** Vite 8, React 19, TypeScript, `vite-plugin-pwa`, Workbox generated service worker, `sharp` icon generation script, existing shared UI primitives.

---

## File Structure

- Create: `src/pwa/pwaConfig.ts`  
  Central PWA metadata, manifest, Workbox cache glob rules, and icon path constants. This is the rebrand touchpoint.

- Create: `src/pwa/pwaConfig.verify.ts`  
  Lightweight executable assertions for manifest metadata and Workbox cache coverage because the repo has no test runner.

- Create: `src/pwa/vite-pwa.d.ts`  
  Type declarations for `virtual:pwa-register/react`.

- Create: `src/pwa/usePwaInstall.ts`  
  Browser install/update/offline-ready state hook. Owns `beforeinstallprompt`, standalone detection, iOS fallback detection, and service worker update callbacks.

- Create: `src/pwa/PwaHomeControl.tsx`  
  Compact parent-facing home-screen install/update control.

- Create: `tools/pwa/generate-icons.mjs`  
  Deterministic icon generator using `sharp`, writing temporary Teo PNG icons into `public/pwa/`.

- Create: `public/pwa/teo-icon-source.svg`  
  Temporary Teo source mark used by the generator.

- Generate: `public/pwa/pwa-192x192.png`
- Generate: `public/pwa/pwa-512x512.png`
- Generate: `public/pwa/pwa-maskable-512x512.png`
- Generate: `public/pwa/apple-touch-icon.png`

- Modify: `package.json`  
  Add `vite-plugin-pwa` and `sharp` dev dependencies, plus a `pwa:icons` script.

- Modify: `package-lock.json`  
  Updated by `npm install`.

- Modify: `vite.config.ts`  
  Add `VitePWA(pwaPluginOptions)` to the plugin list.

- Modify: `index.html`  
  Add app title/theme/mobile metadata that complements the generated manifest.

- Modify: `src/App.tsx`  
  Mount `PwaHomeControl` near the home settings button only.

- Modify: `src/shared/ui/UiKitScreen.tsx`  
  Add representative PWA home control examples.

- Modify: `ROADMAP.md`  
  Add or mark a PWA/mobile installability roadmap item.

---

## Task 1: Add PWA Dependencies And Central Config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/pwa/pwaConfig.ts`
- Create: `src/pwa/pwaConfig.verify.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install -D vite-plugin-pwa sharp
```

Expected: `package.json` and `package-lock.json` update with `vite-plugin-pwa` and `sharp` in `devDependencies`.

- [ ] **Step 2: Add PWA icon script**

In `package.json`, add this script next to the existing scripts:

```json
"pwa:icons": "node tools/pwa/generate-icons.mjs"
```

Expected: the `scripts` object contains this exact new key/value and all existing script key/value pairs remain unchanged:

```json
"pwa:icons": "node tools/pwa/generate-icons.mjs"
```

- [ ] **Step 3: Create failing config verification**

Create `src/pwa/pwaConfig.verify.ts` with this complete content:

```typescript
import { pwaManifest, pwaPluginOptions } from './pwaConfig';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(pwaManifest.name === 'Teo Learn', 'manifest name is temporary Teo identity');
assert(pwaManifest.short_name === 'Teo', 'manifest short_name is Teo');
assert(pwaManifest.lang === 'sk', 'manifest lang is sk');
assert(pwaManifest.start_url === '/', 'manifest starts at home');
assert(pwaManifest.scope === '/', 'manifest scope is root');
assert(pwaManifest.display === 'standalone', 'manifest uses standalone display');
assert(pwaManifest.orientation === 'portrait-primary', 'manifest uses portrait-primary orientation');
assert(Boolean(pwaManifest.theme_color?.startsWith('#')), 'theme_color is a solid hex color');
assert(Boolean(pwaManifest.background_color?.startsWith('#')), 'background_color is a solid hex color');

const iconSources = new Set(pwaManifest.icons.map((icon) => icon.src));
assert(iconSources.has('/pwa/pwa-192x192.png'), 'manifest includes 192 icon');
assert(iconSources.has('/pwa/pwa-512x512.png'), 'manifest includes 512 icon');
assert(iconSources.has('/pwa/pwa-maskable-512x512.png'), 'manifest includes maskable icon');
assert(
  pwaManifest.icons.some((icon) => icon.src === '/pwa/pwa-maskable-512x512.png' && icon.purpose === 'maskable'),
  'maskable icon uses maskable purpose',
);

assert(pwaPluginOptions.registerType === 'prompt', 'service worker updates are prompt-based');
assert(pwaPluginOptions.injectRegister === null, 'manual React registration avoids duplicate registration');
assert(pwaPluginOptions.manifest === pwaManifest, 'plugin uses centralized manifest');

const globPatterns = pwaPluginOptions.workbox?.globPatterns ?? [];
assert(globPatterns.includes('**/*.{js,css,html,webmanifest}'), 'workbox precaches shell assets');
assert(globPatterns.includes('audio/**/*.{mp3,ogg,wav}'), 'workbox precaches built-in audio');
assert(globPatterns.includes('fonts/**/*.woff2'), 'workbox precaches local fonts');

const globIgnores = pwaPluginOptions.workbox?.globIgnores ?? [];
assert(globIgnores.includes('avatar/**/*.glb'), 'workbox skips large avatar glbs in first pass');

console.log('pwaConfig checks passed');
```

- [ ] **Step 4: Run the check and verify it fails**

Run:

```bash
npx tsx src/pwa/pwaConfig.verify.ts
```

Expected: command fails because `src/pwa/pwaConfig.ts` does not exist yet.

- [ ] **Step 5: Create centralized PWA config**

Create `src/pwa/pwaConfig.ts` with this complete content:

```typescript
import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa';

export const pwaBrand = {
  appName: 'Teo Learn',
  shortName: 'Teo',
  description: 'Slovenská predškolská aplikácia s hrami a rodičmi nahratým obsahom.',
  themeColor: '#F53D4C',
  backgroundColor: '#F4F1EA',
} as const;

export const pwaIcons = {
  standard192: '/pwa/pwa-192x192.png',
  standard512: '/pwa/pwa-512x512.png',
  maskable512: '/pwa/pwa-maskable-512x512.png',
  appleTouch: '/pwa/apple-touch-icon.png',
} as const;

export const pwaManifest: ManifestOptions = {
  id: '/',
  name: pwaBrand.appName,
  short_name: pwaBrand.shortName,
  description: pwaBrand.description,
  lang: 'sk',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: pwaBrand.themeColor,
  background_color: pwaBrand.backgroundColor,
  categories: ['education', 'kids', 'games'],
  icons: [
    {
      src: pwaIcons.standard192,
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: pwaIcons.standard512,
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: pwaIcons.maskable512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export const pwaPluginOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  injectRegister: null,
  includeAssets: [
    'pwa/apple-touch-icon.png',
    'pwa/pwa-192x192.png',
    'pwa/pwa-512x512.png',
    'pwa/pwa-maskable-512x512.png',
  ],
  manifest: pwaManifest,
  workbox: {
    globPatterns: [
      '**/*.{js,css,html,webmanifest}',
      'audio/**/*.{mp3,ogg,wav}',
      'fonts/**/*.woff2',
      'pwa/**/*.{png,svg}',
    ],
    globIgnores: [
      'avatar/**/*.glb',
      '**/*.map',
      'sw.js',
      'workbox-*.js',
    ],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    navigateFallback: '/',
  },
  devOptions: {
    enabled: false,
  },
};
```

- [ ] **Step 6: Wire plugin into Vite config**

Modify `vite.config.ts` to import the plugin and central config:

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaPluginOptions } from './src/pwa/pwaConfig';
```

Then change the plugin list from:

```typescript
plugins: [react(), tailwindcss()],
```

to:

```typescript
plugins: [react(), tailwindcss(), VitePWA(pwaPluginOptions)],
```

Also fix spacing in the Vite import if the file currently has `import {defineConfig, loadEnv} from 'vite';`.

- [ ] **Step 7: Run config verification**

Run:

```bash
npx tsx src/pwa/pwaConfig.verify.ts
```

Expected output includes:

```text
pwaConfig checks passed
```

- [ ] **Step 8: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript passes. The existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/pwa/pwaConfig.ts src/pwa/pwaConfig.verify.ts
git commit -m "feat: add pwa manifest config"
```

---

## Task 2: Generate Temporary Teo PWA Icons

**Files:**
- Create: `tools/pwa/generate-icons.mjs`
- Create: `public/pwa/teo-icon-source.svg`
- Generate: `public/pwa/pwa-192x192.png`
- Generate: `public/pwa/pwa-512x512.png`
- Generate: `public/pwa/pwa-maskable-512x512.png`
- Generate: `public/pwa/apple-touch-icon.png`

- [ ] **Step 1: Create source SVG**

Create `public/pwa/teo-icon-source.svg` with this complete content:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Teo temporary app icon">
  <rect width="512" height="512" rx="112" fill="#F53D4C"/>
  <circle cx="256" cy="250" r="154" fill="#F4F1EA"/>
  <circle cx="202" cy="222" r="22" fill="#5D453E"/>
  <circle cx="310" cy="222" r="22" fill="#5D453E"/>
  <path d="M186 298c36 46 104 46 140 0" fill="none" stroke="#5D453E" stroke-width="28" stroke-linecap="round"/>
  <path d="M152 157c46-42 162-48 213 6" fill="none" stroke="#5D453E" stroke-width="30" stroke-linecap="round"/>
  <circle cx="150" cy="270" r="24" fill="#FF9AA2"/>
  <circle cx="362" cy="270" r="24" fill="#FF9AA2"/>
  <text x="256" y="438" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="800" fill="#F4F1EA">Teo</text>
</svg>
```

- [ ] **Step 2: Create icon generator**

Create `tools/pwa/generate-icons.mjs` with this complete content:

```javascript
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'pwa');
const source = path.join(outputDir, 'teo-icon-source.svg');

const icons = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

await mkdir(outputDir, { recursive: true });

for (const icon of icons) {
  await sharp(source)
    .resize(icon.size, icon.size)
    .png()
    .toFile(path.join(outputDir, icon.file));
}

await sharp(source)
  .resize(408, 408)
  .extend({
    top: 52,
    right: 52,
    bottom: 52,
    left: 52,
    background: '#F53D4C',
  })
  .resize(512, 512)
  .png()
  .toFile(path.join(outputDir, 'pwa-maskable-512x512.png'));

console.log('Generated PWA icons in public/pwa');
```

- [ ] **Step 3: Generate icons**

Run:

```bash
npm run pwa:icons
```

Expected output:

```text
Generated PWA icons in public/pwa
```

- [ ] **Step 4: Inspect generated files**

Run:

```bash
file public/pwa/pwa-192x192.png public/pwa/pwa-512x512.png public/pwa/pwa-maskable-512x512.png public/pwa/apple-touch-icon.png
```

Expected: each output line says `PNG image data`; sizes should be `192 x 192`, `512 x 512`, `512 x 512`, and `180 x 180`.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: Vite build completes and copies `public/pwa/*` into `dist/pwa/`.

- [ ] **Step 6: Commit**

```bash
git add tools/pwa/generate-icons.mjs public/pwa/teo-icon-source.svg public/pwa/pwa-192x192.png public/pwa/pwa-512x512.png public/pwa/pwa-maskable-512x512.png public/pwa/apple-touch-icon.png
git commit -m "feat: add temporary teo pwa icons"
```

---

## Task 3: Add PWA Registration State Hook

**Files:**
- Create: `src/pwa/vite-pwa.d.ts`
- Create: `src/pwa/usePwaInstall.ts`

- [ ] **Step 1: Create Vite PWA virtual module declarations**

Create `src/pwa/vite-pwa.d.ts` with this complete content:

```typescript
declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react';

  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
```

- [ ] **Step 2: Create PWA install hook**

Create `src/pwa/usePwaInstall.ts` with this complete content:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaInstallPlatform = 'chromium' | 'ios' | 'unsupported';

export interface PwaInstallState {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  platform: PwaInstallPlatform;
  offlineReady: boolean;
  needRefresh: boolean;
  registrationError: string | null;
  promptInstall(): Promise<void>;
  updateApp(): Promise<void>;
  dismissOfflineReady(): void;
  dismissUpdate(): void;
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

function isIosLike(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function hasServiceWorkerSupport(): boolean {
  return 'serviceWorker' in navigator;
}

export function usePwaInstall(): PwaInstallState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplay());
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const isIos = useMemo(() => isIosLike(), []);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      setRegistrationError(error instanceof Error ? error.message : 'Registrácia offline režimu zlyhala.');
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    const handleDisplayModeChange = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const updateApp = useCallback(async () => {
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  const platform: PwaInstallPlatform = installPrompt
    ? 'chromium'
    : isIos && !isStandalone
      ? 'ios'
      : 'unsupported';

  return {
    canInstall: Boolean(installPrompt) || (isIos && !isStandalone),
    isStandalone,
    isIos,
    platform,
    offlineReady: hasServiceWorkerSupport() && offlineReady,
    needRefresh: hasServiceWorkerSupport() && needRefresh,
    registrationError,
    promptInstall,
    updateApp,
    dismissOfflineReady: () => setOfflineReady(false),
    dismissUpdate: () => setNeedRefresh(false),
  };
}
```

- [ ] **Step 3: Fix `Navigator.standalone` type if needed**

Run:

```bash
npm run lint
```

Expected: TypeScript may fail because `Navigator.standalone` is not in DOM types.

If it fails with a `Property 'standalone' does not exist on type 'Navigator'` error, add this block near the top of `src/pwa/usePwaInstall.ts`, after imports:

```typescript
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}
```

Then rerun:

```bash
npm run lint
```

Expected: TypeScript passes. The existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 4: Commit**

```bash
git add src/pwa/vite-pwa.d.ts src/pwa/usePwaInstall.ts
git commit -m "feat: track pwa install and update state"
```

---

## Task 4: Add Home-Screen PWA Affordance

**Files:**
- Create: `src/pwa/PwaHomeControl.tsx`
- Modify: `src/App.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Create PWA home control**

Create `src/pwa/PwaHomeControl.tsx` with this complete content:

```tsx
import React, { useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Share2, X } from 'lucide-react';
import { Button, Card, IconButton } from '../shared/ui';
import { usePwaInstall } from './usePwaInstall';

export interface PwaHomeControlProps {
  className?: string;
}

export function PwaHomeControl({ className }: PwaHomeControlProps) {
  const pwa = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (pwa.isStandalone && !pwa.needRefresh && !pwa.offlineReady && !pwa.registrationError) {
    return null;
  }

  const handleInstall = async () => {
    if (pwa.platform === 'chromium') {
      await pwa.promptInstall();
      return;
    }
    if (pwa.platform === 'ios') {
      setShowIosHelp(true);
    }
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {pwa.needRefresh && (
        <Card className="max-w-xs !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <RefreshCw size={18} className="mt-1 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-main">Nová verzia je pripravená.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => void pwa.updateApp()}>
                  Aktualizovať
                </Button>
                <Button size="sm" variant="quiet" onClick={pwa.dismissUpdate}>
                  Neskôr
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {pwa.offlineReady && !pwa.needRefresh && (
        <Card className="max-w-xs !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-1 shrink-0 text-green-600" />
            <p className="min-w-0 flex-1 text-sm font-bold text-text-main">Teo je pripravený aj offline.</p>
            <IconButton label="Zavrieť" onClick={pwa.dismissOfflineReady} className="!h-8 !w-8 !bg-shadow/10 !shadow-none">
              <X size={16} />
            </IconButton>
          </div>
        </Card>
      )}

      {pwa.canInstall && !pwa.needRefresh && (
        <div className="flex justify-end">
          <IconButton
            label="Pridať Teo"
            onClick={() => void handleInstall()}
            className="!h-12 !w-12 !bg-white/70 text-text-main !shadow-sm"
          >
            {pwa.platform === 'ios' ? <Share2 size={20} /> : <Download size={20} />}
          </IconButton>
        </div>
      )}

      {showIosHelp && (
        <Card className="max-w-xs !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <Share2 size={18} className="mt-1 shrink-0 text-accent-orange" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-main">Na iPhone otvorte Zdieľať a zvoľte Pridať na plochu.</p>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="mt-2 text-sm font-bold text-text-main/60 active:opacity-60"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </Card>
      )}

      {pwa.registrationError && (
        <Card className="max-w-xs !rounded-2xl !p-3 text-left !shadow-sm">
          <p className="text-sm font-bold text-primary">Offline režim sa nepodarilo pripraviť.</p>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount control on home screen**

In `src/App.tsx`, add the import:

```typescript
import { PwaHomeControl } from './pwa/PwaHomeControl';
```

In `HomeLauncher`, replace the single settings `IconButton` in the header with a parent-control stack:

```tsx
<div className="flex shrink-0 flex-col items-end gap-2">
  <IconButton
    label="Nastavenia"
    onClick={onOpenSettings}
    className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 !bg-shadow/20 !shadow-none hover:scale-105 active:scale-95 shrink-0 relative"
  >
    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-full blur-sm absolute" />
    <Settings size={28} className="sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-text-main opacity-80" />
  </IconButton>
  <PwaHomeControl />
</div>
```

Keep the existing settings button internals unchanged; only wrap it and add `PwaHomeControl`.

- [ ] **Step 3: Add UI kit examples**

In `src/shared/ui/UiKitScreen.tsx`, add imports:

```typescript
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
```

If these icons already exist in the import list, do not duplicate them.

Add this example block in the "Surfaces" section after the small action examples:

```tsx
<div className="grid gap-3 md:grid-cols-3">
  <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
    <div className="flex items-center gap-2">
      <Download size={18} className="text-text-main/70" />
      <p className="text-sm font-bold text-text-main">Pridať Teo</p>
    </div>
  </Card>
  <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
    <div className="flex items-center gap-2">
      <CheckCircle2 size={18} className="text-green-600" />
      <p className="text-sm font-bold text-text-main">Teo je pripravený aj offline.</p>
    </div>
  </Card>
  <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
    <div className="flex items-center gap-2">
      <RefreshCw size={18} className="text-primary" />
      <p className="text-sm font-bold text-text-main">Nová verzia je pripravená.</p>
    </div>
  </Card>
</div>
```

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript passes. The existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 5: Commit**

```bash
git add src/pwa/PwaHomeControl.tsx src/App.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "feat: add parent pwa home control"
```

---

## Task 5: Add HTML Metadata And Verify Production PWA Output

**Files:**
- Modify: `index.html`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Add HTML metadata**

Modify the `<head>` in `index.html` so it contains:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#F53D4C" />
<meta name="apple-mobile-web-app-title" content="Teo" />
<meta name="mobile-web-app-capable" content="yes" />
<link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
<title>Teo Learn</title>
```

Do not add `apple-mobile-web-app-capable` in this task; prefer the manifest and current mobile browser behavior.

- [ ] **Step 2: Build production output**

Run:

```bash
npm run build
```

Expected output:

- Vite build succeeds.
- `dist/manifest.webmanifest` exists.
- `dist/sw.js` exists.
- `dist/workbox-*.js` exists.
- Existing large chunk warning may remain.

- [ ] **Step 3: Inspect generated manifest**

Run:

```bash
node -e "const fs=require('fs'); const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8')); console.log(JSON.stringify({name:manifest.name, short_name:manifest.short_name, start_url:manifest.start_url, scope:manifest.scope, display:manifest.display, icons:manifest.icons.map(i=>i.src)}, null, 2));"
```

Expected output includes:

```json
{
  "name": "Teo Learn",
  "short_name": "Teo",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "icons": [
    "pwa/pwa-192x192.png",
    "pwa/pwa-512x512.png",
    "pwa/pwa-maskable-512x512.png"
  ]
}
```

If icon paths are emitted without a leading slash, that is acceptable as long as they resolve under `/pwa/` in the built app.

- [ ] **Step 4: Inspect service worker precache coverage**

Run:

```bash
node -e "const fs=require('fs'); const sw=fs.readFileSync('dist/sw.js','utf8'); for (const needle of ['audio/sk/words', 'audio/sk/praise', 'fonts/fredoka', 'pwa/pwa-512x512.png']) { if (!sw.includes(needle)) throw new Error('Missing precache entry: '+needle); } console.log('service worker precache coverage looks OK for locale-prefixed audio');"
```

Expected output:

```text
service worker precache coverage looks OK for locale-prefixed audio
```

- [ ] **Step 5: Preview production build**

Run:

```bash
npm run preview -- --host 0.0.0.0
```

Keep the server running for the next steps. If port `4173` is occupied, Vite will print the actual port; use that port for Playwright.

- [ ] **Step 6: Browser smoke home and games**

With preview running on `http://localhost:4173`, run:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' }); const manifestHref = await page.locator('link[rel=\"manifest\"]').getAttribute('href'); const hasInstallLabel = await page.getByLabel('Pridať Teo').count(); await page.goto('http://localhost:4173/words', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Hrať' }).click(); await page.waitForTimeout(800); const wordsText = await page.locator('body').innerText(); await browser.close(); console.log(JSON.stringify({ errors, manifestHref, hasInstallLabel, wordsText: wordsText.slice(0, 120) }, null, 2)); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected:

- `errors` is `[]`.
- `manifestHref` is present.
- `/words` starts a first round.

If Chromium fails with a macOS `MachPortRendezvous` sandbox error, rerun the same command outside the sandbox with approval.

- [ ] **Step 7: Manual mobile verification checklist**

Record these manual checks in the PR or final implementation notes:

```markdown
Manual mobile verification needed:
- Android/Chrome: install prompt appears or browser install menu works.
- Android/Chrome: installed app launches standalone at `/`.
- Android/Chrome: after first load, `/words`, `/syllables`, and built-in audio work in airplane mode.
- iOS/Safari: Share -> Add to Home Screen uses Teo name and icon.
- iOS/Safari: installed app launches without obvious browser chrome.
- iOS/Safari: update prompt does not interrupt active game routes.
```

- [ ] **Step 8: Update roadmap**

In `ROADMAP.md`, add a checked item near the current PWA/mobile/app delivery area. If no exact section exists, add under the current next-launch or platform-readiness section:

```markdown
- [x] Add installable PWA support for mobile with offline core games
```

- [ ] **Step 9: Commit**

Stop the preview server, then commit:

```bash
git add index.html ROADMAP.md
git commit -m "feat: verify installable pwa output"
```

---

## Final Verification

- [ ] **Step 1: Run static checks**

Run:

```bash
npx tsx src/pwa/pwaConfig.verify.ts
npm run lint
npm run build
npm run test:audio
```

Expected:

- `pwaConfig checks passed`
- `npm run lint` passes with only the known Fast Refresh warning if it remains.
- `npm run build` succeeds and emits `manifest.webmanifest` plus `sw.js`.
- `npm run test:audio` passes all categories.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: only unrelated local `.claude/settings.local.json` and `.codex/` may remain dirty; no uncommitted PWA implementation files.

---

## Self-Review Checklist

- Spec coverage:
  - Installability: Tasks 1, 2, and 5.
  - Temporary Teo branding: Tasks 1 and 2.
  - Offline core games and built-in audio: Tasks 1 and 5.
  - Parent-controlled updates: Tasks 3 and 4.
  - Home-only parent affordance: Task 4.
  - iOS guidance: Task 4 and Task 5 manual checks.
  - Rebrand readiness: Task 1 central config.

- Placeholder scan:
  - Search for unfinished-marker words and vague implementation phrases; none should remain in implementation steps.

- Type consistency:
  - `pwaManifest`, `pwaPluginOptions`, `pwaBrand`, and `pwaIcons` are defined in Task 1 before being used elsewhere.
  - `usePwaInstall` returns every property consumed by `PwaHomeControl`.
  - Manifest icon paths match generated files in `public/pwa/`.
