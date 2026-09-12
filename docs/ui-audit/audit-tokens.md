# Visual Inconsistency Audit — `teo-learn`

**Scope:** `src/` (115 `.ts`/`.tsx` files, 14,024 lines) + `src/index.css`
**Branch:** `ui-polish-audit` · **Stack:** Tailwind v4.1.14, React 19
**Method:** ripgrep census (all counts are actual `rg` output, not estimates). Read-only — no files modified.

### The one-paragraph version

The design system exists but is **not load-bearing**. `src/shared/ui/tokens.ts` defines 7 tokens; only 1–2 call sites use each. Of 174 border-radius usages, 38% are arbitrary pixel values — and the single most common arbitrary value (`rounded-[24px]`, 12×) is *byte-for-byte identical* to `rounded-3xl`, which is also used 12×. The `surface` color token is declared in `@theme` and used **zero** times while 83 hardcoded `white` classes stand in for it. And 141 `!important` modifiers are the visible scar tissue of primitives (`Card`, `Button`) whose APIs expose color but not radius, padding, or elevation.

Relevant convention being violated — `AGENTS.md`: *"Use shared UI primitives before writing one-off Tailwind strings."*

---

## 1. Border radius sprawl

### Headline: **14 distinct radius values across 174 usages. 11 of the 14 are arbitrary `[Npx]` values, accounting for 66 usages (38%).**

| Value | Count | Tailwind equivalent | Example |
|---|---|---|---|
| `rounded-full` | 46 | — (legit) | `src/shared/ui/tokens.ts:15` |
| `rounded-2xl` | 38 | 1rem / 16px | `src/shared/ui/Button.tsx:52` |
| `rounded-xl` | 12 | 0.75rem / 12px | `src/content/CustomContentScreen.tsx:451` |
| **`rounded-[24px]`** | **12** | **≡ `rounded-3xl` exactly** | `src/shared/ui/tokens.ts:21` |
| `rounded-3xl` | 12 | 1.5rem / 24px | `src/games/complete-syllable/CompleteSyllableGame.tsx:337` |
| `rounded-[28px]` | 11 | — (no scale step) | `src/shared/ui/tokens.ts:17` |
| **`rounded-[32px]`** | **9** | **≡ `rounded-4xl` exactly** | `src/shared/ui/Card.tsx:21` |
| `rounded-[20px]` | 9 | — | `src/shared/components/SettingsContent.tsx:89` |
| `rounded-[48px]` | 6 | — | `src/shared/ui/OverlayFrame.tsx:102` |
| `rounded-[36px]` | 6 | — | `src/games/assembly/AssemblyGame.tsx:562` |
| `rounded-[22px]` | 4 | — | `src/shared/ui/ChoiceTile.tsx:28` |
| `rounded-[44px]` | 3 | — | `src/shared/ui/PromptBadge.tsx:35` |
| `rounded-[30px]` | 3 | — | `src/games/counting/CountingItemsGame.tsx:173` |
| `rounded-[40px]` | 2 | — | `src/shared/ui/Card.tsx:21` |
| `rounded-[18px]` | 1 | — | `src/App.tsx:85` |

### Exact-duplicate pairs (Tailwind v4 scale)

- `rounded-[24px]` (12×) **is the same rendered value as** `rounded-3xl` (12×). 24 usages of one radius, spelled two different ways, split down the middle.
- `rounded-[32px]` (9×) **is the same rendered value as** `rounded-4xl`. The 4xl step is never used.

### Near-duplicate clusters (values within 2–4px of each other, no perceptual difference)

- **18 / 20 / 22 / 24px** → 26 usages of what is visually one radius. `src/App.tsx:85` (`rounded-[18px]`), `src/shared/components/SettingsContent.tsx:89` (`rounded-[20px]`), `src/shared/ui/ChoiceTile.tsx:28` (`rounded-[22px]`), `src/shared/ui/tokens.ts:21` (`rounded-[24px]`).
- **28 / 30 / 32px** → 23 usages. `src/shared/ui/tokens.ts:17`, `src/App.tsx:84`, `src/shared/ui/Card.tsx:21`.
- **36 / 40 / 44 / 48px** → 17 usages. `src/games/assembly/AssemblyGame.tsx:562`, `src/shared/ui/tokens.ts:19`, `src/shared/ui/PromptBadge.tsx:35`, `src/shared/ui/OverlayFrame.tsx:102`.

### The "what is a modal?" problem

Three components all render a centered dismissible panel, with three different radii:

| Component | Radius | file:line |
|---|---|---|
| `Card variant="modal"` | `rounded-[32px] sm:rounded-[40px]` | `src/shared/ui/Card.tsx:21` |
| `OverlayFrame` panel | `rounded-[48px]` | `src/shared/ui/OverlayFrame.tsx:102` |
| `OverlayFrame` inline | `rounded-[32px]` | `src/shared/ui/OverlayFrame.tsx:93` |

A child moving from a settings modal to a success overlay sees the corner radius change by 16px.

### Responsive radius step-ups are inconsistent

The `base → sm:` delta is different everywhere: `+6px` (`22→28`, ChoiceTile:28), `+6px` (`24→30`, App.tsx:84), `+4px` (`28→32`, AssemblyGame:140), `+8px` (`24→32`, AdditionGame:305), `+8px` (`32→40`, Card:21), `+12px` (`36→48`, AssemblyGame:562), `+14px` (`30→44`, CountingItemsGame:173), `+16px` (`28→44`, PromptBadge:35).

### What this costs

Corner radius is the single strongest carrier of "brand feel" in a rounded, kid-friendly UI. With 14 values there is no perceived radius language — surfaces read as assembled from unrelated kits. It is also the top driver of `!important` (27 `!rounded-*` overrides, §7), because `Card` hardcodes a radius its callers constantly disagree with. Any radius change today is a 30-file find-and-replace instead of one token edit.

---

## 2. Shadow sprawl

### Headline: **81 shadow usages, 16 distinct values. Only 55 (68%) use the named system; 21 use stock Tailwind shadows and 5 are inline arbitrary. Stock `shadow-sm` (18×) is used more than the house `shadow-chip` (13×).**

