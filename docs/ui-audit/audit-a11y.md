# Accessibility / Interaction / Robustness Audit — teo-learn

Branch: `ui-polish-audit`. Read-only audit. All contrast math computed with a WCAG 2.x
relative-luminance implementation (scripts in this scratchpad: `contrast.mjs`,
`contrast2.mjs`, `rings.mjs`).

Severity tags: **[BLOCKER]** = fix before publishing, **[SHOULD-FIX]** = fix soon after,
**[NICE-TO-HAVE]** = polish.

---

## 1. Focus visibility

### What actually happens at runtime

Important correction to the common assumption: **Tailwind v4 preflight does NOT strip
focus outlines.** Verified against the built stylesheet `dist/assets/index-DXy7vFrD.css` —
the only outline rules present are `:-moz-focusring{outline:auto}` and the opt-in
`.outline-none` / `.focus:outline-none` / `.focus-visible:outline-none` utilities.
The preflight button reset is:

```
button,input,select,optgroup,textarea{font:inherit;...;background-color:#0000;border-radius:0}
```

No `outline:none`. So every interactive element that does **not** opt into
`outline-none` keeps the browser's default focus ring. That covers `Button`, `IconButton`,
`ChoiceTile`, `IconMenuButton` menu items, the home game cards, and the ParentsGate keypad.

The problem is therefore not "no focus rings anywhere" — it is that **every place the app
touches focus styling makes things worse**: it either removes the compliant default with
no replacement, or replaces it with a ring too low-contrast to perceive.

### Complete inventory of focus styling in `src/`

| File:line | What it does | Verdict |
|---|---|---|
| `src/content/CustomContentScreen.tsx:428` | `outline-none` on "Slovo" input | removed, no replacement |
| `src/content/CustomContentScreen.tsx:435` | `outline-none` on "Slabiky" input | removed, no replacement |
| `src/content/CustomContentScreen.tsx:442` | `outline-none` on "Emoji" input | removed, no replacement |
| `src/content/CustomContentScreen.tsx:723` | `outline-none` on praise "Text" input | removed, no replacement |
| `src/content/CustomContentScreen.tsx:730` | `outline-none` on praise "Emoji" input | removed, no replacement |
| `src/games/counting/CountingItemsGame.tsx:187` | `focus:outline-none` on each countable emoji button | removed, no replacement |
| `src/shared/ui/FormControls.tsx:182` | `focus:outline-none` + `focus:border-accent-blue/50` | replacement invisible (1.23:1) |
| `src/shared/ui/FormControls.tsx:209` | `focus:outline-none` + `focus:ring-2 focus:ring-accent-blue` | ring 1.56:1 vs white |
| `src/shared/ui/PromptBadge.tsx:36` | `focus-visible:outline-none` + `focus-visible:ring-4 ring-primary/40` | ring 1.68–1.74:1 |
| `src/shared/components/AuditoryPromptBadge.tsx:39` | `focus-visible:outline-none` + `focus-visible:ring-4 ring-primary/40` | ring 1.68–1.74:1 |
| `src/shared/components/SettingsContent.tsx:85` | `focus-visible:outline-none` + `focus-visible:ring-4 ring-accent-blue/40` | ring 1.13–1.19:1 |

That is the whole list. Five components in the entire app define a focus indicator, and
none of the five reaches the 3:1 required by WCAG 1.4.11 / 2.4.11.

### Focus indicator contrast (computed)

| focus indicator | effective color | vs adjacent | ratio | ≥3:1? |
|---|---|---|---|---|
| PromptBadge `ring-primary/40` over bg-light | #F4A9AB | #F4F1EA | 1.68:1 | FAIL |
| PromptBadge `ring-primary/40` over white | #FBB1B7 | #FFFFFF | 1.74:1 | FAIL |
| SettingsNavCard `ring-accent-blue/40` over bg-light | #E2E3EA | #F4F1EA | 1.13:1 | FAIL |
| SettingsNavCard `ring-accent-blue/40` over white | #E9EBF7 | #FFFFFF | 1.19:1 | FAIL |
| TextArea `ring-accent-blue` (100%) over white | #C7CEEA | #FFFFFF | 1.56:1 | FAIL |
| SearchInput focused border `accent-blue/50` over white | #E3E7F5 | #FFFFFF | 1.23:1 | FAIL |
| SearchInput resting border `shadow/10` over white | #FBFAF8 | #FFFFFF | 1.04:1 | FAIL (also means the field edge itself is invisible) |

### Findings

- **[BLOCKER]** `src/content/CustomContentScreen.tsx:428,435,442,723,730` — the five text
  inputs of the parent-facing add/edit word and add/edit praise forms use bare
  `outline-none`. A keyboard or switch-access parent gets **zero** indication of which
  field has focus, and these are the only free-text entry points in the app. There is no
  `focus:` replacement on any of them.
- **[BLOCKER]** `src/shared/ui/FormControls.tsx:182` (`SearchInput`) and `:209`
  (`TextAreaControl`) — both kill the default outline. `SearchInput`'s only replacement
  is a border-color change measured at **1.23:1**; `TextAreaControl`'s ring is **1.56:1**.
  `TextAreaControl` is the feedback message box (`FeedbackModal.tsx:123`), so this is on a
  shipping parent path.
- **[SHOULD-FIX]** `src/shared/ui/PromptBadge.tsx:36`,
  `src/shared/components/AuditoryPromptBadge.tsx:39`,
  `src/shared/components/SettingsContent.tsx:85` — these three do the right structural
  thing (`focus-visible` + ring) but at 40% alpha the ring is invisible
  (1.13–1.74:1). Raising to full-opacity `primary` (#f53d4c → 3.29:1 on bg-light, 3.71:1
  on white) with `ring-offset-2` would clear 3:1 on both grounds.
- **[SHOULD-FIX]** `src/games/counting/CountingItemsGame.tsx:187` — `focus:outline-none`
  on each countable emoji with no replacement. These are real `<button>`s with
  `aria-label="Spočítateľný predmet"`, so they are in the tab order but invisible when focused.
