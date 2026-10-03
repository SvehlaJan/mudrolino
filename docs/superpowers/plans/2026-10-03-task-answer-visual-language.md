# Task and Answer Visual Language Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking. The user approved implementation and then requested uniform Slová-style answer cards and tile transfer animations for placement games.

**Goal:** Make gameplay answers consistently raised tiles and task content consistently flat across all eleven games.

**Architecture:** Keep `TactilePiece` as the shared seam. Use the Slová picture-card appearance for every answer; material decoration applies only to task content. Preserve existing answer layout and game state, and flatten supporting pictures/counters. Square proportions remain the default; wider rectangular choices are permitted when content needs room.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Playwright, existing verification profiles.

**Design:** `docs/audits/2026-10-03-task-answer-visual-language.md`.

## Task 1: Establish the role contract and migrate tactile consumers atomically

**Modify:**

- `src/shared/game/materials/TactilePiece.tsx`
- `src/shared/game/materials/QuantityTray.tsx`
- `src/shared/game/materials/BalancePlayfield.tsx`
- `src/shared/components/FindItGame.tsx`
- `src/games/first-letter/FirstLetterGame.tsx`
- `src/games/assembly/AssemblyGame.tsx`
- `src/games/complete-letter/CompleteLetterGame.tsx`
- `src/games/complete-syllable/CompleteSyllableGame.tsx`
- `src/games/counting/CountingItemsGame.tsx`
- `src/games/addition/AdditionGame.tsx`
- `src/shared/ui/UiKitScreen.tsx`

**Test:** `e2e/game-play-review.spec.ts`, `e2e/game-shell.spec.ts`.

- [x] Extend the existing browser review spec with a first-round answer-style check for each catalog route. Use the existing silent fixture and oracle wait; do not infer correct answers or duplicate audio/session tests. For every answer button, require visible elevation and a rounded quadrilateral outline, using computed styles rather than a new data marker as the assertion:

```ts
const styles = await page.getByTestId('game-answer-region').locator('button')
  .evaluateAll(buttons => buttons.map(button => {
    const css = getComputedStyle(button);
    const box = button.getBoundingClientRect();
    return { radius: parseFloat(css.borderTopLeftRadius), shadow: css.boxShadow,
      width: box.width, height: box.height };
  }));
expect(styles.length).toBeGreaterThan(0);
for (const style of styles) {
  expect(style.radius).toBe(22);
  expect(style.radius).toBeLessThan(Math.min(style.width, style.height) / 2);
  expect(style.shadow).toContain('0px 5px');
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
}
```

Run this new check before implementation. Expect failures for magnet's circular corners, felt's absent elevation and picture's inconsistent corner radius.

- [x] Add the required role and export it alongside existing material/state types. Destructure it so it is not spread as an invalid HTML attribute. Preserve all existing accessible naming and state handling:

```ts
export type TactileVisualRole = 'answer' | 'task';
// Add to TactilePieceProps:
visualRole: TactileVisualRole;
```

- [x] Replace material classes with decoration-only variants; remove paper's clipping polygon because it would cut an answer shadow. Add a visual-role variant to the same `cva` declaration:

```ts
material: {
  wood: 'border-b-4 border-r-4 border-black/15 bg-bg-light',
  magnet: 'border-4 border-double border-black/20 bg-white',
  felt: 'border-2 border-dashed border-black/25 bg-white',
  picture: 'border border-white/70 bg-white p-1',
  counter: 'border border-black/15 bg-white',
  paper: 'border border-black/10 bg-white',
},
visualRole: {
  answer: 'rounded-[22px] border border-white/70 bg-white p-1 shadow-block',
  task: 'rounded-full',
},
```

Call `tactileMaterialVariants({ material: visualRole === 'task' ? material : null, visualRole })` so all answers ignore material decoration. Publish `data-visual-role={visualRole}` on the button and span for diagnostics. Do not add a shadow utility to the task variant; computed shadow should be `none`.

- [x] Apply press-depth styles only to operable answer buttons. Passive task spans must never inherit a pressed shadow:

```ts
const sharedClassName = cn(
  tactileMaterialVariants({ material: visualRole === 'task' ? material : null, visualRole }),
  as === 'button' && !isEffectiveDisabled &&
    (visualRole === 'answer' ? pressClassName : 'active:opacity-85'),
  className,
);
```

- [x] Add `visualRole="answer"` to every scored choice, both Assembly tile locations, and both comparison cards. Add `visualRole="task"` to the counter piece inside `QuantityTray`. Keep material selections in descriptors unchanged; `FindItGame` assigns the answer role once for all four grid games.
- [x] Update all UI-kit usages explicitly. Render the material showcase as two labelled rows, task and answer; keep existing settled/retry/disabled examples and compact answers. The existing wildcard exports in `src/shared/game/materials/index.ts` and `src/shared/game/index.ts` should expose the new type without another export layer; confirm TypeScript imports resolve.
- [x] Run `npm run lint`. Resolve every missing-role type error; enumerate callers with `rg -n '<TactilePiece' src` to ensure no game is omitted. Run the new style check again; expect all eleven routes to pass without rewriting `AnswerGroup` geometry.

## Task 2: Make picture prompts unambiguously flat task content

**Modify:** `src/shared/game/materials/PictureCard.tsx`, `src/shared/game/materials/WordRail.tsx`, `src/shared/ui/UiKitScreen.tsx`.

**Test:** `e2e/game-play-review.spec.ts`, existing literacy and Assembly layout specs.