| Value | Count | Kind | Example |
|---|---|---|---|
| `shadow-block` (+`!shadow-block` 9) | 22 | ✅ named | `src/shared/ui/Button.tsx:21` |
| `shadow-sm` (+`!shadow-sm` 9) | **18** | ❌ stock Tailwind | `src/pwa/PwaHomeControl.tsx:34` |
| `shadow-chip` | 13 | ✅ named | `src/avatar/AvatarPreviewScreen.tsx:272` |
| `shadow-none` (+`!shadow-none` 7) | 10 | ⚠️ cancelling a primitive | `src/games/counting/CountingItemsGame.tsx:173` |
| `shadow-block-pressed` | 5 | ✅ named | `src/shared/ui/tokens.ts:23` |
| `shadow-block-correct` | 3 | ✅ named | `src/shared/components/ParentsGate.tsx:149` |
| `shadow-md` | 2 | ❌ stock Tailwind | `src/shared/ui/FormControls.tsx:67` |
| `shadow-modal` | 2 | ✅ named | `src/shared/ui/Card.tsx:21` |
| `shadow-[0_8px_0_#f0c99a,0_20px_60px_rgba(0,0,0,.10)]` | 2 | ❌ arbitrary + hex | `src/shared/components/SuccessOverlay.tsx:66` |
| `shadow-lg` | 1 | ❌ stock Tailwind | `src/App.tsx:85` |
| `shadow-[0_8px_0_#b0c0f0,0_20px_60px_rgba(0,0,0,.15)]` | 1 | ❌ arbitrary + hex | `src/shared/components/FailureOverlay.tsx:50` |
| `shadow-[0_12px_28px_rgba(93,69,62,0.06)]` | 1 | ❌ arbitrary **inside the token file** | `src/shared/ui/tokens.ts:17` |
| `!shadow-[0_2px_8px_rgba(0,0,0,.10)]` | 1 | ❌ arbitrary | `src/shared/components/SuccessOverlay.tsx:71` |

### Specific offenders

1. **`src/shared/ui/tokens.ts:17`** — the `card` token itself uses an arbitrary shadow (`shadow-[0_12px_28px_rgba(93,69,62,0.06)]`) instead of one of the five named shadow classes it sits next to. This is the design system leaking its own abstraction.
2. **`src/shared/components/SuccessOverlay.tsx:66`, `FailureOverlay.tsx:50`, `SessionCompleteOverlay.tsx:70`** — the three celebration overlays use hand-rolled `0_8px_0_<hex>` shadows. These are *exactly* the shape of `shadow-block` (`0px 5px 0px var(--color-shadow)`), re-derived with different offsets and hardcoded tint colors.
3. **`shadow-none` (10×)** is the tell that `Card`/`ChoiceTile` force elevation callers don't want — see `src/games/counting/CountingItemsGame.tsx:173` and `src/shared/ui/UiKitScreen.tsx:318`.
4. **`src/shared/ui/FormControls.tsx:67`** — the toggle knob uses `shadow-md`. It's the only knob in the app, so it silently sits outside the elevation language.

### What this costs

The app has a deliberate "chunky offset block" shadow identity (`0px 5px 0px`) — a flat, playful, solid drop that reads as physical and tactile. `shadow-sm`/`shadow-md`/`shadow-lg` are Tailwind's soft blurred Material-style shadows. Mixing them means 21 elements render in a visually foreign elevation style. On the home screen this is visible in a single glance: `src/App.tsx:84` game cards use `shadow-sm` while their own icon tiles at `:85` use `shadow-lg` — two stock shadows on nested elements, neither matching the system.

---

## 3. Hardcoded colors

### Headline: **`surface` is declared in `@theme` and used ZERO times. 83 hardcoded `white` classes, 38 stock-palette classes, 24 hex literals, 8 `rgba()` literals — 153 color values bypassing the token layer.**

```
$ rg -n -- '-surface' src | grep -v index.css
  >>> ZERO usages of the surface token outside @theme
```

`--color-surface: #FFFFFF` at `src/index.css:70` is dead. Every surface in the app is painted with Tailwind's built-in `white` instead.

### 3a. White (83 usages, 15 distinct opacities)

| Value | Count | | Value | Count |
|---|---|---|---|---|
| `bg-white` | 29 | | `bg-white/70` | 3 |
| `text-white` | 24 | | `fill-white` | 2 |
| `bg-white/50` | 6 | | `border-white` | 2 |
| `border-white/80` | 3 | | `border-white/70` | 1 |
| `border-white/30` | 3 | | `bg-white/95` | 1 |
| `bg-white/90` | 3 | | `bg-white/85` | 1 |
| `bg-white/80` | 3 | | `bg-white/65` | 1, `bg-white/20` 1 |

**Eight distinct `bg-white/NN` opacities** (20/50/65/70/80/85/90/95) — no ladder, just whatever looked right in the moment. Top files: `src/avatar/AvatarPreviewScreen.tsx` (12), `src/shared/ui/UiKitScreen.tsx` (5), `src/games/complete-letter/CompleteLetterGame.tsx` (4), `src/shared/ui/tokens.ts` (3), `src/shared/ui/FormControls.tsx` (3).

Near-duplicates that will never be told apart: `bg-white/80` (3×, `src/games/complete-syllable/CompleteSyllableGame.tsx:337`) vs `bg-white/85` (1×, `src/avatar/AvatarPreviewScreen.tsx:529`) vs `bg-white/90` (3×, `src/shared/ui/tokens.ts:17`).

### 3b. Hex literals in TS/TSX (24)

| Hex | Count | Where | Note |
|---|---|---|---|
| `#3a4a8a` | 3 | `src/shared/components/FailureOverlay.tsx:55`, `UiKitScreen.tsx:415` | failure heading color |
| `#c06a00` | 3 | `src/shared/components/SessionCompleteOverlay.tsx` | success heading color |
| `#5566aa` | 2 | `src/shared/components/FailureOverlay.tsx:58` | failure body color |
| `#fff8f0` / `#ffecd2` | 2 / 2 | `SuccessOverlay.tsx:66`, `SessionCompleteOverlay.tsx:70` | gradient stops |
| `#f0c99a` | 2 | `SuccessOverlay.tsx:66` | shadow tint |
| `#eef2ff` / `#dde6ff` / `#b0c0f0` | 1 each | `FailureOverlay.tsx:50` | gradient + shadow |
| `#1e2a4a` | 1 | `src/shared/ui/OverlayFrame.tsx:95` | failure backdrop |
| `#aaa` / `#666` | 1 / 1 | `src/shared/components/SuccessOverlay.tsx:71` | close-button gray |
| `#ffcc00` / `#00e5ff` | 1 / 1 | `src/avatar/AvatarSkeletonOverlay.tsx` | debug-only, acceptable |
| `#F53D4C` / `#F4F1EA` | 1 / 1 | `src/pwa/pwaConfig.ts` | **duplicates `--color-primary` / `--color-bg-light` verbatim** |