- **[NICE-TO-HAVE]** No global focus token exists. `src/shared/ui/tokens.ts:22`
  (`uiTokens.pressable`) and `:14` (`uiTokens.iconButton`) are the natural place to add one
  so every primitive inherits a consistent, brand-colored ring instead of the UA default.
- **[NICE-TO-HAVE]** `eslint.config.js` has no `eslint-plugin-jsx-a11y`. Adding it would
  have caught the missing labels in §4 automatically and would prevent regressions.

---

## 2. Color contrast

Full computed table. Large text = ≥18.66px normal or ≥14px bold (this app is bold-heavy,
so most display text qualifies as large). UI components / focus indicators need 3:1.

### Core token pairs

| pair | ratio | AA normal (4.5) | AA large / UI (3.0) | AAA (7.0) |
|---|---|---|---|---|
| text-main #5D453E on bg-light #F4F1EA | **7.80:1** | PASS | PASS | PASS |
| text-main on white | **8.80:1** | PASS | PASS | PASS |
| text-main on success #B5EAD7 | **6.59:1** | PASS | PASS | FAIL |
| text-main on accent-blue #C7CEEA | **5.63:1** | PASS | PASS | FAIL |
| text-main on accent-orange #F6A03C | **4.20:1** | FAIL | PASS | FAIL |
| text-main on shadow #D5CABD | **5.45:1** | PASS | PASS | FAIL |
| white on soft-watermelon #FF9AA2 | **2.02:1** | FAIL | FAIL | FAIL |
| white on primary #f53d4c | **3.71:1** | FAIL | PASS | FAIL |
| white on accent-orange #F6A03C | **2.10:1** | FAIL | FAIL | FAIL |
| white on success #B5EAD7 | **1.34:1** | FAIL | FAIL | FAIL |
| white on accent-blue #C7CEEA | **1.56:1** | FAIL | FAIL | FAIL |
| primary on success (ChoiceTile `correct`) | **2.78:1** | FAIL | FAIL | FAIL |
| primary on white | **3.71:1** | FAIL | PASS | FAIL |
| primary on bg-light | **3.29:1** | FAIL | PASS | FAIL |
| red-500 #EF4444 on white (menu danger) | **3.76:1** | FAIL | PASS | FAIL |
| shadow #D5CABD on bg-light (borders/dividers) | **1.43:1** | FAIL | FAIL | FAIL |
| white on bg-dark #221011 | **18.26:1** | PASS | PASS | PASS |

### Opacity-blended text (effective color computed, then measured)

| pair | effective color | ratio | AA normal | AA large/UI |
|---|---|---|---|---|
| text-main @ opacity-70 on bg-light | #8A7972 | **3.68:1** | FAIL | PASS |
| text-main @ opacity-70 on white | #8E7D78 | **3.92:1** | FAIL | PASS |
| text-main @ opacity-60 on bg-light | #998A83 | **2.95:1** | FAIL | FAIL |
| text-main @ opacity-60 on white | #9E8F8B | **3.11:1** | FAIL | PASS |
| text-main @ opacity-55 on bg-light | #A1928B | **2.66:1** | FAIL | FAIL |
| text-main @ opacity-55 on white | #A69995 | **2.76:1** | FAIL | FAIL |
| text-main @ opacity-50 on bg-light | #A99B94 | **2.39:1** | FAIL | FAIL |
| text-main @ opacity-50 on white | #AEA29F | **2.48:1** | FAIL | FAIL |
| text-main @ opacity-40 on bg-light | #B8ACA5 | **1.96:1** | FAIL | FAIL |
| text-main @ opacity-40 on white | #BEB5B2 | **2.01:1** | FAIL | FAIL |
| text-main @ opacity-35 on bg-light | #BFB5AE | **1.78:1** | FAIL | FAIL |
| text-main @ opacity-30 on bg-light | #C7BDB6 | **1.64:1** | FAIL | FAIL |
| text-main @ opacity-20 on bg-light | #D6CFC8 | **1.37:1** | FAIL | FAIL |
| white @ opacity-80 on soft-watermelon | #FFEBEC | **1.76:1** | FAIL | FAIL |
| white @ opacity-70 on primary | #FCC5C9 | **2.47:1** | FAIL | FAIL |
| text-main on `bg-light/35` inset panel over white | bg #FBFAF8 | **8.44:1** | PASS | PASS |
| text-main @ opacity-40 on `bg-light/35` panel | — | **1.99:1** | FAIL | FAIL |

### Real usage sites

| site | ratio | AA normal | AA large/UI |
|---|---|---|---|
| SuccessOverlay `text-primary` h3 on #fff8f0 panel (48–80px) | **3.53:1** | FAIL | PASS (large) |
| SuccessOverlay `text-primary` h3 on gradient end #ffecd2 | **3.22:1** | FAIL | PASS (large) |
| SuccessOverlay echo `#c06a00` on #fff8f0 (24–36px) | **3.76:1** | FAIL | PASS (large) |
| SuccessOverlay echo `#c06a00` on #ffecd2 | **3.43:1** | FAIL | PASS (large) |
| FailureOverlay `#3a4a8a` on #eef2ff | **7.43:1** | PASS | PASS |
| FailureOverlay `#5566aa` "Je to:" on #dde6ff (20–24px) | **4.35:1** | FAIL | PASS (large) |
| CustomContent amber-700 on amber-50 (SectionNotice) | **4.84:1** | PASS | PASS |
| CustomContent green-700 on green-50 (SectionSummary) | **4.79:1** | PASS | PASS |
| RecordingListItem amber-700 on amber-100 badge | **4.51:1** | PASS | PASS |
| RecordingListItem green-700 on green-100 badge | **4.57:1** | PASS | PASS |
| CustomContent active tab: white on bg-primary (16px semibold) | **3.71:1** | FAIL | PASS (large-ish; 16px semibold is NOT large) |
| SettingsOverlay close X `text-main/60` on white header | **3.11:1** | FAIL | PASS (UI) |
| Home card description `opacity-60` on white card | **3.11:1** | FAIL | PASS (large, clamp 14.7–19.2px) |
| GameLobby subtitle `opacity-55` on bg-light | **2.66:1** | FAIL | FAIL |
| SegmentedChoice unselected `opacity-70` on bg-light | **3.68:1** | FAIL | PASS |
| ChoiceTile `wrong` state `opacity-50` on white | **2.48:1** | FAIL | FAIL |
| PwaHomeControl `text-main/55` install description on white | **2.76:1** | FAIL | FAIL |
| SectionSummary "Skryté" `text-main/65` on shadow/10 | **3.04:1** | FAIL | PASS |