- [x] Add assertions that picture prompts, rails and counters have computed `box-shadow: none`. Exercise object mode in counting/addition/comparison so numerical mode cannot accidentally bypass the counter check.
- [x] Remove the undefined `shadow-card` class from `PictureCard` and `WordRail`. Keep the rail's existing flat fill, spacing and slot layout; do not define `shadow-card` in the theme.
- [x] Move picture fill/border to a circular image frame inside the figure, leaving the optional caption outside. Use `aspect-square rounded-full border border-border-subtle bg-surface` for the frame and `grid place-items-center` for alignment. Keep emoji's existing `role="img"` and accessible label; the frame adds no interactive role or press animation.
- [x] Retain the current desktop/narrow/short prompt height budgets. Size the image frame and emoji together inside those budgets: avoid retaining the old rectangular padding around an additional full-size circle. At narrow width and short height, require equal frame width/height without increasing the total picture-plus-rail footprint. Caption demos must remain readable outside the circle.
- [x] Keep circular counters' existing layout positions and measured dimensions. Counting's outer token buttons retain native interaction, focus and 48px minimum; remove only the inner piece's elevation. Comparison cards remain raised rectangles with flat objects inside.
- [x] Verify Assembly placed/return/drag animation appearances and empty positions. Keep raised movable pieces above the flat slot, allow enough room for their 5px solid shadow, and preserve current tile-size/label-size variables, clone classes and reduced-motion behavior.

## Task 3: Verify constrained layouts and record delivery

**Modify:** `e2e/game-play-review.spec.ts`, `ROADMAP.md`.
**Create:** `docs/superpowers/handoffs/2026-10-03-task-answer-visual-language.md` after implementation.

- [x] Tag viewport-sensitive additions `@geometry` and let the existing integration projects own 320×568, 667×375 and desktop. Do not create another nested ten-viewport loop. Reuse the existing shadow-clipping regression and expand its answer coverage to raised felt/magnet tiles and placed Assembly tiles.
- [x] Include long syllables, Slovak digraph letters, six/eight-choice settings, maximum counting range, and Assembly placement/return. Preserve the existing functional checks for focus, disabled input, item-before-verdict audio, hidden retry status and scattering; do not copy them into the new style test.
- [x] Run focused browser specs while editing using the existing test preview/build workflow. After the shared-material change is integrated, run `npm run verify:integration`. Expected: clean lint, unit/pure verifiers, development audio inventory and the representative browser suite. Run `npm run build` and `npm run verify:bundle`; expect successful production build and intact lazy avatar boundary.
- [x] Capture the eleven active round scenes plus `assembly-placed` at the three representative viewports using seeded `npm run shots`. Inspect only 320px review copies. Require no overflow, no clipped solid shadow, visible focus, readable content and a clear task/answer distinction. Capture retries only if those checks reveal a changed state-layout risk; this work should not require a fresh 550-image parent/release matrix.
- [x] Save verification results and evidence provenance in the handoff. Mark the ROADMAP task complete only after implementation and checks pass. Keep the missing recordings task pending until clips are recorded; the exhaustive release gate still runs before deployment to friends and colleagues.

## Plan review

The role migration covers all five inconsistent answer games and the already-consistent games. Task flattening covers all three counter consumers and all four literacy picture consumers. Rectangular comparison choices remain permitted. Assembly's placed answers, animation clones, token interaction, captions, responsive space, UI-kit documentation and existing behavior protection each have an explicit step. The original style change needs no routing, session-controller, audio or settings refactor. Subsequent user requests add a development-only gallery route and a small answer-resolution boundary for tile transfers; the audio service and settings remain unchanged.


## Task 4: Development-only component gallery (additional user request)

**Design:** `docs/superpowers/specs/2026-10-03-dev-component-gallery.md`.

- [x] Generate a deterministic app-wide inventory of exported and local UI components, including source paths, usage references and source-only status. Search by name/source/usage and filter by category. Do not import avatar renderers.
- [x] Preserve existing UI-kit live examples. Link each inventory entry only to an actual example or its normal composition; distinguish legacy/source-only entries accurately.
- [x] Lazy-load the gallery only in development/test builds; production `/ui-kit` redirects home and no gallery code ships. Verify inventory freshness, search, native interactions, accessibility and production exclusion.

## Task 5: Restore tile placement motion (additional user request)

- [x] Restore Assembly's source lookup across the answer tray and question rail, including place/return/reset transfer cleanup and inherited tile typography.
- [x] Add cancellable transfers from correct guided letter/syllable answers into the active question blank; uniform scaling preserves glyph proportions and fits the destination. Reveal the filled slot after landing. Wrong answers stay in the tray.
- [x] Enter the normal resolving phase immediately, play item audio first, and await landing before outcome/progress. Add an optional answer-controller `beforeOutcome` boundary rather than leaving an answerable phase during flight. Guard cancellation against stale outcomes.
- [x] On exit, round replacement, pause, error or replay, remove clones and restore originals. Keep clones inert and hidden from accessibility APIs. Reduced motion or unavailable animation places immediately; an animation failure must never make the correct answer unusable.
- [x] Verify actual travel/arrival, selection locking, keyboard continuation, exit cleanup, reduced motion, unavailable animation and long-label fit with focused behavioral checks, then run the integrated gate.


Completed verification and provenance: `docs/superpowers/handoffs/2026-10-03-task-answer-visual-language.md`.
