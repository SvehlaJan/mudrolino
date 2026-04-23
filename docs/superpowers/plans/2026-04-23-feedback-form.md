# Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a parent-facing feedback form to all settings screens that submits structured reports (category + optional message + auto-collected metadata) to the developer via email using the Web3Forms free API.

**Architecture:** A self-contained `FeedbackModal` component manages all form state (idle/submitting/success/error) and delegates network calls to `feedbackService`. A new card at the bottom of `SettingsContent` triggers the modal in every settings context (main settings and all per-game overlays). Metadata is auto-collected at submit time from `navigator` and `window`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Web3Forms free API (plain `fetch`, no SDK)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/shared/services/feedbackService.ts` | Types, metadata collection, Web3Forms POST |
| Create | `src/shared/components/FeedbackModal.tsx` | Full-screen modal: category picker, textarea, states |
| Modify | `src/shared/components/SettingsContent.tsx` | Add feedback card + mount FeedbackModal |
| Modify | `.env.example` | Document `VITE_WEB3FORMS_KEY` |

---

## Task 1: feedbackService — types and API call

**Files:**
- Create: `src/shared/services/feedbackService.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create `src/shared/services/feedbackService.ts`**

```typescript
export type FeedbackCategory = 'bug' | 'suggestion' | 'praise' | 'other';

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  screen: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Chyba v hre',
  suggestion: 'Nápad / návrh',
  praise: 'Pochvala',
  other: 'Iné',
};

function parseBrowser(ua: string): string {
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/)?.[0] ?? 'Unknown browser';
  const os = ua.match(/\(([^)]+)\)/)?.[1].split(';')[0].trim() ?? 'Unknown OS';
  return `${browser} / ${os}`;
}

function collectMetadata(screen: string) {
  return {
    screen,
    browser: parseBrowser(navigator.userAgent),
    language: navigator.language,
    screen_size: `${window.innerWidth}×${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  };
}

export function hasFeedbackKey(): boolean {
  return Boolean(import.meta.env.VITE_WEB3FORMS_KEY);
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const key = import.meta.env.VITE_WEB3FORMS_KEY as string;
  const metadata = collectMetadata(payload.screen);

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: key,
      subject: `Spätná väzba: ${CATEGORY_LABELS[payload.category]}`,
      from_name: 'Hravé Učenie',
      category: CATEGORY_LABELS[payload.category],
      message: payload.message || '(žiadna správa)',
      ...metadata,
    }),
  });

  if (!res.ok) throw new Error(`Web3Forms responded with ${res.status}`);
}
```

- [ ] **Step 2: Add env var to `.env.example`**

Append to the end of `.env.example`:

```
# Web3Forms access key for the parent feedback form.
# Get a free key at https://web3forms.com — 250 submissions/month on the free plan.
VITE_WEB3FORMS_KEY=your_key_here
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/services/feedbackService.ts .env.example
git commit -m "feat: add feedbackService with Web3Forms API integration"
```

---

## Task 2: FeedbackModal component

**Files:**
- Create: `src/shared/components/FeedbackModal.tsx`

- [ ] **Step 1: Create `src/shared/components/FeedbackModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackPayload,
  submitFeedback,
} from '../services/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: string;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = 100;

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug',        label: 'Chyba v hre',   emoji: '🐛' },
  { value: 'suggestion', label: 'Nápad / návrh',  emoji: '💡' },
  { value: 'praise',     label: 'Pochvala',        emoji: '⭐' },
  { value: 'other',      label: 'Iné',             emoji: '💬' },
];