**The overlay trio is an entire second palette.** `SuccessOverlay`, `FailureOverlay`, and `SessionCompleteOverlay` between them carry 10 hex literals, 4 `rgba()` literals, and 3 arbitrary gradients — none referencing `success`, `accent-blue`, `accent-orange`, or `primary`. These are the app's highest-emotion moments and they are the least connected to the brand.

`src/pwa/pwaConfig.ts` hardcodes `#F53D4C` and `#F4F1EA`, the exact values of `--color-primary` and `--color-bg-light`. A theme change updates the app but not the splash screen / status bar.

### 3c. Stock Tailwind palette (38 usages)

| File | Count | Worst offenders |
|---|---|---|
| `src/recordings/RecordingListItem.tsx` | 23 | `!bg-green-950/40 !border-green-600/50` (`:84`), `!bg-amber-950/30` (`:86`), `text-green-300/80` (`:117`) |
| `src/content/CustomContentScreen.tsx` | 8 | `border-amber-200 bg-amber-50 text-amber-700` (`:45`), `bg-green-50 text-green-700` (`:62`) |
| `src/shared/ui/UiKitScreen.tsx` | 3 | `bg-red-500` (`:78`), `text-green-600` (`:272`) |
| `src/shared/components/FeedbackModal.tsx` | 2 | `text-red-500` (`:138`, `:156`) |
| `src/shared/ui/IconMenuButton.tsx` | 1 | `text-red-500` for `tone === 'danger'` (`:155`) |
| `src/pwa/PwaHomeControl.tsx` | 1 | `text-green-600` (`:55`) |

`RecordingListItem.tsx` is effectively a **dark-themed island** (`-950/30`, `-950/40` backgrounds) inside a light, warm app. It uses saturated green/amber/pink/blue-950 while `success`, `accent-orange`, `soft-watermelon`, and `accent-blue` tokens sit unused.

There is no semantic token for `danger` / `warning` / `ok`, so each of the 6 files invented one: error text is `text-red-500` in three places and `text-red-400` in two.

### 3d. Other

- `bg-black/5` — 1 usage. Not a widespread problem here.
- `rgba()` literals: 8. Notably `rgba(0,0,0,.10)` ×3 and `rgba(93,69,62,0.06)` (a hand-written `--color-text-main` at 6%).
- Arbitrary gradients: 4, at `src/avatar/AvatarPreviewScreen.tsx:472`, `SuccessOverlay.tsx:66`, `FailureOverlay.tsx:50`, `SessionCompleteOverlay.tsx:70`.

### What this costs

Three of the ten `@theme` colors (`surface`, and effectively `accent-orange`/`soft-watermelon` in these files) are decorative rather than functional. The theme cannot be re-skinned — a dark mode, a seasonal palette, or a contrast-accessibility pass would miss 153 values. The `data-font="shantell"` swap at `src/index.css:60` proves the app *wants* to be themeable; the color layer can't follow.

---

## 4. Ad-hoc buttons and cards

### Headline: **30 raw `<button>` elements in app code vs 47 uses of `Button`/`IconButton`/`IconMenuButton` — 39% of all buttons bypass the primitives. Plus 4 ad-hoc `<div>` cards and 1 `<aside>` card.**

(6 further raw `<button>`s live inside `Button.tsx`, `IconButton.tsx`, `IconMenuButton.tsx`, `ChoiceTile.tsx`, and `FormControls.tsx` ×2 — those are correct and excluded.)

### Raw `<button>` by file

| File | Count |
|---|---|
| `src/avatar/AvatarPreviewScreen.tsx` | 11 |
| `src/content/CustomContentScreen.tsx` | 9 |
| `src/pwa/PwaHomeControl.tsx` | 2 |
| `src/App.tsx`, `src/games/assembly/AssemblyGame.tsx`, `src/games/counting/CountingItemsGame.tsx`, `src/recordings/RecordingListItem.tsx`, `src/shared/components/FindItGame.tsx`, `src/shared/components/SettingsContent.tsx`, `src/shared/components/SettingsOverlay.tsx`, `src/shared/ui/UiKitScreen.tsx` | 1 each |

### Highest-value replacements

| file:line | Current | Should be |
|---|---|---|
| `src/content/CustomContentScreen.tsx:449` | `flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80` | `<Button variant="danger" size="sm" fullWidth>` |
| `src/content/CustomContentScreen.tsx:455` | `flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80` | `<Button variant="quiet" size="sm" fullWidth>` |
| `src/content/CustomContentScreen.tsx:737` / `:743` | byte-identical duplicates of `:449` / `:455` | same — literal copy-paste |
| `src/content/CustomContentScreen.tsx:363` / `:659` | `rounded-2xl bg-shadow/10 py-3 text-lg font-semibold text-text-main/70` | identical pair — `<Button variant="quiet">` |
| `src/content/CustomContentScreen.tsx:464` / `:752` | `rounded-2xl border-2 border-dashed border-shadow/25 py-3 …` | identical pair — needs a `Button variant="dashed"` |
| `src/shared/components/FindItGame.tsx:212` | `px-6 py-3 bg-primary text-white rounded-2xl font-bold text-lg` | `<Button variant="danger">` — re-derives the exact danger variant |
| `src/avatar/AvatarPreviewScreen.tsx:256` | `h-12 w-12 … rounded-full bg-white text-text-main shadow-chip … sm:h-14 sm:w-14` | `<IconButton>` — this **manually reimplements `uiTokens.iconButton`** but swaps `shadow-block`→`shadow-chip` and `active:translate-y-1`→`active:scale-95` |
| `src/avatar/AvatarPreviewScreen.tsx:438` / `:448` / `:456` | `rounded-2xl bg-{success,white,primary} px-4 py-3 font-black text-white shadow-chip` | `<Button variant={…}>` ×3 |
| `src/avatar/AvatarPreviewScreen.tsx:498` / `:509` | `h-10 w-10 rounded-full bg-white/90 shadow-chip` | `<IconButton>` |
| `src/recordings/RecordingListItem.tsx:157` | `w-7 h-7 rounded-full bg-red-500` | `<IconButton>` + a `danger` token |
| `src/App.tsx:78` | game card wrapper with hand-rolled hover/press | acceptable as a card link, but its inner `:84` div is a `<Card>` |