### Findings

- **[SHOULD-FIX] — normal-size text failures (these are the ones that matter):**
  - `src/pwa/PwaHomeControl.tsx:77` — install description `text-text-main/55` at
    `text-xs` (12px semibold). **2.76:1**. Normal-size, fails both AA and the 3:1 floor.
    This is the PWA install prompt — arguably the most important string on the home screen.
  - `src/shared/ui/FormControls.tsx:48` — `ToggleControl` description `opacity-55` at
    `text-sm` (14px medium, so *not* large). **2.66:1** on bg-light /
    **2.76:1** on white.
  - `src/shared/components/SettingsContent.tsx:94,126,167,235,289,414` — every settings
    card description is `opacity-55` at `text-sm`. Same **2.66–2.76:1**. This is the
    single most repeated contrast failure in the app; all parent-facing.
  - `src/content/CustomContentScreen.tsx:68` — `text-text-main/65` "Skryté" counter,
    `text-sm` bold. **3.04:1**, passes the 3:1 large-bold bar only because it is bold at
    14px; borderline.
  - `src/recordings/RecordingListItem.tsx:116` — `secondaryClass` uses
    `text-text-main/55` at `text-xs` for the syllable hint. **2.76:1**, normal-size.
  - `src/content/CustomContentScreen.tsx:470,758` — "Pridať slovo" / "Pridať pochvalu"
    `text-text-main/60` at `text-lg` semibold (18px) — **3.11:1**, scrapes past the
    large-text bar only on the bold exemption.
- **[SHOULD-FIX]** `src/content/CustomContentScreen.tsx:793-796` — active section tab is
  `bg-primary text-white` at `text-base font-semibold` = **16px semibold**. 600 weight at
  16px does **not** meet the WCAG large-text definition (needs 14pt/18.66px, or 14pt bold).
  **3.71:1** is a fail for this size. Darkening `primary` or bumping the tab to
  `text-lg font-bold` fixes it.
- **[SHOULD-FIX]** `src/shared/ui/ChoiceTile.tsx:23` — the `wrong` state stacks
  `opacity-50` on the whole tile, dropping its content to **2.48:1**. A child who taps
  wrong sees the tile they just chose become near-illegible. Dimming the background rather
  than the whole tile keeps the letter readable.
- **[SHOULD-FIX]** `src/shared/components/GameLobby.tsx:78` — subtitle at `opacity-55`,
  **2.66:1**. Its clamp floor is 1rem (16px) bold, so it just misses the large-text bar too.
- **[NICE-TO-HAVE] — large-text failures that are defensible:** `white on primary`
  (3.71:1) in `Button` variant `danger` (`Button.tsx:24`) at `text-xl`+; SuccessOverlay
  `text-primary` (3.22–3.53:1) at 48–80px; SuccessOverlay/SessionComplete echo `#c06a00`
  (3.43–3.76:1) at 24–36px. All clear the 3:1 large-text bar. No change required, but
  none of them has AAA headroom.
- **[NICE-TO-HAVE]** `white on soft-watermelon` = **2.02:1** (`Button.tsx:22`, variant
  `secondary`) and `white on accent-orange` = **2.10:1**. These fail even the 3:1 large bar.
  `Button variant="secondary"` does not appear to be used on a shipping path today —
  `grep` shows only `UiKitScreen`. Worth fixing in the primitive before someone reaches
  for it. `text-text-main` on both grounds would pass (4.20:1 / higher).
- **[NICE-TO-HAVE]** `primary on success` (ChoiceTile `correct` state,
  `ChoiceTile.tsx:22`) = **2.78:1**. The correct answer flashes red-on-mint. It is
  large display type but still under 3:1. `text-text-main` on success is 6.59:1.
- **[NICE-TO-HAVE]** `shadow #D5CABD on bg-light` = **1.43:1** — every divider and card
  border in the app (`border-shadow/10`, `/15`, `/20`, `/30`) is effectively invisible as a
  boundary. Decorative only, so not a violation, but it means grouping is carried purely by
  background fill.

---

## 3. Tap target sizes

Reference: WCAG 2.5.8 minimum 24×24 CSS px; Apple HIG 44×44; preschoolers realistically
want ≥60.