export function FeedbackModal({ isOpen, onClose, screen }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');

  useEffect(() => {
    if (formState !== 'success') return;
    const id = setTimeout(() => {
      resetAndClose();
    }, 3000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  if (!isOpen) return null;

  function resetAndClose() {
    setCategory(null);
    setMessage('');
    setFormState('idle');
    onClose();
  }

  async function handleSubmit() {
    if (!category) return;
    setFormState('submitting');
    try {
      const payload: FeedbackPayload = { category, message, screen };
      await submitFeedback(payload);
      setFormState('success');
    } catch {
      setFormState('error');
    }
  }

  const remaining = MAX_LENGTH - message.length;
  const canSubmit = category !== null && formState === 'idle';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-light px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col">

        {/* Top bar */}
        <div className="mb-4 flex items-center">
          <button
            onClick={resetAndClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold sm:text-5xl">Spätná väzba</h2>
          <p className="mt-2 text-base font-medium opacity-60 sm:text-xl">
            Vaša správa nám pomôže zlepšiť Hravé Učenie
          </p>
        </div>

        {formState === 'success' ? (
          /* ── Success state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <span className="text-6xl">🎉</span>
            <h3 className="text-2xl font-bold sm:text-3xl">Ďakujeme!</h3>
            <p className="max-w-xs text-base font-medium opacity-60 sm:text-lg">
              Vaša správa bola odoslaná. Snažíme sa odpovedať do 48 hodín.
            </p>
            <button
              onClick={resetAndClose}
              className="mt-2 rounded-2xl bg-[#8b5cf6] px-8 py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed"
            >
              Zavrieť
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="flex-1 space-y-4 overflow-y-auto">

            {/* Category selector */}
            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
              <h3 className="text-xl font-bold sm:text-2xl">Typ správy</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    disabled={formState === 'submitting'}
                    className={`rounded-2xl py-4 text-base font-bold transition-all sm:text-lg ${
                      category === value
                        ? 'scale-105 bg-[#8b5cf6] text-white shadow-block'
                        : 'bg-bg-light text-text-main opacity-70'
                    }`}
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Message textarea */}
            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
              <h3 className="text-xl font-bold sm:text-2xl">Vaša správa</h3>
              <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">Voliteľné</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                disabled={formState === 'submitting'}
                placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
                rows={4}
                className="mt-4 w-full resize-none rounded-2xl border border-shadow/15 bg-bg-light/35 p-4 text-base font-medium placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40"
              />
              <div className="mt-2 flex items-center justify-between text-sm font-medium opacity-55">
                <span>
                  Pre snímku obrazovky napíšte na{' '}
                  <span className="text-[#8b5cf6]">jan.svehla@pm.me</span>
                </span>
                {remaining <= COUNTER_THRESHOLD && (
                  <span className={remaining <= 20 ? 'text-red-500 opacity-100' : ''}>
                    {remaining}
                  </span>
                )}
              </div>
            </section>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-xl font-bold text-white transition-all ${
                canSubmit
                  ? 'bg-[#8b5cf6] shadow-block active:translate-y-2 active:shadow-block-pressed'
                  : 'bg-[#8b5cf6]/40'
              }`}
            >
              {formState === 'submitting' ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                <>
                  <Send size={20} />
                  Odoslať
                </>
              )}
            </button>

            {formState === 'error' && (
              <p className="text-center text-sm font-medium text-red-500">
                Odosielanie zlyhalo. Skúste znova.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/FeedbackModal.tsx
git commit -m "feat: add FeedbackModal component"
```

---

## Task 3: Wire FeedbackModal into SettingsContent

**Files:**
- Modify: `src/shared/components/SettingsContent.tsx`

- [ ] **Step 1: Update imports**

Replace the existing React import line (line 6):

```tsx
import React, { useState } from 'react';
```

Replace the existing `lucide-react` import line (line 7) to add `MessageSquare`:

```tsx
import { Languages, MessageSquare, Mic, Music } from 'lucide-react';
```

Add after the `SettingToggle` import:

```tsx
import { FeedbackModal } from './FeedbackModal';
import { hasFeedbackKey } from '../services/feedbackService';
```

- [ ] **Step 2: Add `isFeedbackOpen` state inside `SettingsContent`**

Inside the `SettingsContent` function body, add this line just before the `return` statement:

```tsx
const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
```

- [ ] **Step 3: Add the feedback card and modal at the end of the scrollable `<div>`**

The scrollable content `<div>` in `SettingsContent` currently ends with the `{visibility.countingRange && !isHome && ...}` block. Append the following two blocks immediately before the closing `</div>` of that container:

```tsx
      {hasFeedbackKey() && (
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#8b5cf6]/20 text-text-main sm:h-16 sm:w-16">
              <MessageSquare size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Spätná väzba</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Pomôžte nám zlepšiť aplikáciu
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#8b5cf6] py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed"
          >
            <MessageSquare size={24} />
            Odoslať spätnú väzbu
          </button>
        </section>
      )}

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        screen={target}
      />
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Smoke-test in browser**

```bash
# Add a placeholder key so hasFeedbackKey() returns true in dev
echo "VITE_WEB3FORMS_KEY=test" >> .env
npm run dev
```

Open http://localhost:3000 and verify:

1. Hold the parental gate button (3 s) to reach Rodičovská zóna
2. Scroll to the bottom — the "Spätná väzba" card is visible
3. Tap "Odoslať spätnú väzbu" — full-screen modal appears
4. Tap each category tile — active tile highlights purple, submit button becomes active
5. Type a message — character counter appears below 100 chars remaining, turns red below 20
6. Tap X — modal closes, reopening shows a reset form
7. Open any game (e.g. Abeceda), tap the settings gear icon, scroll to bottom — same card appears with the game's `target` value (check console / network tab to confirm `screen` will be e.g. `"alphabet"`)

> With `VITE_WEB3FORMS_KEY=test` the submit will fail (error state is expected). Full end-to-end is tested in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/SettingsContent.tsx
git commit -m "feat: wire FeedbackModal into SettingsContent"
```

---

## Task 4: Web3Forms account setup and end-to-end test

This task is manual — no code changes.

- [ ] **Step 1: Create a Web3Forms account**

Go to https://web3forms.com, sign up with `jan.svehla@pm.me` (free tier, no credit card).

- [ ] **Step 2: Generate an access key**

In the Web3Forms dashboard, create a new form, copy the access key.

- [ ] **Step 3: Set the real key in `.env`**

Replace the placeholder in `.env` (added during smoke-test) with the real key:

```bash
# Edit .env directly — replace the test value:
# VITE_WEB3FORMS_KEY=test  →  VITE_WEB3FORMS_KEY=<your_real_key>
```

Restart the dev server after editing `.env`:

```bash
npm run dev
```

- [ ] **Step 4: End-to-end test**

1. Open settings, tap "Odoslať spätnú väzbu"
2. Select "Chyba v hre", type a short message, tap Odoslať
3. Verify the "Ďakujeme!" success screen appears
4. Wait 3 seconds — verify the modal auto-closes back to settings
5. Check `jan.svehla@pm.me` — confirm an email arrives from Web3Forms containing all fields (category, message, screen, browser, language, screen_size, timestamp)

- [ ] **Step 5: Commit .env.example if not already done**

```bash
git status
# If .env.example shows modified:
git add .env.example
git commit -m "chore: document VITE_WEB3FORMS_KEY in .env.example"
```
