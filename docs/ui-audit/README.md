# Pre-launch UI audit — September 2026

Audit of every app surface ahead of publishing, covering visual polish,
consistency, accessibility and the styling architecture underneath.

**Method.** `tools/screenshots/capture.mjs` (`npm run shots`) captured 39 scenes ×
7 viewports = 273 screenshots against the dev server, including both phone
orientations. Three parallel passes reviewed those captures, the token/styling
layer, and accessibility. Contrast ratios were computed, not estimated. Gate
bypasses were reproduced against the running app.

| Report | Scope |
|---|---|
| [audit-visual.md](audit-visual.md) | Screenshot review: layout, aspect ratios, consistency |
| [audit-tokens.md](audit-tokens.md) | Radii, shadows, colours, typography, `!important`, primitive bypass |
| [audit-a11y.md](audit-a11y.md) | Focus, contrast, targets, semantics, motion, keyboard |

One good sign up front: **zero console errors across all 273 captures**, and
several things are already right — see [What's already good](#whats-already-good).

---

## 1. Ship blockers

These should be fixed before publishing.

### 1.1 The parents gate does not gate

Reproduced against the running app:

| Path | Result |
|---|---|
| Navigate to `/settings` | Parent zone opens, no gate |
| Navigate to `/content` | Recording manager opens, no gate |
| Enter via the gate → return home → press Back **once** | Parent zone reopens, no gate |

The third path needs no typing — Android's hardware Back button does it. A child
handed the tablet after a parent changed a setting is one tap from the screen
that deletes their recordings.

**Cause.** The gate is component state (`settingsScreen === 'gate'` in
`src/App.tsx:113`), not a property of the route. `src/App.tsx:176` does
`navigate('/settings')` — a push — and the settings back button pushes `/` on top,
so history replay walks straight back in. `/settings` (`src/App.tsx:326`) and
`/content` (`src/App.tsx:309`) have no guard of their own.

**Fix.** Make the gate a route concern: hold "gate passed" with a timestamp, have
both routes render the gate when it is unset or stale, and enter with
`navigate('/settings', { replace: true })` so the gate is never left in history.

### 1.2 Settings is unusable on a landscape phone

At 844×390 the back button, title and subtitle consume ~55% of the viewport
height; exactly one settings card is partly visible.

**Cause.** `src/shared/components/SettingsScreen.tsx:44` sizes type on *width*
(`text-3xl sm:text-5xl`). A wide-but-short viewport trips the `sm:` breakpoint and
the title jumps to 48px — but the scarce axis in landscape is height.

`ParentsGate` solves this correctly with explicit `landscape:` variants, which is
why the gate looks fine at the same size. The two screens disagree about how to
handle the same problem, and only one of them is right.

### 1.3 Parent-facing inputs are unlabelled and unfocusable

- `src/content/CustomContentScreen.tsx:427-446,722-734` — five inputs with no
  `<label>`, no `htmlFor`, no `aria-label`. Placeholder-only — `htmlFor`
  appears **zero** times in all of `src/`.
- The same five inputs set `outline-none` (lines 428, 435, 442, 723, 730) with no
  replacement, as do `src/shared/ui/FormControls.tsx:182,209`, whose substitute
  rings measure 1.23:1 and 1.56:1 against a 3:1 requirement.

Note: Tailwind v4 preflight does **not** strip focus outlines — verified in the
built CSS. Most buttons keep the browser ring. The problem is that every place the
app touches focus makes it worse.

### 1.4 Answer tiles clip below the fold

The 4×2 tile grid runs past the bottom of a 390×844 viewport, and again at
844×390 and 360×640. Nothing indicates the screen scrolls, so a child can simply
not see the correct answer.

### 1.5 The compare game shows no prompt

Two cards of butterflies, no question text, no prompt badge — while every other
game shows one. If the instruction is audio-only, a muted device leaves the round
unsolvable.

---

## 2. Accessibility

### 2.1 Contrast

Computed against the real token pairs:

| Pair | Ratio | AA 4.5:1 | AA 3:1 |
|---|---|---|---|
| text-main on bg-light | 7.80:1 | PASS | PASS |
| text-main on white | 8.80:1 | PASS | PASS |
| text-main on success | 6.59:1 | PASS | PASS |
| text-main on accent-blue | 5.63:1 | PASS | PASS |
| text-main on accent-orange | 4.20:1 | FAIL | PASS |
| white on primary | 3.71:1 | FAIL | PASS |
| white on soft-watermelon | 2.02:1 | **FAIL** | **FAIL** |
| white on accent-orange | 2.10:1 | **FAIL** | **FAIL** |
| primary on success (correct tile) | 2.78:1 | **FAIL** | **FAIL** |
| `opacity-60` on bg-light (#998A83) | 2.95:1 | **FAIL** | **FAIL** |
| `opacity-55` on bg-light (#A1928B) | 2.66:1 | **FAIL** | **FAIL** |
| `opacity-40` on bg-light (#B8ACA5) | 1.96:1 | **FAIL** | **FAIL** |

The opacity rows are the ones that matter most: `opacity-55` at `text-sm` is the
single most repeated failure in the app (`SettingsContent.tsx:94,126,167,235,289,414`,
`FormControls.tsx:48`). Every settings description sits at 2.66:1 — normal size,
not large.

`white on soft-watermelon` at 2.02:1 is the secondary button in the UI kit and the
syllable chips in the assembly game.

**Fix.** Replace opacity-based muting with a real `text-muted` token chosen to
clear 4.5:1 on both cream and white, and darken `soft-watermelon`/`accent-orange`
(or stop putting white text on them).

### 2.2 Modals

`SettingsOverlay.tsx:31`, `FeedbackModal.tsx:77` and `ParentsGate.tsx:84` have no
focus trap, no initial focus, no focus restore, and leave the background
non-inert. `ParentsGate` additionally has no `role="dialog"`, no `aria-modal`, and
no accessible name.

`OverlayFrame.tsx:90-108` is worse: no Escape handler, and the Failure and
Session-Complete overlays contain **no focusable element at all**, so a keyboard
user cannot dismiss them.

### 2.3 Motion

54 infinitely-looping confetti particles (`index.css:122-143`, `OverlayFrame.tsx:14-66`)
and infinite ping/pulse rings (`AuditoryPromptBadge.tsx:47-48`) run with **no
`prefers-reduced-motion` guard anywhere in `src/`**. For a vestibular-sensitive
child this is the difference between usable and not.

### 2.4 Touch targets

Below the 44px comfortable minimum (WCAG 2.5.8's floor is 24px):

- `RecordingListItem.tsx:121,157` — four 36×36 buttons plus one 28×28 in a single
  row, `sm:` re-pinned so they never grow, adjacent to a destructive delete.
- `SuccessOverlay.tsx:71` (40×40) and `SettingsOverlay.tsx:47` (38×38) — both
  bypass the 48px `IconButton` primitive.
- `PwaHomeControl.tsx:94` — "Rozumiem" is roughly 20px tall.
- The `○` selection circles on `/content` rows are ~12–14px at very low contrast.

### 2.5 Semantics

- No `<h1>` on `/settings`, `/content`, the game boards, or the error state; no
  `<main>` landmark on any shipping screen.
- `CustomContentScreen.tsx:788-802` — tabs with no `role="tablist"`,
  `aria-selected`, or arrow-key navigation.
- `CustomContentScreen.tsx:37-40` — `FieldError` has no `role="alert"` or
  `aria-describedby`.
- `GameLobby.tsx:22-35` — the title is split into per-character flex items, so it
  wraps mid-word and screen readers may spell it out.
- `ErrorBoundary.tsx:26-46` — "Skúsiť znova" retries the same crashed subtree; no
  escape to home, no `componentDidCatch` logging.
- `CustomContentScreen.tsx:372,668` — no empty state for the words or praise lists.

---

## 3. Visual consistency

### 3.1 Two design languages

`/content` does not look like the rest of the app:

| | Settings / games | `/content` |
|---|---|---|
| Row treatment | Icon tile, large radius, hard `shadow-block` edge | Flat row, soft ambient shadow, no icon |
| Accent | Pastel periwinkle / mint | Saturated `#f53d4c` red pill |
| Title alignment | Centred | Left-aligned |

The red tab pill is the `primary`/danger token pressed into service as a
*selection* colour — the most saturated element in the app marks "which tab am I
on".

### 3.2 Selected reads as disabled

In every `SegmentedChoice` — the font picker, counting range, all game settings —
the unselected option is cream on a white card, closer to the disabled styling
than to an available choice. Users read it as off-limits rather than tappable.

### 3.3 The modal backdrop is invisible

`SettingsOverlay.tsx:33` uses `bg-bg-light/95 backdrop-blur-md` — a near-opaque
*cream* scrim over a cream app. The dialog looks marooned on a flat field with no
sense of the game behind it. A dim scrim (`bg-text-main/40`) restores depth and
signals "temporary".

### 3.4 The primary action is styled as the weakest element

- `SettingsOverlay`'s "Hotovo" is `variant="quiet"` — white on white, the least
  prominent thing in the dialog, while the ✕ beside it does the same job.
- In the UI kit, "Primárne" is pale periwinkle while "Dôležité" is saturated red.
  The everyday action is the quietest; the rare destructive one shouts.

### 3.5 Ragged home-card baselines

On phone and tablet portrait, "Viac alebo Menej" wraps to two lines while
"Sčítaj" does not, so neighbouring cards' icons and titles sit at different
heights. Card height is content-driven with no shared baseline. Desktop hides it
(titles fit one line); the app's first screen on a phone does not.

### 3.6 Dead space dominates tall viewports

~55% of the assembly game is empty cream between the prompt and the answer tray;
~45% of the compare game; ~35% of tablet-portrait settings. Content is pinned with
`justify-between` or stacked from the top rather than distributed or scaled.

### 3.7 Smaller items

- Game icon colours cycle red/mint/periwinkle/pink with no relation to what each
  game teaches; neighbouring cards repeat colours.
- The home settings gear is cream-on-cream and nearly invisible, while every other
  `IconButton` is white with a heavy shadow. If hiding it from children is
  deliberate it should be a named variant, not an accident.
- Two speaker controls per game round look unrelated but do the same job.
- The `/content` tab bar clips mid-word at the viewport edge with no fade, arrow,
  or peek to signal that it scrolls.
- Glyph size does not track tile size: letters fill their tiles in landscape but
  float small in an oversized portrait tile.
- `text-sm` chevrons on settings rows are pale hairlines that barely register as
  "this navigates".

---

## 4. The styling layer

This is what makes the visual problems recur rather than stay fixed.

| Axis | Finding |
|---|---|
| **Radius** | 15 distinct values, 174 usages, 38% arbitrary px. `rounded-[24px]` (12×) and `rounded-3xl` (12×) render *identically* in Tailwind v4 and are split down the middle. "Modal" has three different radii depending on which component draws it. |
| **Shadow** | 16 distinct, 81 usages, only 68% from the named system. Stock `shadow-sm` (18×) outnumbers house `shadow-chip` (13×). `App.tsx:84` cards use `shadow-sm` while their own nested icons at `:85` use `shadow-lg`. `tokens.ts:17` — the token file itself — uses an arbitrary shadow. |
| **Colour** | 153 values bypass tokens. `--color-surface` has **zero** usages while 83 hardcoded `white` classes stand in, across 8 different `bg-white/NN` opacities with no ladder. The three celebration overlays carry an entire second palette. `pwaConfig.ts` hardcodes verbatim copies of two tokens. |
| **Primitive bypass** | 30 raw `<button>` against 47 primitive uses — 39% bypass. `AvatarPreviewScreen.tsx:256` hand-reimplements `uiTokens.iconButton` but changes both the shadow and the press physics, so the same control feels different depending on the screen. |
| **Typography** | 36 distinct sizes; 16 clamp expressions across only 23 uses — near 1:1, so each was written per call-site. Four sibling games size the same letter tile on different slopes (5vw/5.5vw/6vw), so they agree at some widths and diverge at others. |
| **Spacing** | The settings row is copy-pasted 8× verbatim, and they disagree: 6 use `items-start`, 2 use `items-center`, so icons visibly misalign within one scrolling list. No feature file imports `uiTokens` at all. |
| **`!important`** | Over 100 across 17 files (101–141 depending on how they are counted). `UiKitScreen.tsx` holds **44** — the page that demonstrates the system cannot do so without overriding it. `!shadow-sm` (9) + `!shadow-block` (9) + `!shadow-none` (7) all say the same thing: `Card` needs an elevation prop. |
| **Responsive** | 542 variants. All 55 orientation variants live in 4 files, 38 of them in `ParentsGate.tsx` — where six merely restate their base class and are provably dead. All 10 game screens use zero orientation variants, which is why §1.2 happens. |

The through-line: **the primitives' APIs are too rigid, so call sites override
them**, and every override is a place a future fix will not reach.

---

## 5. Recommended sequence

**Stage 1 — ship blockers.** Gate as a route guard; landscape sizing for
settings; labels and focus rings on the parent forms; tile-grid overflow; compare
prompt. Small, surgical, independent of everything below.

**Stage 2 — accessibility.** A `text-muted` token replacing opacity-based muting;
`prefers-reduced-motion`; the three modals' focus behaviour; touch targets to 44px;
`<h1>`/`<main>` per screen.

**Stage 3 — primitive APIs.** Give `Card` `elevation`/`padding`/`radius` props and
`IconButton` a `size`; extract `SettingRow` from its 8 copies. This is what
retires the bulk of the `!important` uses, and it is the prerequisite for Stage 4 being
cheap.

**Stage 4 — component library.** Adopt headless primitives for the behaviour the
app currently hand-rolls (dialog, radio group, switch, tabs), keeping the bespoke
pastel skin. See §6.

**Stage 5 — token cleanup.** Collapse 15 radii to a 4-step scale, retire the 21
stock shadows, adopt the dead `surface` token, re-token the celebration overlays,
unify the game-glyph type scale.

Stages 1 and 2 are launch-critical. Stages 3–5 are what keep the UI consistent
after launch, and 3 should precede 4.

---

## 6. Component library

The app has a strong bespoke identity — chunky pastel surfaces, hard-edged bottom
shadows, oversized touch targets. A *styled* library (MUI, Mantine, Chakra) would
be fought at every turn. What is actually missing is **behaviour**, not looks:

| Hand-rolled today | Gap found | Primitive |
|---|---|---|
| `SettingsOverlay`, `FeedbackModal`, `ParentsGate` | No focus trap, restore, inert, or Escape | Dialog |
| `SegmentedChoice` | Buttons, not a radio group; no roving tabindex | RadioGroup / ToggleGroup |
| `ToggleControl` | `aria-pressed` button, not `role="switch"` | Switch |
| `/content` tabs | No `role="tablist"`, `aria-selected`, arrow keys | Tabs |

**Recommendation: Base UI** (`@base-ui/react`) for behaviour, plus **CVA +
tailwind-merge** for the variant layer, keeping every existing visual token.

Base UI is headless, styles through plain `className`, supports React 19, and
comes from the teams behind Radix, Floating UI and MUI. Radix Primitives is the
equally defensible alternative — more mature, larger ecosystem. React Aria
Components has the strongest accessibility story but a heavier API.

CVA + tailwind-merge matters independently of which primitives win:
`FormControls.tsx:88-104` currently keeps an `activeBackgroundOverride` lookup
table that rewrites `bg-x` → `!bg-x` to win specificity fights against its own
`Button`. That is the `!important` problem in miniature, and `tailwind-merge`
deletes the whole category by resolving conflicts properly.

**Explicitly not recommended:** replacing `IconMenuButton`. Its keyboard model is
complete and correct — it should be the reference the others are brought up to.

---

## What's already good

Worth protecting through any refactor:

- `IconButton`'s required `label` prop means every icon button is named *by
  construction* — a structurally enforced accessibility win.
- Decorative elements are consistently `aria-hidden`.
- `IconMenuButton` has a complete keyboard menu model.
- Assembly is tap-to-place rather than drag-and-drop — the right call for small
  hands.
- Zero `onClick` handlers on non-interactive elements anywhere in the codebase.
- Zero console errors across all 273 captures.
- A `/ui-kit` route documenting the primitives already exists; the problem is that
  it needs 44 `!important` uses to render, not that it is missing.