`src/avatar/AvatarPreviewScreen.tsx:256` is the clearest case: it produces a *visually different* back button from every other screen's `IconButton` — soft `shadow-chip` instead of the chunky `shadow-block`, and a scale press instead of the system's translate-down press. Same control, two physics.

### Ad-hoc card blocks

| file:line | Current | Should be |
|---|---|---|
| `src/avatar/AvatarPreviewScreen.tsx:471` | `<div className="min-h-[520px] rounded-[24px] bg-white p-4 shadow-chip sm:p-5">` | `<Card>` |
| `src/avatar/AvatarPreviewScreen.tsx:558` | `<div className="rounded-[24px] bg-white p-5 shadow-chip">` | `<Card>` |
| `src/avatar/AvatarPreviewScreen.tsx:272` | `<aside className="rounded-[24px] bg-white p-5 shadow-chip …">` | `<Card as="aside">` |
| `src/avatar/AvatarPreviewScreen.tsx:529` | `<div className="max-w-sm rounded-2xl bg-white/85 p-5 shadow-chip">` | `<Card>` |
| `src/avatar/AvatarPreviewScreen.tsx:540` | `<div className="max-w-sm rounded-2xl bg-white/80 p-5 shadow-chip">` | `<Card>` — note `/85` vs `/80` on two adjacent sibling cards |
| `src/App.tsx:84` | `<div className="relative h-full bg-white rounded-[24px] sm:rounded-[30px] p-4 sm:p-5 lg:p-6 … shadow-sm">` | `<Card>` |
| `src/pwa/PwaHomeControl.tsx:68` | `<button className="w-full rounded-2xl bg-white/95 p-3 … shadow-md ring-1 ring-shadow/10">` | `<Card as="button">` — sits 3 lines from four real `<Card>` uses |

`src/pwa/PwaHomeControl.tsx` is the sharpest example of the cost: lines 34, 53, 86, 111 use `<Card className="!rounded-2xl !p-3 !shadow-sm">` while line 68 hand-rolls the same visual as a raw `<button>` — because `Card` can't be a button. Five sibling rows, two implementations.

### What this costs

Primitives only pay off at high adoption. At 61% they guarantee drift instead of preventing it: every future change to press feedback, focus ring, or disabled state must be made in 30 places or it becomes an inconsistency. `AvatarPreviewScreen.tsx` and `CustomContentScreen.tsx` alone hold 20 of the 30 — two files carry two-thirds of the debt.

---

## 5. Typography scale

### Headline: **36 distinct font-size values — 12 Tailwind steps, 16 distinct `clamp()` expressions (in only 23 usages), and 8 one-off `text-[Npx/rem]`.**

A near-1:1 ratio of distinct clamp expressions to clamp usages means **each clamp was written for its call site rather than drawn from a scale**.

### Tailwind scale steps (12 distinct, 269 usages)

`text-sm` 49 · `text-2xl` 33 · `text-xl` 32 · `text-lg` 29 · `text-xs` 28 · `text-base` 20 · `text-6xl` 18 · `text-5xl` 17 · `text-3xl` 16 · `text-4xl` 15 · `text-7xl` 12 · `text-8xl` 2

### The 16 clamp expressions

| Expression | Uses | file:line |
|---|---|---|
| `clamp(1.35rem,5vw,2.7rem)` | 4 | `src/games/complete-letter/CompleteLetterGame.tsx:40-43` |
| `clamp(2.25rem,7vw,5rem)` | 3 | `alphabetDescriptor.tsx:24`, `numbersDescriptor.tsx:24`, `syllablesDescriptor.tsx:24` ✅ *the one shared value* |
| `clamp(2.35rem,10vw,5.25rem)` | 2 | `CompleteLetterGame.tsx:390`, `CompleteSyllableGame.tsx:359` |
| `clamp(1.75rem,6vw,3.5rem)` | 2 | `CompleteSyllableGame.tsx:337-338` |
| `clamp(4.5rem,18vw,9rem)` | 1 | `src/games/complete-letter/CompleteLetterGame.tsx:367` |
| `clamp(3.75rem,14vw,7rem)` | 1 | `src/games/words/wordsDescriptor.tsx:20` |
| `clamp(2.75rem,12vw,6rem)` | 1 | `src/games/first-letter/FirstLetterGame.tsx:302` |
| `clamp(2.6rem,6vw,5.25rem)` | 1 | `src/App.tsx:58` |
| `clamp(2.5rem,min(8vw,14vh),6.5rem)` | 1 | `src/shared/components/GameLobby.tsx:74` |
| `clamp(2.5rem,9vw,5rem)` | 1 | `src/games/addition/AdditionGame.tsx:289` |
| `clamp(1.9rem,5.5vw,4rem)` | 1 | `src/games/words/wordsDescriptor.tsx:23` |
| `clamp(1.5rem,5vw,3rem)` | 1 | `src/games/complete-syllable/CompleteSyllableGame.tsx:332` |
| `clamp(1.45rem,3.1vw,2.4rem)` | 1 | `src/App.tsx:89` |
| `clamp(1.05rem,2.2vw,1.7rem)` | 1 | `src/App.tsx:59` |
| `clamp(1rem,min(2.5vw,3.5vh),1.7rem)` | 1 | `src/shared/components/GameLobby.tsx:78` |
| `clamp(0.92rem,1.65vw,1.2rem)` | 1 | `src/App.tsx:90` |

### Duplication across files with slightly different numbers