| element | file:line | computed size | verdict |
|---|---|---|---|
| RecordingListItem stop button | `src/recordings/RecordingListItem.tsx:157` | **28×28** | smallest in app |
| SearchInput clear (X) | `src/shared/ui/FormControls.tsx:191` | **32×32** | |
| PwaHomeControl close (×2) | `src/pwa/PwaHomeControl.tsx:57,99` | **32×32** (`!h-8 !w-8`) | |
| RecordingListItem record / play / delete / menu | `src/recordings/RecordingListItem.tsx:121` (`compactActionClass = !h-9 !w-9`) | **36×36** at every breakpoint (`sm:!h-9 !w-9` pins it) | 4 in a row |
| SettingsOverlay close (X) | `src/shared/components/SettingsOverlay.tsx:47` | **38×38** (`p-2` + 22px icon); **40×40** at `sm` | |
| SuccessOverlay pause/close | `src/shared/components/SuccessOverlay.tsx:71` | **40×40** (`h-10 w-10`, pinned by `sm:h-10 sm:w-10`) | child-facing |
| IconMenuButton menu items | `src/shared/ui/IconMenuButton.tsx:154` | `px-3 py-2 text-sm` → **~36px** tall | |
| PwaHomeControl "Rozumiem" | `src/pwa/PwaHomeControl.tsx:94` | text-only, `text-sm`, no padding → **~20px** tall | text link |
| ParentsGate keypad digits | `src/shared/components/ParentsGate.tsx:124` | `py-2 text-xl` → 28px line + 16px = **44×~88** at base; 68px tall at `sm` portrait | exactly at the Apple floor |
| ParentsGate ⌫ and ✓ | `src/shared/components/ParentsGate.tsx:133,149` | same **44** tall | |
| CustomContentScreen section tabs | `src/content/CustomContentScreen.tsx:793` | `px-4 py-2 text-base` → **~40** tall | |
| CustomContentScreen form buttons | `src/content/CustomContentScreen.tsx:451,457,739,745` | `py-2 text-lg` → 28+16 = **44** tall | |
| CustomContentScreen inputs | `:428,435,442,723,730` | `py-2 text-lg` → **44** tall | |
| `IconButton` (default) | `src/shared/ui/tokens.ts:15` | **48×48**, 56 at `sm` | good |
| `Button` size md / lg | `src/shared/ui/Button.tsx:30,31` | 60 / 76 tall | good |
| `ChoiceTile` in game grids | sized by `FindItGame.tsx:225-236` | dynamic, ≥75px in the worst landscape case | good |
| Counting emoji buttons | `src/games/counting/CountingItemsGame.tsx:187` | content-sized, `text-5xl` ≈ **48** | acceptable |

### Findings

- **[SHOULD-FIX]** `src/recordings/RecordingListItem.tsx:121,157` — the parent recording
  rows put **four 36×36** buttons (record / play / delete / overflow menu) plus a **28×28**
  stop button in a single row. `compactActionClass` explicitly re-pins the `sm` breakpoint
  (`sm:!h-9 sm:!w-9`) so they never grow. These clear WCAG 2.5.8's 24px but are well under
  44, they are adjacent with no spacer, and they sit next to a destructive "delete
  recording" action. This is the highest-risk mis-tap surface in the app.
- **[SHOULD-FIX]** `src/shared/components/SuccessOverlay.tsx:71` — the pause/close control
  is **40×40** and is the only child-facing control that lets a kid interrupt the success
  overlay. It is also positioned `absolute right-4 top-4` inside a panel with
  `px-12 py-12`, so it overlaps the panel's rounded corner. Should be ≥48 like every
  other child-facing `IconButton`.
- **[SHOULD-FIX]** `src/shared/components/SettingsOverlay.tsx:47` — modal close at
  **38×38** (40 at `sm`). Uses a raw `<button>` rather than the 48px `IconButton`
  primitive, which is the inconsistency that caused it.
- **[SHOULD-FIX]** `src/pwa/PwaHomeControl.tsx:94` — "Rozumiem" is an unpadded text
  button roughly **20px** tall. Below the WCAG 2.5.8 24px minimum in the vertical axis.
- **[NICE-TO-HAVE]** `src/shared/ui/FormControls.tsx:191` (SearchInput clear, 32×32) and
  `src/pwa/PwaHomeControl.tsx:57,99` (32×32) — above the 24px floor, under 44.
- **[NICE-TO-HAVE]** `src/shared/components/ParentsGate.tsx:124` — keypad buttons land at
  **exactly 44px** tall on a base-width phone in portrait (`py-2` = 16px + `text-xl`
  28px line-height). No margin for error, and these are pressed by an adult under mild
  time pressure. `py-3` would give 52.
- **[NICE-TO-HAVE]** `src/shared/ui/IconMenuButton.tsx:154` — menu items at ~36px tall
  with `text-sm`; the danger-toned "Zmazať slovo" / "Skryť slovo" destructive actions live here.

---

## 4. Semantics and ARIA

### Overall inventory

`aria-label` ×34, `aria-hidden` ×17, `aria-pressed` ×6, `aria-modal` ×2, `aria-live` ×2,
`aria-labelledby` ×2, `aria-haspopup` ×1, `aria-expanded` ×1.
Roles: `img` ×5, `status` ×2, `dialog` ×2, `menu`/`menuitem` ×1 each, `button` ×1.

### Dialogs

| overlay | role/aria-modal | labelled | Escape | focus trap | initial focus | focus restore | background inert |
|---|---|---|---|---|---|---|---|
| `SettingsOverlay` | yes (`:35-37`) | yes (`aria-labelledby` → `:41`) | yes (`:21-29`) | **no** | **no** | **no** | **no** |
| `FeedbackModal` | yes (`:77`) | yes (`:82`) | yes (`:48-57`) | **no** | **no** | **no** | **no** |
| `ParentsGate` | **none** | **none** | yes (`:73-75`) | **no** | **no** | **no** | **no** |
| `OverlayFrame` (Success/Failure/SessionComplete) | **none** | **none** | **no** | **no** | **no** | **no** | **no** |
| `IconMenuButton` menu | `role="menu"` + `menuitem` + `aria-haspopup` + `aria-expanded` | n/a | yes (`:98-101`) | closes on Tab (`:93-96`) | **yes** (`:53`) | **yes** (`:40`, `:151`) | n/a |

`IconMenuButton` is the one component in the app that gets this right — it is the working
reference for everything below.

### Findings

- **[BLOCKER]** `src/shared/components/ParentsGate.tsx:84-90` — the parental gate renders
  as a plain `AppScreen` with `position="fixed"` and no `role="dialog"`, no
  `aria-modal`, no accessible name. A screen-reader user gets no announcement that a modal
  opened; the home screen's 11 game cards behind it remain in the tab order and in the
  accessibility tree. The `<h2>Pre rodičov</h2>` at `:97` is the obvious `aria-labelledby`
  target.
