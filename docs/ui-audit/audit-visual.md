# Visual audit — screenshot review

Source: `tools/screenshots/capture.mjs`, 37 scenes × 7 viewports (259 captures).
Viewports: phone-portrait 390×844, phone-landscape 844×390, phone-small 360×640,
tablet-portrait 768×1024, tablet-landscape 1024×768, desktop 1440×900, desktop-wide 1920×1080.

---

## A. Functional defects found while navigating

### A1. The parents gate is bypassable three ways [BLOCKER]
Verified empirically against the running dev server:

| Path | Result |
|---|---|
| Type `/settings` directly | Parent zone opens, no gate |
| Type `/content` directly | Recording manager opens, no gate |
| Parent enters via gate → returns home → press Back once | Parent zone reopens, no gate |

The third is the one that matters: it needs no typing, and Android's hardware Back
button does it. A child handed the tablet after a parent changed a setting is one
tap from the screen that deletes their recordings.

Cause: `src/App.tsx:176` does `navigate('/settings')` (a push), and
`SettingsScreen`'s back button pushes `/` on top. The gate is a piece of component
state (`settingsScreen === 'gate'`), not a property of the route, so history
replay skips it. `/content` (`src/App.tsx:309`) and `/settings` (`src/App.tsx:326`)
have no guard at all.

Fix: make the gate a route guard. Hold "gate passed" in state with a timestamp,
have `/settings` and `/content` render the gate when it is unset or stale, and use
`navigate('/settings', { replace: true })` so the gate is not left in history.

### A2. Answer tiles clip below the fold [SHOULD-FIX]
`game-alphabet-round__phone-portrait`: the 4×2 tile grid runs past the bottom of a
390×844 viewport; the last row is cut. Same in `phone-landscape` (844×390) and
`phone-small`. A child can miss the correct answer because it is off-screen, and
nothing indicates the screen scrolls.

### A3. Compare game shows no prompt [SHOULD-FIX]
`game-compare-round__*`: two cards of butterflies and nothing else — no question
text, no prompt badge. Every other game shows a "Počúvaj" prompt. If the
instruction is audio-only, a muted device leaves the round unsolvable.

---

## B. Aspect-ratio failures

### B1. Settings is unusable on a landscape phone [BLOCKER]
`settings-parent-zone__phone-landscape` (844×390): the back button, title and
subtitle eat ~55% of the viewport height. Exactly one settings card is partly
visible below the fold.

Cause: `SettingsScreen` sizes type on **width** breakpoints — `text-3xl sm:text-5xl`
(`src/shared/components/SettingsScreen.tsx:44`). At 844px wide the `sm:` variant
fires and the title jumps to 48px, but the constraint in landscape is **height**.

`ParentsGate` gets this right — it carries explicit `landscape:` variants
throughout — which is why the gate looks fine at the same size. The two screens
disagree about how to handle the same problem.

### B2. Dead space dominates the tall viewports
- `game-assembly-round__phone-portrait`: ~55% of the screen is empty cream between
  the prompt card and the answer tray.
- `game-compare-round__phone-portrait`: ~45% empty, split top and bottom.
- `settings-parent-zone__tablet-portrait`: bottom ~35% empty.

Content is pinned with `justify-between` or stacked from the top instead of being
distributed or scaled. On a tablet this reads as an unfinished screen.

### B3. Glyph size does not track tile size
`game-alphabet-round`: in landscape the letters fill their tiles handsomely; in
portrait the tiles grow but the font does not, leaving a small glyph adrift in a
~300×300px white square. The tile and its content scale on different rules.

---

## C. Consistency defects

### C1. Two design languages in one app
The parent-facing `/content` screen does not look like the rest of the app:

| | Settings / games | `/content` |
|---|---|---|
| Row treatment | Icon tile + large radius + `shadow-block` hard edge | Flat row, soft ambient shadow, no icon |
| Accent | Pastel periwinkle / mint | Saturated `#f53d4c` red pill |
| Title alignment | Centered | Left-aligned |

The red tab pill is the `primary`/danger token used as a *selection* colour. It is
the most saturated element in the app and it marks "which tab am I on".

### C2. Selected-vs-unselected reads as enabled-vs-disabled
In every `SegmentedChoice` (font picker, counting range, all game settings), the
unselected option is cream (`bg-bg-light`-ish) on a white card — barely
distinguishable from the card, and much closer to the disabled styling than to an
available choice. Users read it as "this option is off-limits" rather than "tap me".

### C3. Modal backdrop is invisible
`SettingsOverlay` uses `bg-bg-light/95 backdrop-blur-md`
(`src/shared/components/SettingsOverlay.tsx:33`) — a near-opaque *cream* scrim over
a cream app. The result (`game-*-settings-overlay__*`) is a card marooned on a flat
field with no sense of the game behind it. A dim scrim (`bg-text-main/40`) would
restore depth and signal "this is temporary".

### C4. Primary action styled as the weakest element
- `SettingsOverlay`'s "Hotovo" is `variant="quiet"` — white on white, the least
  prominent thing in the dialog, while the ✕ beside it does the same job.
  Two dismiss affordances, and the primary one looks secondary.
- In the UI kit (`ui-kit__phone-portrait`), "Primárne" is pale periwinkle while
  "Dôležité" is saturated red. The hierarchy is inverted: the everyday action is
  the quietest, the rare destructive one shouts.

### C5. Home cards have ragged baselines
`home__phone-portrait`, row 3: "Viac alebo Menej" wraps to two lines, "Sčítaj"
does not, so the two cards' icons and titles sit at different heights. Card height
is content-driven with no shared baseline. This is the most visible unpolished
signal on the app's first screen. Desktop hides it (titles fit one line); phone
and tablet portrait show it on most rows.

### C6. Game icon colours carry no meaning
Home cards cycle red, mint, periwinkle, pink, periwinkle, pink, pink, mint, red
with no relationship to what the game teaches. Letters, numbers and words are not
grouped by hue, and neighbouring cards repeat colours. It reads as random rather
than as a system.

### C7. The same control gets different weight on different screens
The home settings gear (`home__*`) is a cream circle on cream with a faint shadow —
nearly invisible. The back button on every other screen is white with a heavy
`shadow-block`. Both are `IconButton`. If hiding the gear from children is
deliberate it should be a named variant, not an accident.

### C8. Two speaker controls, one job
`game-*-round`: a white circular speaker sits top-right while a "Počúvaj" pill with
a red speaker in a pink halo sits below the header. They look unrelated but both
play audio. The red-on-pink halo is also the only place that colour pairing appears.

---

## D. Smaller items

- **`/content` tab bar clips with no affordance.** On phone portrait the fifth tab
  ("Pochvaly") is cut mid-word at the viewport edge; no fade, arrow, or peek
  signals that the row scrolls.
- **Row selection circles are invisible.** The `○` at the left of each `/content`
  row is roughly 12–14px at very low contrast — far below any touch-target
  minimum, and its purpose is unreadable.
- **Chevrons are thin and pale.** The `>` on settings rows is a light hairline
  against cream; it barely registers as "this navigates".
- **Wide viewports leave the games grid narrow.** In `game-*-round__phone-landscape`
  the tile grid is centred in a narrow column with large empty margins left and
  right, while vertical space — the scarce axis — is what clips.
- **Ragged final row on desktop home.** 11 games in a 3-column grid leaves a
  2-card final row with a gap.
- **Segmented labels wrap.** "Zaoblené (Nunito)" breaks to two lines on phone
  portrait, making the two options different heights.