**Cluster A — "the letter/syllable tile glyph"** (same conceptual element, 4 values across 3 files):
- `clamp(1.35rem, 5vw, 2.7rem)` — `CompleteLetterGame.tsx:40`
- `clamp(1.5rem, 5vw, 3rem)` — `CompleteSyllableGame.tsx:332`
- `clamp(1.75rem, 6vw, 3.5rem)` — `CompleteSyllableGame.tsx:337`
- `clamp(1.9rem, 5.5vw, 4rem)` — `wordsDescriptor.tsx:23`

Four sibling games render the same kind of tile at four different type sizes with three different viewport slopes (5vw / 5.5vw / 6vw). Moving between games, the letters visibly resize.

**Cluster B — "the big prompt glyph"** (5 values, all within ~0.35rem at the low end):
- `clamp(2.25rem, 7vw, 5rem)` — the 3 grid descriptors
- `clamp(2.35rem, 10vw, 5.25rem)` — `CompleteLetterGame.tsx:390`
- `clamp(2.5rem, 9vw, 5rem)` — `AdditionGame.tsx:289`
- `clamp(2.5rem, min(8vw,14vh), 6.5rem)` — `GameLobby.tsx:74`
- `clamp(2.6rem, 6vw, 5.25rem)` — `App.tsx:58`

Five expressions, five different viewport slopes (6vw / 7vw / 8vw / 9vw / 10vw). They agree at some viewport widths and diverge at others — so the inconsistency is *intermittent*, which is the hardest kind to notice and fix.

**Cluster C — "the celebration emoji"** (3 values, no shared source):
- `text-[140px]` — `SuccessOverlay.tsx:75`, `FailureOverlay.tsx:52`
- `text-[160px]` — `SessionCompleteOverlay.tsx:72`
- `text-[80px]` — `SuccessOverlay.tsx:76`

Also non-responsive: `text-[160px]` is 160px on a 360px-wide phone.

### One-off arbitrary sizes (8)

`text-[160px]`, `text-[140px]` ×2, `text-[120px]`, `text-[112px]`, `text-[100px]` ×2, `text-[80px]`, `text-[72px]`, `text-[0.68rem]` (`src/recordings/RecordingListItem.tsx:144` — the only sub-`text-xs` size in the app).

### What this costs

36 sizes across a 9-screen app means there is no type scale, only type decisions. The cross-game tile-size drift (Cluster A) is the most user-visible: a preschooler moving between four sibling games sees the glyph they're asked to read change size each time, undermining the visual promise that these are the same activity in different flavors. Six of the clamps also use viewport-height (`vh`, `svh`) units inconsistently — `GameLobby.tsx:74` is the only place combining `min(vw, vh)`, so it's the only element that behaves correctly in landscape.

---

## 6. Spacing / padding inconsistency

### Headline: **The same conceptual component is padded differently in every file it appears in. The settings-row icon chip is copy-pasted verbatim 8 times. Only 1–2 call sites use each `uiTokens` spacing token.**

### 6a. `uiTokens` adoption — the root cause

```
pressable    2 usages
card         2 usages
panel        1 usage
insetPanel   1 usage
iconButton   1 usage
screenBg     1 usage
maxWidth     2 usages
```

Every token is consumed only by `Card.tsx` / `AppScreen.tsx` / `Button.tsx` themselves. **No feature file imports `uiTokens` directly** — so the moment a feature needs a variant the primitives don't offer, it hand-rolls the whole thing.

### 6b. Screen outer padding — two different systems