- **[SHOULD-FIX]** No focus trap or focus restoration in **any** dialog
  (`SettingsOverlay.tsx:31`, `FeedbackModal.tsx:77`, `ParentsGate.tsx:84`). A keyboard user
  who opens settings and presses Tab walks straight out of the modal onto the page behind
  it, with no visible focus ring (see §1) to tell them where they went. On close, focus
  drops to `<body>` — the trigger button is never restored. `IconMenuButton`'s
  `triggerRef.current?.focus()` pattern (`IconMenuButton.tsx:40,151`) is the fix.
- **[SHOULD-FIX]** `src/shared/ui/OverlayFrame.tsx:90-108` — Success, Failure and
  SessionComplete overlays are `fixed inset-0 z-50` with no dialog role and no live region.
  They cover the whole screen, announce nothing, and auto-dismiss on a timer
  (`SuccessOverlay.tsx:36`, `FailureOverlay.tsx:26`, `SessionCompleteOverlay.tsx:51`). A
  screen-reader user is never told the round resolved. `role="status"` + `aria-live="polite"`
  on the panel would cover it without trapping focus.
- **[BLOCKER]** `src/content/CustomContentScreen.tsx:427-446,722-734` — none of the five
  form inputs has a `<label>`, an `id`/`htmlFor` pair, or even an `aria-label`. They are
  identified by `placeholder` alone ("Slovo (napr. Jahoda)", "Slabiky (napr. ja-ho-da)",
  "Emoji (napr. 🍓)"). Placeholder text disappears the moment the parent types, is not a
  reliable accessible name, and the app-wide grep confirms **`htmlFor` appears exactly once
  in `src/`, in `AvatarPreviewScreen.tsx:370`** — nowhere on a shipping screen.
- **[SHOULD-FIX]** `src/content/CustomContentScreen.tsx:433,440,447,728,735` — `FieldError`
  (`:37-40`) renders validation errors as a bare `<p>` with no `role="alert"`,
  no `aria-live`, and no `aria-describedby`/`aria-invalid` link to the input it describes.
  A parent using a screen reader submits, hears nothing, and has no way to discover why.
- **[SHOULD-FIX]** `src/content/CustomContentScreen.tsx:788-802` — the five section
  switchers are a `<div>` of plain `<button>`s. They behave as tabs (they swap the panel
  below) but carry no `role="tablist"` / `role="tab"` / `aria-selected` /
  `aria-controls`, and no arrow-key navigation. Selection is conveyed by background color
  alone.
- **[SHOULD-FIX]** `src/shared/components/GameLobby.tsx:22-35,74-76` — `renderTitle` splits
  the game title into one `<span class="inline-block">` per character inside the `<h1>`.
  "VIAC ALEBO MENEJ" becomes 16 sibling inline-block boxes. Several screen readers
  announce per-character-boxed text letter by letter. Add `aria-label={title}` to the `<h1>`
  and `aria-hidden="true"` on the decorative span wrapper.
- **[SHOULD-FIX]** Heading structure per screen:
  - `/` home — `<h1>` at `App.tsx:58`, then `<h3>` per game card at `App.tsx:89`. Skips h2.
  - `/settings` — starts at `<h2>` (`SettingsScreen.tsx:44`). **No `<h1>`.**
  - `/content` — starts at `<h2>` (`CustomContentScreen.tsx:787`). **No `<h1>`.**
  - Game boards (`FindItGame.tsx:246-279` and all 11 games) — **no heading at all.**
  - `SettingsOverlay` h2 (`:41`) → h3, `FeedbackModal` h2 (`:82`) → h3 — both fine
    internally but neither screen has an h1 above them.
  - `ErrorBoundary.tsx:32` — `<h2>` with no h1.
  - Overlays render `<h3>` (`SuccessOverlay.tsx:76`, `FailureOverlay.tsx:55`,
    `SessionCompleteOverlay.tsx:76`) with no h1/h2 ancestor.
- **[SHOULD-FIX]** No landmarks on any shipping screen. `<main>` appears once
  (`AvatarPreviewScreen.tsx:264`, dev-gated) and `<header>` once
  (`UiKitScreen.tsx:138`, hidden route). `AppScreen` (`src/shared/ui/AppScreen.tsx:29-51`)
  renders plain `<div>`s — making its outer element `<main>` would fix every screen at once.
  No skip link exists either (`sr-only` appears nowhere in `src/`).
- **Good — icon-only buttons are well labelled.** `IconButton` requires `label: string`
  and applies it as `aria-label` (`IconButton.tsx:12,31`), so every icon button in the app
  is named by construction. `SettingsOverlay.tsx:46` ("Zavrieť nastavenia"),
  `ParentsGate.tsx:132,148` ("Zmazať", "Potvrdiť"),
  `GameLobby.tsx:87` ("Hrať"), and `CountingItemsGame.tsx:186` are all explicitly labelled.
  This is the strongest part of the app's a11y story.
- **Good — decorative elements are hidden.** `aria-hidden="true"` on confetti
  (`OverlayFrame.tsx:40`), home background blurs (`App.tsx:98,99`), lobby decorations
  (`GameLobby.tsx:95,98`), empty counting slots (`CountingItemsGame.tsx:179`), the
  search icon (`FormControls.tsx:172`), and chevrons (`SettingsContent.tsx:99`).
- **Good** — `ToggleControl` uses `aria-pressed` + a dynamic `aria-label`
  ("Vypnúť …"/"Zapnúť …") at `FormControls.tsx:58-59`. `RoundCounter.tsx:17` carries an
  `aria-label` spelling out "N z M kolá". `ParentsGate.tsx:109-110` uses
  `role="status" aria-live="polite"` on the answer display.
- **[NICE-TO-HAVE]** `src/shared/ui/PromptBadge.tsx:19-33` and
  `src/shared/components/AuditoryPromptBadge.tsx:27-38` use `role="button"` + `tabIndex={0}`
  + an Enter/Space `onKeyDown` on a `<div>`-based `Card`. Functionally correct and
  deliberate, but a real `<button>` would get all of it for free plus the default focus ring.
- **[NICE-TO-HAVE]** `src/index.css:86` — `body { user-select: none }` applies app-wide.
  Right for the child-facing games; it means a parent cannot select or copy text on
  `/content` or `/settings` (form controls are exempt via UA styles, prose is not).

---

## 5. Motion and animation

**`prefers-reduced-motion` appears nowhere in the shipping app.** The only match in the
whole repo is `tools/screenshots/capture.mjs:216` (`reducedMotion: 'reduce'`, a Playwright
screenshot option). There is no `@media (prefers-reduced-motion)` block in
`src/index.css`, and no `motion-safe:` / `motion-reduce:` variant anywhere in `src/`.

### Animation inventory

| animation | definition | trigger | duration | guard |
|---|---|---|---|---|
| `overlay-confetti-fall` | `src/index.css:122-143` | Success + SessionComplete overlays | **`animation-iteration-count: infinite`**, 7–12s per particle, **54 particles** | **none** |
| `shake` | `src/index.css:145-158` | wrong answer in ParentsGate (`ParentsGate.tsx:103`) | 0.5s, one-shot | **none** |
| `toggle-pop` | `src/index.css:160-169` | every toggle flip (`FormControls.tsx:73`) | 0.22s, one-shot | **none** |
| `animate-ping` + `animate-pulse` | Tailwind built-ins | `AuditoryPromptBadge.tsx:47,48` while audio plays | **infinite** | **none** |
| `animate-spin` | Tailwind built-in | `FeedbackModal.tsx:150`, `RecordingListItem.tsx:72` | infinite while pending | **none** (loading spinners are conventionally exempt) |
| `active:scale-125 active:rotate-12` | `CountingItemsGame.tsx:187` | tap | transient | n/a |
| `transition-all` / `transition-transform` | `tokens.ts:15,22`, `ChoiceTile.tsx:55`, many | hover/active | short | **none** |

### Findings

- **[SHOULD-FIX]** `src/index.css:122-143` + `src/shared/ui/OverlayFrame.tsx:14-66` — the
  confetti layer renders **54 independently animated, infinitely looping,
  `blur-[1px]`, `will-change: transform, opacity` elements**, drifting across the full
  viewport for as long as the overlay is up. It is the single largest motion surface in
  the app, it fires after every correct answer and at the end of every session, and it has
  no reduced-motion guard. For a vestibular-sensitive user (child or the adult holding the
  tablet) this is the textbook case WCAG 2.3.3 / the `prefers-reduced-motion` query exist
  for. The cheapest complete fix is one CSS block:
  `@media (prefers-reduced-motion: reduce) { .overlay-confetti { display: none } .animate-shake, .animate-toggle-pop { animation: none } }`
  — plus gating `confetti` in `OverlayFrame.tsx:98` on a `matchMedia` read so the 54 DOM
  nodes are not created at all.
- **[SHOULD-FIX]** `src/shared/components/AuditoryPromptBadge.tsx:47-48` — the concentric
  `animate-ping` + `animate-pulse` soundwave rings loop indefinitely while prompt audio
  plays, on the badge the child is meant to be looking at. No guard.
- **[NICE-TO-HAVE]** `src/index.css:155` (`animate-shake`) and `:166`
  (`animate-toggle-pop`) — short one-shot animations, low risk, but they are the two
  custom keyframes the app owns and would be trivial to neutralise in the same media block.
- **[NICE-TO-HAVE]** The app-wide `transition-all` in `uiTokens.pressable`
  (`tokens.ts:22`) and `uiTokens.iconButton` (`tokens.ts:15`) means every press animates.
  Fine as-is; a global `@media (prefers-reduced-motion: reduce) { *, ::before, ::after
  { animation-duration: .01ms !important; transition-duration: .01ms !important } }` would
  cover this and everything above in one rule.

---

## 6. Keyboard operability

### Per-screen assessment

| screen | keyboard-drivable | notes |
|---|---|---|
| `/` home | **yes** | game cards are real `<button>`s (`App.tsx:78`), settings is an `IconButton` |
| `ParentsGate` | **yes, best in app** | full `window` keydown handler at `:65-82` — digits 0-9, Backspace, Enter, Escape — *plus* clickable buttons |
| `/settings` | **yes** | all controls are `<button>`; `SegmentedChoice` → `ChoiceTile` → `<button>` |
| `SettingsOverlay` | **partial** | Escape works (`:21-29`); no trap, no restore (§4) |
| `FeedbackModal` | **partial** | Escape works (`:48-57`); no trap, no restore |
| `/content` | **partial** | everything is a `<button>`/`<input>`, but focus is invisible (§1) and tabs lack arrow-key support (§4) |
| `IconMenuButton` menu | **yes** | ArrowUp/Down/Home/End/Escape/Tab all handled (`:92-134`) |
| all 11 game boards | **yes** | every answer is a `<button>` via `ChoiceTile`; `FindItGame.tsx:268` |
| `AssemblyGame` | **yes** | tap-to-place, **not** drag-and-drop — verified: zero `onPointerDown` / `onDragStart` / `draggable` in `src/games/assembly/AssemblyGame.tsx`. Tiles are `TileButton`s (`:586`, `:568`). This is a genuinely good design choice for a11y |
| Success/Failure/SessionComplete overlays | **partial** | dismiss is backdrop-click only (`OverlayFrame.tsx:91`); no Escape handler. SuccessOverlay has a focusable pause `IconButton` (`:68`), Failure and SessionComplete have **no focusable control at all** |

### Findings