| Screen | Padding | file:line |
|---|---|---|
| `AppScreen` default (13 screens) | `px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5` | `src/shared/ui/tokens.ts:7` |
| Home screen | `p-4 pb-28 sm:p-6 sm:pb-32 lg:p-8` (overrides the token) | `src/App.tsx:54` |
| Avatar preview | `p-4 sm:p-6 lg:p-8` (doesn't use `AppScreen` at all) | `src/avatar/AvatarPreviewScreen.tsx:255` |
| Error boundary | `p-8` (flat, no responsive) | `src/shared/components/ErrorBoundary.tsx:30` |

Three screens use a `4/6/8` ladder at `sm/lg`; thirteen use a `3/4/6` ladder at `sm/md`. The `md` vs `lg` breakpoint disagreement means the gutter jumps at a different viewport width depending on which screen you're on.

### 6c. The settings row — 8 verbatim duplicates, 2 alignment modes

This exact 84-character string appears **8 times**:

```
flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] … text-text-main sm:h-16 sm:w-16
```

| file:line | icon background |
|---|---|
| `src/shared/components/SettingsContent.tsx:89, :120, :162, :230, :284, :409` (6×) | `bg-accent-blue/35` |
| `src/avatar/AvatarCustomizationSettings.tsx:26` | `bg-success/35` |
| `src/shared/ui/FormControls.tsx:38` | parameterized, defaults `bg-shadow/35` |

Three different default icon tints for the same row type. And the wrapper alignment disagrees:

- `flex items-start gap-4` — 6× (`SettingsContent.tsx:88, :118, :160, :228, :282, :407`)
- `flex w-full items-center justify-between gap-4` — `SettingsContent.tsx:85`
- `flex min-w-0 items-center gap-4` — `src/shared/ui/FormControls.tsx:33`

So a toggle row (`items-center`) and a select row (`items-start`) vertically align their icons differently in the same scrolling list.

### 6d. Card padding — the primitive is overridden 16 times

`Card` ships `p-5 sm:p-6` (`tokens.ts:17`). Callers override it to **six different values**:

| Override | Count | Example |
|---|---|---|
| `!p-3` | 8 | `src/pwa/PwaHomeControl.tsx:34, :53, :86, :111` |
| `!p-4` | 4 | `src/games/assembly/AssemblyGame.tsx:562, :580` |
| `!p-6` | 2 | `src/shared/ui/UiKitScreen.tsx:347` |
| `!p-5` | 1 | `src/games/counting/CountingItemsGame.tsx:173` (`sm:!p-5`) |
| `!p-0` | 1 | `src/shared/ui/UiKitScreen.tsx:318` |

`Card` has a `variant` prop but no `padding` prop — so 16 call sites reach for `!important` (§7).

### 6e. Modal chrome — three header/footer paddings

| Element | Padding | file:line |
|---|---|---|
| `SettingsOverlay` header | `p-3 sm:p-4 landscape:py-2` | `src/shared/components/SettingsOverlay.tsx:40` |
| `SettingsOverlay` footer | `p-2.5 sm:p-3 landscape:py-2` | `src/shared/components/SettingsOverlay.tsx:55` |
| `FeedbackModal` header | `mb-3 sm:mb-6 landscape:mb-2` (margin, not padding) | `src/shared/components/FeedbackModal.tsx:81` |
| `OverlayFrame` panel | `px-12 py-12 sm:px-20 sm:py-16` | `src/shared/ui/OverlayFrame.tsx:102` |
| `TopBar` | `pb-3 sm:pb-4` | `src/shared/ui/TopBar.tsx:20` |

`OverlayFrame` uses a 48–80px inset while `SettingsOverlay` uses 12–16px. Both are "a modal panel."

### 6f. Raw scale spread

- `p-*`: 9 distinct values (`p-0, p-1, p-2, p-2.5, p-3, p-4, p-5, p-6, p-8`) — 72 usages
- `py-*`: 11 distinct (`py-1, py-1.5, py-2, py-2.5, py-3, py-4, py-5, py-6, py-12, py-16`) — 110 usages
- `gap-*`: 9 distinct (`gap-1, 2, 3, 4, 5, 6, 8, 10, 14`) — 151 usages; `gap-2` (42), `gap-4` (39), `gap-3` (39) are near-tied, meaning the choice between them is arbitrary

### What this costs

Padding is what makes a UI feel "settled." With `Card` overridden 16 times and the settings row duplicated 8 times, a padding change is a manual sweep, and any missed site becomes a visible ragged edge in a vertical list — the single most noticeable form of unpolish. The `items-start` / `items-center` split in the settings list is visible *right now* without any change being made.

---

## 7. `!important` overrides

### Headline: **141 Tailwind important-modifiers across 17 files. `bg` (33), `rounded` (27), and `shadow` (26) account for 61% — exactly the three properties `Card` hardcodes and does not expose.**

### By property group

| Group | Count | Primitive being fought |
|---|---|---|
| `!bg-*` | 33 | `Card` (no `tone`/`surface` prop), `IconButton` (hardcoded `bg-white`) |
| `!rounded-*` | 27 | `Card` (radius baked into `variant`), `Button` (hardcoded `rounded-2xl`) |
| `!shadow-*` | 26 | `Card` (elevation baked into `variant`), `IconButton` |
| `!p-* / !px-* / !py-*` | 26 | `Card` (no `padding` prop), `Button` (no size between `sm` and `md`) |
| `!border-*` | 10 | `Card` (no `border` prop) |
| `!w-* / !h-*` | 12 | `IconButton` (fixed `w-12 h-12 sm:w-14 sm:h-14`) |
| `!aspect-*` | 6 | `ChoiceTile` (`shape` prop only offers `square`) |
| `!text-*` | 1 | — |

### By file

| File | Count |
|---|---|
| `src/shared/ui/UiKitScreen.tsx` | 44 |
| `src/pwa/PwaHomeControl.tsx` | 20 |
| `src/recordings/RecordingListItem.tsx` | 19 |
| `src/games/counting/CountingItemsGame.tsx` | 12 |
| `src/games/assembly/AssemblyGame.tsx` | 11 |
| `src/shared/ui/PromptBadge.tsx` | 7 |
| `src/shared/components/AuditoryPromptBadge.tsx` | 7 |
| `src/shared/ui/FormControls.tsx` | 4 |
| `src/shared/components/GameLobby.tsx` | 4 |
| 8 more files | 1–2 each |

**`UiKitScreen.tsx` having the most (44) is the strongest signal in this audit.** The page whose job is to *demonstrate* the design system cannot demonstrate it without overriding it 44 times. Every override there is a documented gap in a primitive's API.

### Most-repeated overrides

| Class | Count | Example |
|---|---|---|
| `!shadow-sm` | 9 | `src/pwa/PwaHomeControl.tsx:34` — "I want a Card but flatter" |
| `!shadow-block` | 9 | `src/shared/ui/PromptBadge.tsx:35` — "I want a Card but chunkier" |
| `!p-3` | 8 | `src/pwa/PwaHomeControl.tsx:34` |
| `!shadow-none` | 7 | `src/games/counting/CountingItemsGame.tsx:173` — "I want a Card with no shadow" |
| `!rounded-2xl` | 7 | `src/pwa/PwaHomeControl.tsx:34` |
| `!rounded-[48px]` | 5 | `src/games/assembly/AssemblyGame.tsx:562` |
| `!rounded-[36px]` | 5 | `src/games/assembly/AssemblyGame.tsx:562` |
| `!bg-white/50` | 4 | `src/games/counting/CountingItemsGame.tsx:173` |
| `!w-9` / `!h-9` | 4 / 4 | `src/recordings/RecordingListItem.tsx:121` — "I want a small IconButton" |

`!shadow-sm` (9) + `!shadow-block` (9) + `!shadow-none` (7) = **25 overrides that all say the same thing: `Card` needs an `elevation` prop.**

### Worst single lines

```
src/games/counting/CountingItemsGame.tsx:173
  !rounded-[30px] !border-4 !border-dashed !border-shadow/20 !bg-white/50 !p-3 sm:!p-5 !shadow-none sm:!rounded-[44px]
  → 9 overrides. Nothing of Card survives except the <div>.

src/shared/ui/UiKitScreen.tsx:318
  !rounded-[30px] !border-4 !border-dashed !border-shadow/20 !bg-white/50 !p-0 !shadow-none sm:!rounded-[44px]
  → same 9, copy-pasted into the kit demo. This is a missing `variant="dropzone"`.

src/shared/ui/PromptBadge.tsx:35
  !rounded-[28px] sm:!rounded-[44px] !px-6 !py-4 sm:!px-10 sm:!py-6 !shadow-block
  → 7 overrides, inside the UI kit, on Card.

src/games/assembly/AssemblyGame.tsx:562
  !rounded-[36px] !bg-white/70 !p-4 !shadow-block sm:!rounded-[48px] sm:!p-6
  → 6 overrides.

src/recordings/RecordingListItem.tsx:121
  '!h-9 !w-9 shrink-0 !shadow-sm active:translate-y-0 active:opacity-60 sm:!h-9 sm:!w-9'
  → IconButton needs a `size` prop; note `sm:!h-9 sm:!w-9` exists only to cancel IconButton's own sm: breakpoint.
```

### What this costs

`!important` is a one-way ratchet: once a call site uses it, no future change to the primitive can reach that element. With 141 of them, the design system is already 141 elements smaller than it appears. Two overrides — `!shadow-none` and `sm:!h-9 sm:!w-9` — exist purely to *cancel* the primitive, which means the primitive is net-negative at those sites. The `!rounded-[30px] … dropzone` block being duplicated between a game and the kit demo (`CountingItemsGame.tsx:173` ≈ `UiKitScreen.tsx:318`) shows the pattern was recognized as reusable but never promoted to a variant.

---

## 8. Responsive-variant tangles

### Headline: **416 `sm:` + 55 `landscape:` + 16 `sm:portrait:` + 29 `lg:` + 24 `md:` + 1 `portrait:` + 1 `xl:` = 542 responsive variants. All 55 orientation variants are concentrated in 4 files, and `ParentsGate.tsx` alone holds 38 of them.**

### Orientation variants by file (all 55)

| File | Count |
|---|---|
| `src/shared/components/ParentsGate.tsx` | 38 |
| `src/shared/components/FeedbackModal.tsx` | 21* |
| `src/shared/components/SettingsContent.tsx` | 7 |
| `src/shared/components/SettingsOverlay.tsx` | 6 |

\* counting `landscape:` occurrences including repeats on the same line.

`src/App.tsx` and all 9 game screens use **zero** orientation variants — so on a landscape tablet, the parent gate and feedback modal adapt while every game screen does not. Orientation handling is not a policy, it's a per-file habit in one cluster of screens.

### Breakpoint density by file (top)

| File | `sm:` |
|---|---|
| `src/shared/gameCatalog.tsx` | 92 |
| `src/shared/components/SettingsContent.tsx` | 57 |
| `src/games/assembly/AssemblyGame.tsx` | 24 |
| `src/App.tsx` | 22 |
| `src/shared/components/ParentsGate.tsx` | 18 |
| `src/games/complete-letter/CompleteLetterGame.tsx` | 17 |
| `src/shared/ui/UiKitScreen.tsx` | 16 |

`gameCatalog.tsx`'s 92 come from `topDecorationClassName` / `bottomDecorationClassName` being copy-pasted across 10 game entries with only the color token swapped — e.g. `:33`/`:47`/`:61`/`:87`/`:101`/`:115`/`:129`/`:143`/`:157` are the same 120-character string ×9. (Positively: these correctly use theme tokens.)

### Worst 10 by variant complexity

| # | Variants | file:line | Class string |
|---|---|---|---|
| 1 | **8** | `src/shared/components/ParentsGate.tsx:111` | `w-full rounded-2xl py-2 sm:portrait:py-4 landscape:py-2 min-h-[48px] sm:portrait:min-h-[72px] flex … text-2xl sm:portrait:text-4xl landscape:text-2xl font-bold` |
| 2 | **7** | `src/shared/components/AuditoryPromptBadge.tsx:39` | `!rounded-[28px] sm:!rounded-[36px] !px-6 !py-3 sm:!px-8 sm:!py-4 !shadow-block … focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40` |
| 3 | **7** | `src/App.tsx:76` | `grid grid-cols-2 auto-rows-[minmax(11.25rem,auto)] gap-3 sm:auto-rows-[minmax(13rem,auto)] sm:gap-4 lg:grid-cols-3 lg:flex-1 lg:auto-rows-fr lg:content-stretch lg:gap-5` |
| 4 | **6** | `src/shared/components/ParentsGate.tsx:103` | `w-full py-3 sm:portrait:py-6 landscape:py-3 text-center text-3xl sm:portrait:text-5xl landscape:text-3xl font-bold` |
| 5 | **6** | `src/shared/components/ParentsGate.tsx:149` | `!bg-success py-2 landscape:py-2.5 sm:portrait:py-5 text-xl landscape:text-xl sm:portrait:text-2xl … shadow-block-correct` |
| 6 | **6** | `src/shared/components/ParentsGate.tsx:133` | `!bg-bg-light py-2 landscape:py-2.5 sm:portrait:py-5 text-xl landscape:text-xl sm:portrait:text-2xl opacity-70` |
| 7 | **6** | `src/shared/components/ParentsGate.tsx:140` | `py-2 landscape:py-2.5 sm:portrait:py-5 text-xl landscape:text-xl sm:portrait:text-2xl` |
| 8 | **6** | `src/shared/components/ParentsGate.tsx:124` | `py-2 landscape:py-2.5 sm:portrait:py-5 text-xl landscape:text-xl sm:portrait:text-2xl` |
| 9 | **6** | `src/App.tsx:85` | `w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 rounded-[18px] sm:rounded-[24px] ${game.color} … shadow-lg … group-hover:scale-105` |
| 10 | **6** | `src/App.tsx:66` | `w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 !bg-shadow/20 !shadow-none hover:scale-105 active:scale-95 shrink-0 relative` |

Honorable mentions (5 variants): `src/shared/components/ParentsGate.tsx:94` (`landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-8`), `src/shared/components/ParentsGate.tsx:98`, `src/shared/ui/PromptBadge.tsx:36`, `src/games/counting/CountingItemsGame.tsx:187`, `src/shared/components/GameLobby.tsx:90`.

### The `ParentsGate` anti-pattern

Lines 124, 133, 140, 149 are four keypad buttons written as:

```
py-2 landscape:py-2.5 sm:portrait:py-5 text-xl landscape:text-xl sm:portrait:text-2xl
```

`landscape:text-xl` **restates the base `text-xl`** — it exists only to beat `sm:portrait:`'s specificity, not to change anything. The same redundancy appears at `:103` (`landscape:text-3xl` restating `text-3xl`) and `:111` (`landscape:text-2xl` restating `text-2xl`). That is 6 classes whose only job is to undo another class. The pattern is really "phone-portrait, tablet-portrait, landscape" — three named layouts — expressed as overlapping variant arithmetic.

`src/App.tsx:66` and `:85` are sibling elements that both spell out `w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20` — 6 classes duplicated verbatim to keep two things the same size, with no shared constant.

### What this costs

These strings are unreadable and therefore unreviewable — a wrong value inside one is invisible in code review and only shows up on a specific device orientation. `ParentsGate` in particular is a screen adults see under mild time pressure, and it has the app's densest and most redundant responsive logic. The absence of orientation variants everywhere else means landscape is effectively untested territory for 10 of 13 screens.

---

## Top 10 highest-leverage fixes

Ranked by visual impact ÷ effort. "Effort" assumes mechanical find-and-replace plus a lint + targeted e2e run.

| # | Fix | Impact | Effort | Why it ranks here |
|---|---|---|---|---|
| **1** | **Collapse 14 radii to a 4-step scale.** Define `--radius-sm/md/lg/xl` in `@theme`, map `18/20/22/24 → md`, `28/30/32 → lg`, `36/40/44/48 → xl`, and replace all 66 arbitrary usages. Start with the exact duplicates: `rounded-[24px]`→`rounded-3xl` (12 sites), `rounded-[32px]`→`rounded-4xl` (9 sites). | Very high — radius is the dominant "feel" signal | Low — pure mechanical replace; the 21 exact-duplicate sites are risk-free | Biggest visual-consistency win per line changed in the whole audit. |
| **2** | **Give `Card` `elevation`, `padding`, and `radius` props.** Then delete the 25 `!shadow-*` and 16 `!p-*` overrides. | Very high | Low-medium — one file + 30 call sites | Removes ~40% of all `!important` and stops the drift at its source. Everything below gets cheaper after this. |
| **3** | **Retire stock Tailwind shadows (21 sites).** Map `shadow-sm`→`shadow-chip`, `shadow-md`/`shadow-lg`→`shadow-block`. Fix `tokens.ts:17` to use `shadow-chip` instead of its arbitrary value. | High — soft Material shadows visibly clash with the chunky block identity, most obviously on the home screen (`App.tsx:84`/`:85`) | Low — 21 sites, 1 token file | Home screen is the first thing every user sees, and it's currently the worst offender. |
| **4** | **Extract a `SettingRow` primitive** from the 8 verbatim icon-chip duplicates; settle `items-start` vs `items-center` on one value. | High — ragged icon alignment in a vertical list is the most noticeable unpolish there is, and it's visible today | Low — 3 files, one new component | Pure deletion of duplicated markup; fixes a live visual bug as a side effect. |
| **5** | **Adopt the dead `surface` token.** Replace 29 `bg-white` + 24 `text-white` with `bg-surface`/`text-surface`, and collapse 8 `bg-white/NN` opacities to three steps. | High — unlocks theming; removes the largest single class of hardcoded color | Low-medium — 83 sites, fully mechanical | The token already exists and is used zero times; this is finishing work someone already started. |
| **6** | **Re-token the three celebration overlays** (`SuccessOverlay`, `FailureOverlay`, `SessionCompleteOverlay`): 10 hex literals, 4 `rgba()`, 3 arbitrary gradients, 3 arbitrary shadows → theme tokens + `shadow-block`. | High — these are the app's emotional peaks and currently the least on-brand surfaces | Medium — needs a small design decision on the gradient tints | Only 3 files, but they carry the app's entire second palette. |
| **7** | **Add a type scale for game glyphs.** Define 3–4 named clamp tokens; collapse Cluster A (4 tile sizes → 1) and Cluster B (5 prompt sizes → 2). | High — stops glyphs resizing as a child moves between sibling games | Medium — needs a judgement call per cluster, and the games are `.verify.ts`-covered so changes are cheap to validate | The cross-game drift directly undermines the "same activity, different flavor" promise. |
| **8** | **Convert `CustomContentScreen.tsx`'s 9 raw buttons to `Button`.** Four are literal copy-paste pairs (`:449`/`:737`, `:455`/`:743`, `:363`/`:659`, `:464`/`:752`); add a `variant="dashed"` for the last pair. | Medium-high — parent-facing screen, currently the most hand-rolled in the app | Low — the primitive already covers 7 of 9 exactly | Highest primitive-adoption gain per file; only `AvatarPreviewScreen` has more raw buttons, and that's dev-only. |
| **9** | **Add `size` to `IconButton` and `variant`/`as` to `Card`.** Kills `!w-9 !h-9 sm:!h-9 sm:!w-9` (`RecordingListItem.tsx:121`, `UiKitScreen.tsx:31`) and lets `PwaHomeControl.tsx:68` stop hand-rolling a card-button next to four real `<Card>`s. | Medium-high | Low — two small API additions | Fixes a live inconsistency (5 sibling rows, 2 implementations) and removes overrides that exist only to cancel the primitive. |
| **10** | **Refactor `ParentsGate.tsx`'s orientation logic** into 2–3 named layout constants; delete the 6 variants that merely restate their base class. Decide whether orientation support is app-wide or scoped, and write it down in `.claude/rules/`. | Medium — few users see it, but it's the highest-risk maintenance hazard and the only place with provably dead classes | Medium — needs a layout decision, not just a rename | Ranked last on visual impact but it is the single worst maintainability hazard found; the dead-class deletions are free. |

### Two cheap wins worth doing alongside any of the above

- **`src/pwa/pwaConfig.ts`** hardcodes `#F53D4C` and `#F4F1EA` — the literal values of `--color-primary` and `--color-bg-light`. Import them instead so splash/status-bar colors can't drift from the app. (2 lines.)
- **Promote the "dashed dropzone" pattern** to `Card variant="dropzone"`. The 9-override string at `src/games/counting/CountingItemsGame.tsx:173` is already duplicated into `src/shared/ui/UiKitScreen.tsx:318`, which means it was recognized as reusable but never extracted. (Removes 18 `!important` in one move.)

### A note on `UiKitScreen.tsx`

It holds 44 `!important` overrides — the most of any file — plus 5 `bg-white`, 3 stock-palette colors, and 2 hex literals. Treat its override list as the design system's own backlog: **every `!` on that page is a primitive API gap with a worked example attached.** Fixing items 2 and 9 above should reduce that count substantially, and the remaining ones will point at whatever should be fixed next.