- **No `onClick` on a non-interactive element anywhere in `src/`.** I swept every
  `<div>`/`<span>`/`<li>`/`<p>`/`<a>` with an `onClick` handler. The only two hits are
  `src/shared/ui/OverlayFrame.tsx:91` (backdrop dismiss) and `:100`
  (`stopPropagation` guard) — see below. Everything else is a real `<button>`, or the two
  deliberate `role="button"` + `tabIndex` + `onKeyDown` cards (`PromptBadge.tsx:19-33`,
  `AuditoryPromptBadge.tsx:27-38`). This is notably clean.
- **[SHOULD-FIX]** `src/shared/ui/OverlayFrame.tsx:90-97` — the backdrop has `onClick`
  with no `role`, no `tabIndex`, and no key handler, and `OverlayFrame` registers no
  Escape listener. For `FailureOverlay` and `SessionCompleteOverlay` there is no focusable
  element inside the panel either, so a keyboard-only user **cannot dismiss these
  overlays at all** — they must wait out the 2.5s / 5s timer. Adding an Escape handler in
  `OverlayFrame` covers all three overlays in one place.
- **[SHOULD-FIX]** The tab order behind every modal is live (§4). Combined with the
  missing focus rings (§1), a keyboard user who tabs out of `SettingsOverlay` or
  `ParentsGate` has no way to tell they have left the dialog.
- **[NICE-TO-HAVE]** `src/content/CustomContentScreen.tsx:788-802` — section tabs respond
  to Tab + Enter but not arrow keys, which is what the tab pattern leads users to expect.
- **[NICE-TO-HAVE]** `src/shared/components/ParentsGate.tsx:66-76` binds keydown on
  `window` unconditionally while mounted. Correct today because the gate is the only thing
  on screen, but it will swallow digits from any future input rendered above it.

---

## 7. Text overflow / truncation risk

Slovak strings in this app are long: the longest lobby title is **"VIAC ALEBO MENEJ"**
(16 chars), the longest home description is **"Počúvaj slovo a nájdi prvé písmenko"**
(35 chars), and settings labels reach **"Písmená s dĺžňami a mäkčeňmi"** (28 chars).

### Findings

- **[SHOULD-FIX]** `src/App.tsx:76` + `:81` + `:84` — the home grid is
  `auto-rows-[minmax(11.25rem,auto)]` on mobile (safe, rows grow) but
  **`lg:auto-rows-fr` with `lg:min-h-0`** on large screens. Verified against the built
  stylesheet: `lg\:auto-rows-fr{grid-auto-rows:minmax(0,1fr)}` — `minmax(0, 1fr)` permits
  a row to be **shorter than its content**. The card at `:84` carries `overflow-hidden`.
  With 11 games in `lg:grid-cols-3` that is 4 rows; on a short landscape tablet
  (e.g. 1024×640) each row gets ~120px while the card needs icon (80) + gap (12) +
  `<h3>` (clamp up to 2.4rem, wrapping to 2 lines) + `<p>` (up to 3 lines) + `p-6` padding.
  The description silently clips with no ellipsis. "Počúvaj slovo a nájdi prvé písmenko"
  and "Kde je viac predmetov?" are the first casualties.
- **[SHOULD-FIX]** `src/shared/components/GameLobby.tsx:22-35,74` — `renderTitle` emits one
  `inline-block` span per character into a `flex flex-wrap` container, so **each letter is
  an independent flex item**. When "VIAC ALEBO MENEJ" needs to wrap it breaks at an
  arbitrary letter, not a word boundary — "VIAC ALE" / "BO MENEJ". Each span also carries a
  `rotate()`+`translateY()` transform (`:28`) whose visual box is not accounted for in
  layout, and `py-1 sm:py-2`. The clamp floor is 2.5rem (40px), so on a 360px phone
  16 characters at 40px cannot fit one line and wrapping is guaranteed, not hypothetical.
- **[SHOULD-FIX]** `src/recordings/RecordingListItem.tsx:111,116` — both the label and the
  secondary label use `truncate` (single-line ellipsis). The label is built as
  `` `${word.word} ${word.emoji}` `` (`CustomContentScreen.tsx:376`) or, for phrases,
  `` `${phraseKey}: ${phrase.text}` `` (`:93`) — full sentences. With four 36px action
  buttons plus a status pill competing for the same row on a phone, the flexible label
  column can collapse to well under half the row. Phrase rows on `/content` will be
  unreadable. `line-clamp-2` would be a better fit than `truncate` here.
- **[NICE-TO-HAVE]** `src/shared/components/SettingsContent.tsx:93,125,166,234,288,413` —
  settings row titles use `leading-tight` at `text-xl`/`sm:text-2xl` inside
  `min-w-0 flex-1`. These wrap correctly (no `truncate`, no fixed height) so they are
  safe; noting them because they were called out as a risk area and the `min-w-0` is
  what saves them.
- **[NICE-TO-HAVE]** `src/shared/ui/FormControls.tsx:46` — `ToggleControl` label is
  `<h3 className="text-xl ... sm:text-2xl">` inside `min-w-0`, next to a `shrink-0` 72–96px
  toggle and an optional `shrink-0` 56–64px icon. "Písmená s dĺžňami a mäkčeňmi" at 24px
  in the remaining ~180px on a small phone wraps to 3–4 lines. It wraps rather than
  clipping, so this is layout ugliness, not data loss.
- **[NICE-TO-HAVE]** `src/content/CustomContentScreen.tsx:793` — section tabs are
  `whitespace-nowrap` inside `overflow-x-auto no-scrollbar` (`:788`). Correct behaviour,
  but `no-scrollbar` (`index.css:171-177`) hides the scrollbar entirely, so there is no
  affordance telling the parent that "Pochvaly" exists off the right edge.
- **[NICE-TO-HAVE]** `src/shared/components/SettingsOverlay.tsx:38` — `max-h-[94vh]` with
  `overflow-hidden`; the scroll lives on the inner `SettingsContent` div
  (`SettingsContent.tsx:275`, `overflow-y-auto`). Correct, but the `landscape:` variants
  compress header/footer padding to `py-2`, and combined with `landscape:max-h-[96vh]` on a
  short landscape phone the scrollable middle can be under 100px tall.

---

## 8. Error and empty states

### `/content` (`CustomContentScreen`)

- **[SHOULD-FIX]** **No empty state for the words list.** `EditableWordList`
  (`CustomContentScreen.tsx:354-477`) maps `allUserWords` at `:372`; when the array is
  empty the parent sees a `SectionSummary` reading "Hotové: 0 / Koncepty: 0 / Skryté: 0"
  and a dashed "Pridať slovo" button — no explanatory copy. Reachable in practice: a
  parent who hides every default word (`hideDefaultWord`, `:332`) or deletes every custom
  one lands here. `EditablePraiseList` (`:650-765`) has the identical gap at `:668`.
  Note the "Obnoviť predvolené slová" recovery button (`:362-370`) only renders when
  `hiddenDefaultCount > 0`, so it *is* present in the hide-everything case — good — but the
  screen never says what happened.
- **[NICE-TO-HAVE]** `SystemAudioSection` (`:104-180`) maps a registry-derived list that is
  never empty, so no empty state is needed there.
- **Good** — error handling on `/content` is genuinely thorough. Every mutation is
  wrapped in try/catch with a Slovak recovery message surfaced through `SectionNotice`
  (`:42-49`): save failures (`:318-320`, `:615-617`), hide failures (`:336-338`,
  `:632-634`), restore failures (`:349-351`, `:645-647`). Validation errors render per
  field via `FieldError` (`:37-40`). The gap is announcement, not coverage (see §4).

### `ErrorBoundary`

- **[SHOULD-FIX]** `src/shared/components/ErrorBoundary.tsx:26-46` — the fallback UI is
  child-appropriate in tone (🙈, "Niečo sa pokazilo", "Skús to znova.", a big
  "Skúsiť znova" button) but it is **a dead end for a preschooler**. "Skúsiť znova"
  (`:37`) only clears `hasError` and re-renders the same crashed subtree; if the crash is
  deterministic the child loops forever with no way back to the home screen. There is no
  "Späť domov" escape and no `componentDidCatch` — the error is never logged, so a crash
  in production leaves no trace at all. Contrast note: the `<p>` at `:33` uses
  `opacity-60` at `text-xl` → 2.95:1 on bg-light.
- **[NICE-TO-HAVE]** `ErrorBoundary` wraps every route in `App.tsx` **except** `/` (`:201-210`)
  and `/settings` (`:326-337`). A crash in `HomeLauncher` or `SettingsScreen` takes down
  the whole app with a white screen. `/settings` is the more likely of the two to throw,
  since it touches `localStorage` through `appSettingsStore`.

### Lazy avatar chunk

- **[NICE-TO-HAVE]** `src/avatar/AvatarPresenter.tsx:13` lazy-loads `AvatarScene`, and both
  `Suspense` boundaries — `AvatarPresenter.tsx:127` and `AvatarScene.tsx:109` — use
  **`fallback={null}`**. The ~950 kB three.js chunk downloads with no spinner, no skeleton,
  and no failure state: on a slow connection the avatar area is simply blank, and if the
  chunk 404s after a deploy the `lazy()` promise rejects into the nearest ErrorBoundary
  (or, on `/` where the `HomeAvatarOverlay` lives at `App.tsx:100`, into nothing).
  Low priority — the avatar is gated behind `VITE_AVATAR_POC_ENABLED`
  (`avatarConstants.ts`), so it is off in the shipping build.

### Other states

- **Good** — `FindItGame.tsx:207-217` has a proper empty state ("Žiadne položky" /
  "Pridajte obsah v sekcii pre rodičov." + a "Späť" button) for when a parent hides all
  content for a game. This is the right pattern and it should be copied into
  `EditableWordList` / `EditablePraiseList`.
- **Good** — `SettingsContent.tsx:455-459` has an empty state for games with no settings
  ("Táto hra nemá žiadne ďalšie nastavenia.").
- **Good** — `FeedbackModal.tsx:155-159` renders a submit-failure message, and `:88-98` a
  success state. `PwaHomeControl.tsx:110-114` handles service-worker registration failure.
- **Good** — `src/shared/services/audioManager.ts` falls back per clip to `sk-SK` Web
  Speech TTS, so a missing audio file degrades rather than erroring.

---

## Summary by severity

**BLOCKER (4)**
1. `CustomContentScreen.tsx:428,435,442,723,730` — `outline-none` on all five parent form inputs, no focus replacement.
2. `FormControls.tsx:182,209` — `SearchInput` + `TextAreaControl` remove the outline; replacements measure 1.23:1 and 1.56:1.
3. `ParentsGate.tsx:84-90` — no `role="dialog"`, no `aria-modal`, no accessible name on the parental gate.
4. `CustomContentScreen.tsx:427-446,722-734` — five inputs with no label, no `htmlFor`/`id`, no `aria-label`; placeholder-only.

**SHOULD-FIX (24)** — see sections above; the highest-leverage clusters are:
- One `@media (prefers-reduced-motion: reduce)` block neutralises the 54-particle infinite confetti and every other animation (§5).
- One focus-ring token in `uiTokens` fixes §1 app-wide.
- One focus-trap/restore helper applied to the three dialogs fixes most of §4.
- Changing `opacity-55` → `opacity-70` on settings descriptions fixes the most-repeated contrast failure (§2).

**NICE-TO-HAVE (19)** — polish; none blocks release.

**Notably good** — icon buttons labelled by construction via `IconButton`'s required
`label` prop; decorative elements consistently `aria-hidden`; `IconMenuButton`'s complete
menu keyboard model; Assembly implemented as tap-to-place rather than drag-and-drop;
zero `onClick` on non-interactive elements; thorough try/catch + Slovak recovery copy on
`/content`; `text-main` on `bg-light` and on white both clear AAA.
