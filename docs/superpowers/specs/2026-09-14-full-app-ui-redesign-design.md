# Full-App UI Redesign Design

## Status

Approved through interactive brainstorming on 2026-09-14. This document is the
authoritative product and architecture specification for the redesign. The
implementation plan must break it into separate, sequential phases; it must not
reinterpret the approved direction.

## Context

Hravé Učenie is a local-first Slovak educational PWA for preschool children.
The current repository contains eleven catalogued games, a parent gate, global
and per-game settings, custom words and praise, local audio recording, feedback,
an installable/offline PWA shell, and a repo-owned component library.

The pre-publication audit in `docs/ui-audit/` found a strong visual baseline but
also found release blockers and systemic inconsistencies: protected routes can
bypass the parent gate, game answers clip at short viewports, parent inputs and
dialogs have accessibility gaps, selection semantics are visual-only, parent
settings are split across hard-to-discover entry points, custom-content editing
does not scale to narrow screens, and repeated one-off styling has weakened the
shared component contract.

This redesign is required before the upcoming publication. It is not a small
polish pass. The complete app must move to one scalable, responsive, accessible
system before release.

This specification supersedes earlier visual or component-library decisions
where they conflict, including the “not a redesign” constraint in
`2026-04-25-ui-component-library-consolidation-design.md`. Existing game logic,
content, local data, audio behavior, PWA behavior, and useful component work are
inputs to preserve, not reasons to preserve one-off presentation.

## Approved Direction

The selected direction is a foundation-first redesign with two related modes:

- **Child mode — Living Toybox.** Large tactile objects, recognizable materials,
  springy physical feedback, simple language, and minimal nonessential chrome.
- **Parent mode — calm control surface.** Conventional navigation, compact
  information, explicit labels, restrained motion, and predictable form
  behavior.

Both modes share the existing visual family: warm cream, white, brown, coral,
periwinkle blue, mint, yellow/orange, and soft watermelon. The palette’s
character must remain recognizable. New darker or lighter semantic shades may
be derived where necessary for WCAG contrast.

Games must not receive unrelated full-card or full-screen color identities.
Home cards remain light or white. Shared colors may appear inside icon tiles,
actions, tactile pieces, state feedback, and restrained decoration. A game’s
identity comes from its objects, playfield, and mechanic rather than a unique
theme color.

## Goals

- Redesign every shipping child and parent surface before publication.
- Make all functionality available on desktop, tablet, mobile portrait, and
  mobile landscape through one universal responsive UI.
- Make the home, parent settings, and game architecture scale to future games
  without route-specific condition matrices or duplicated shells.
- Preserve the current game mechanics, content, audio contract, local-first
  persistence, offline support, and installed-PWA behavior.
- Establish an accessible component system backed by a proven headless
  component library while retaining the custom visual language.
- Give all eleven current games a coherent Living Toybox treatment.
- Make parent settings discoverable from one dashboard and reusable from game
  lobbies.
- Make custom words, praise, and audio safe and usable at every viewport.
- Produce objective responsive, accessibility, behavior, and regression gates
  for each delivery phase.

## Non-Goals

- No avatar UI, 3D model work, runtime integration, placeholder, or bundle work.
  The future avatar concept is a friendly buddy who cheers children, but it
  first needs more robust models and a separate specification. `/avatar-preview`
  is a developer diagnostic route, not a shipping redesign surface, and the
  release configuration must keep `VITE_AVATAR_POC_ENABLED` disabled.
- No persistent achievements, streaks, currency, sticker collection, toy shelf,
  progression map, or other gamification. These belong in the backlog.
- No new game mechanics, learning content, accounts, backend, analytics,
  subscriptions, or language rollout.
- No desktop-only or mobile-only capability.
- No wholesale adoption of a styled design system such as Material UI.
- No release containing a mixture of the old and new design systems.

## Design Principles

1. **One system, two modes.** Child and parent surfaces differ in density and
   expressiveness, not in basic semantics, tokens, or quality.
2. **Objects before decoration.** Playfulness comes from meaningful tactile
   pieces and feedback, not decorative clutter.
3. **Color communicates state.** Color signals action, selection, success,
   warning, and grouping; it does not brand every game independently.
4. **Universal capability.** Responsive layouts reflow the same functionality.
   They do not remove or simplify capabilities based on viewport.
5. **Catalog-driven scale.** Adding a game or category should extend metadata
   and game content, not require editing multiple route and settings switchboards.
6. **Accessible by default.** Correct semantics, focus, contrast, targets, and
   reduced motion live in shared primitives.
7. **Preserve learning behavior.** Redesign presentation and interaction without
   silently changing round rules, content pools, persistence, or audio ordering.

## Information Architecture

### Child navigation

The child journey remains shallow:

```text
Grouped home
  └─ Game lobby
       └─ Game round shell
            ├─ next round
            └─ session completion
```

The home is a single page. It initially groups games into **Písmená a slová**
and **Čísla a počítanie**, keeping every game one tap away. Categories are data,
not hard-coded layout branches, so future categories can be inserted without a
home-screen rewrite.

Every game uses the same high-level journey:

1. Select a white/light card on the grouped home.
2. See a compact lobby with a plain-language instruction, a preview of the
   game’s tactile pieces, one primary **Hrať** action, and settings only when the
   game exposes settings.
3. Play inside the shared round shell.
4. Receive immediate visual, motion, and audio feedback.
5. Finish with a short celebration and explicit **Hrať znova** and **Domov**
   actions.

### Parent navigation

All parent entry points lead to one protected hierarchy:

```text
Parent gate
  └─ Parent dashboard
       ├─ Game settings overview
       │    └─ Individual game settings
       ├─ Custom content
       ├─ App and display
       └─ Help and feedback
```

The dashboard first shows quick settings and four destinations:

- **Nastavenia hier** — ranges, difficulty, representation, and other
  catalogued game controls.
- **Vlastný obsah** — words, praise, bundled phrases, and local recordings.
- **Aplikácia a vzhľad** — font and future genuinely global preferences.
- **Pomoc a spätná väzba** — help and feedback submission.

Home settings opens the dashboard. A game-lobby settings action passes through
the same parent gate and deep-links into that game’s settings inside the same
system. Games with no configurable values do not render a settings action.

### Parent lock lifetime

The user explicitly chose “ask each time.” The exact contract is:

- Every fresh transition from a child-facing route into protected parent
  content requires the parent gate.
- Direct navigation, restored history, reload, and deep links cannot render
  parent content before the gate succeeds.
- Navigation among parent dashboard, game settings, content, and feedback during
  the current parent flow does not ask repeatedly.
- Returning to any child-facing route ends the in-memory authorization. The next
  entry asks again.
- Authorization is never persisted to local storage or session storage.
- History replacement must prevent Back from revealing an already-authorized
  parent screen after the flow has ended.

### Protected route matrix

The redesign uses this route contract. All protected routes are wrapped by one
route-level parent guard before their content components render.

| Route | Destination | Gate behavior |
|---|---|---|
| `/` | grouped child home | public |
| each catalogued game path | lobby or active child game | public |
| `/settings` | parent dashboard | gate on fresh entry |
| `/settings/games` | game settings overview | gate on fresh entry |
| `/settings/games/:gameId` | one game’s settings | gate on fresh entry; unknown IDs show a safe parent-area not-found state |
| `/settings/app` | app and display settings | gate on fresh entry |
| `/settings/help` | help and feedback | gate on fresh entry |
| `/content` | custom-content manager | gate on fresh entry |
| `/recordings` | legacy replace-redirect to `/content` | parent guard still runs before content appears |

The guard stores the requested protected destination only in memory for the
current navigation. Successful entry replaces the gate/history entry with that
destination. A lobby settings action navigates to
`/settings/games/:gameId` with a validated catalogued child return path in router
state; closing/back returns to that lobby. Direct links or reloads without a
valid return path fall back to `/`. Leaving the protected route group clears the
authorization before child UI becomes interactive.

Phase 1 must commit automated coverage for direct navigation, Back, Forward,
reload, legacy redirect, unknown game ID, home entry, lobby deep-link entry, and
leaving/re-entering the protected group.

## Scalable Catalog and Settings Architecture

### Game catalog

`src/shared/gameCatalog.tsx` remains the source of truth and must expand from
presentation metadata into a scalable capability registry. Each game definition
must describe, either directly or by referenced presets:

- stable game ID and route;
- localized title and description keys;
- category and order;
- icon/tactile preview metadata;
- lobby copy and shell configuration;
- supported settings IDs;
- prompt mode and repeat-audio capability;
- playfield/answer layout capability;
- a lazy game component or module reference used by route registration.

The catalog must not store arbitrary Tailwind class fragments as its primary
styling API. It should select typed semantic variants or named visual presets.

Home grouping, route registration, lobby registration, settings visibility, and
parent game lists must derive from the catalog. The implementation may split
serializable presentation metadata from a lazy module registry to avoid import
cycles, but both must share the same `GameId` and fail verification when their
IDs diverge. Adding a future game should require one paired catalog/module entry,
the game implementation, its content, and tests—not separate edits to the home,
route, lobby, and settings visibility matrices.

### Settings registry

Replace the sparse per-target Boolean matrix in
`src/shared/components/settingsContentData.ts` with a registry keyed by stable
setting ID. Each definition should own:

- localized label and description;
- control type and valid options;
- default value and persistence adapter;
- applicable game IDs or capabilities;
- semantic tone/icon metadata;
- dependency and validation rules;
- optional summary formatting for dashboard rows.

The current settings inventory that must remain behaviorally available is:

| Game | Settings |
|---|---|
| Abeceda | accented letters; 4/6/8 choices |
| Slabiky | 4/6 choices |
| Čísla | range 1–5/10/20 |
| Spočítaj | range 1–5/10 |
| Viac alebo menej | objects/numerals; range 1–5/10 |
| Sčítaj | objects/numerals; sum range 5/10/20/100 |
| Prvé písmenko | accented letters |
| Doplň písmeno | accented letters; missing count 1/2/adaptive |
| Slová | no current game-specific setting |
| Skladaj | no current game-specific setting |
| Doplň slabiku | no current game-specific setting |

Dependent values must explain automatic changes. For example, selecting an
addition range that cannot support object representation may switch to numerals,
but the UI must state why and the domain service must enforce the same invariant.

Settings save immediately. A subtle, non-blocking status communicates saving,
saved, and failure states. Closing a parent surface never discards unseen edits
or requires a separate Save action.

## Visual System

### Palette

Preserve the existing palette family:

- warm cream background (`#F4F1EA` family);
- white surfaces;
- warm brown primary text (`#5D453E` family);
- coral/red primary accent;
- mint success;
- periwinkle blue;
- yellow/orange;
- soft watermelon.

Exact legacy foreground/background pairings are not sacred when they fail
contrast. Introduce semantic tokens such as `text-muted`, `focus`,
`interactive-primary`, `interactive-danger`, `success-surface`, and
`selected-surface` using related shades that meet WCAG requirements.
Opacity must not be the default method for muting normal-size text.

### Type, shape, and elevation

- Nunito remains the default; Shantell Sans remains the parent-selectable
  alternative.
- Child headings and game objects are bold and spacious. Parent typography is
  calmer, smaller, and denser while staying readable.
- Use a restrained radius scale instead of screen-specific arbitrary radii.
- Tactile child controls may use shallow block shadows and press travel.
- Parent surfaces use subtle borders and diffused elevation.
- Destructive actions use a semantic danger treatment; saturated red is not a
  generic selected-tab color.

### Living Toybox materials

The system should provide reusable named material presets rather than isolated
game artwork:

- wooden block;
- magnetic tile;
- felt piece;
- picture/flash card;
- counting token;
- tray or word rail;
- inset slot;
- paper/sticker accent.

Material identity comes from shape, edge treatment, texture, shadow, placement,
and motion. All materials share the app palette and remain legible without
texture or motion.

## Component-Library Strategy

Keep React, Tailwind v4, and the repo-owned `src/shared/ui/` public API. Add
Radix Primitives selectively as the behavior and accessibility layer. Resolve
current compatible package versions during implementation.

Recommended Radix primitives:

- Dialog for the parent gate, settings, feedback, and focused editors;
- Alert Dialog for destructive confirmations;
- Radio Group for persistent one-of-many settings;
- Switch for Boolean settings;
- Tabs for custom-content categories where tabs remain the correct pattern;
- Dropdown Menu for compact row actions.

Add `class-variance-authority` and `tailwind-merge`. Application components use
typed semantic properties such as `tone`, `size`, `density`, `material`, and
`surface`; they do not depend on exact raw class-name strings or `!important`
repairs.

Third-party components must stay behind repo-owned wrappers. The component
system has four levels:

1. **Foundations:** tokens, typography, spacing, radii, shadows, focus rings,
   motion, safe areas, and responsive layout modes.
2. **Controls:** buttons, icon buttons, answer tiles, switches, radio groups,
   tabs, fields, menus, and dialogs.
3. **Patterns:** page headers, setting rows, list rows, prompt panels, progress,
   audio replay, recording states, empty/error states, and feedback states.
4. **Shells:** responsive app screen, grouped home, game lobby, parent area, and
   game round.

The hidden `/ui-kit` route remains the review surface. Every shared component
must document normal, hover/focus where applicable, pressed, selected, disabled,
loading, error, success, reduced-motion, and narrow-layout states. A component
change and its UI-kit example are one atomic change.

Migration ownership is explicit:

- Phase 1 changes `ParentsGate` behavior and route protection only; it does not
  invent a second temporary dialog abstraction.
- Phase 2 creates the Radix-backed dialog wrapper and immediately migrates
  `ParentsGate` as its reference production use.
- Phase 4 migrates/replaces `SettingsOverlay`, `FeedbackModal`, destructive
  confirmations, and custom-content editor dialogs using the Phase 2 wrappers.
- No phase may leave a newly introduced shared primitive unused without a
  documented Phase 4 consumer and UI-kit example.

## Child Experience

### Shared game shell

The game shell standardizes:

- back navigation;
- accessible game title;
- progress/round status;
- visible prompt and repeat-audio action;
- bounded responsive playfield;
- answer region;
- visual and announced result feedback;
- session completion actions;
- pausing while a permitted parent dialog is open.

Individual games own their playfield and mechanics. They do not reimplement the
shell. The shell state contract covers:

```text
loading → ready/listening → awaiting-answer
  ├─ answered-incorrectly → awaiting-answer or existing failure rule
  └─ answered-correctly → transitioning → next-round/session-complete

Any state may enter recoverable-error.
Parent overlays pause the active state without losing it.
```

This contract describes presentation and coordination. Existing per-game round
rules remain authoritative unless a later feature specification changes them.

### Tactile mapping for current games

| Game | Living Toybox treatment |
|---|---|
| Abeceda | chunky letter blocks |
| Slabiky | paired magnetic syllable tiles |
| Čísla | wooden number pieces |
| Slová | picture cards from a small flipbook |
| Prvé písmenko | picture card plus letter magnets |
| Skladaj | felt syllables placed into a word rail |
| Doplň slabiku | a missing felt piece fitted into a word |
| Doplň písmeno | a magnetic letter fitted into a word |
| Spočítaj | physical counters gathered on a tray |
| Viac alebo menej | two object trays with a balance-scale motif |
| Sčítaj | two groups sliding together into one counting tray |

These are reusable rendering presets, not eleven independent art systems. A
future game should compose existing shell slots and material primitives or add
one documented primitive.

### Feedback and audio

- Correct choices snap and settle, then show a brief celebration.
- Incorrect choices respond gently with visible retry text, an assistive
  announcement, and existing audio behavior. Feedback never relies on shake,
  color, or audio alone.
- Input locks only long enough to prevent duplicate answers.
- The existing answer-audio contract is preserved: the tapped or target item’s
  own audio plays first, followed by praise on success or the shared retry phrase
  on error. Assembly preserves its documented bespoke wrong-answer exception.
- Critical instructions are visible even when a prompt is primarily auditory.
- The repeat-audio control stays visible and consistent.
- Persistent rewards are not introduced.

## Parent Experience

### Dashboard and game settings

The parent UI is a compact dashboard with drill-down, not one giant settings
page and not a game-only grid. It presents current-value summaries, then opens
focused groups of settings. Home and lobby entry points render the same settings
content through host-agnostic components.

On a spacious desktop the parent route may show navigation, list, and detail
side by side. On a narrow or short viewport those same regions stack or appear
in a full-screen dialog. No field, action, explanation, or status is removed.

### Parent gate automation adapter

The production gate cannot have a bypass. Test-mode builds must expose a stable
adapter for E2E and screenshot automation, extending the existing test surface
without weakening production:

```ts
window.__E2E__.parentGate = {
  answer: number | null;
  unlock(): void;
};
```

The exact type may be refined, but the behavior is fixed:

- it exists only when `import.meta.env.MODE === 'test'`;
- unrelated parent-surface tests may call `unlock()`;
- gate-specific tests may read the generated answer and exercise the real keypad;
- game code that updates `window.__E2E__` must merge rather than erase the gate
  adapter;
- a production-build test asserts that the adapter is absent;
- screenshot tooling uses the adapter for speed except for explicit gate scenes.

Do not broaden this to `import.meta.env.DEV`; ordinary development should retain
production gate behavior unless the developer intentionally runs test mode.

### Custom content

The custom-content screen uses one universal capability model:

- desktop can show category navigation, list, and editor together;
- tablet can show two panes;
- mobile portrait and short landscape stack the same regions or use a full-screen
  editor dialog;
- all viewports expose identical search, add, edit, play, record, stop, cancel,
  restore, disable, delete, validation, and status behavior.

Category navigation has real tab/navigation semantics, keyboard behavior,
selected state, counts, and visible overflow cues. Long lists keep editing
adjacent to the selected item instead of placing a form after the entire list.

#### Disabled default words and praise

Default words and default praise may be disabled, not deleted. Each relevant
category has two sections:

1. enabled items in the primary list;
2. disabled defaults in a muted, collapsed **Vypnuté (N)** section at the bottom.

Requirements:

- Disabled rows are grayed out but still meet text contrast requirements.
- Each disabled row has an individual **Obnoviť** action.
- The section offers **Obnoviť všetko** when there is more than one disabled
  default.
- Stable item IDs, not labels or array indexes, are persisted per locale.
- Restoring a default preserves any existing local audio override for that item.
- Existing hidden-default data is migrated or interpreted without loss.

The effective enabled pool for words and for praise must never be empty. All
domain mutations—not only UI controls—must enforce:

```text
enabled defaults + enabled custom items >= 1
```

Therefore:

- Disable is unavailable if it would remove the last enabled item.
- Deleting a custom item is unavailable if all defaults are disabled and that
  custom item is the last enabled item.
- The UI explains the constraint: “Aspoň jedna položka musí zostať zapnutá.”
- Loading corrupted or legacy state that would produce an empty pool restores a
  safe default deterministically and records no destructive write until the
  normal persistence layer runs.

#### Recording and forms

Recording exposes explicit idle, requesting-permission, recording, processing,
saved, and recoverable-error states. **Zastaviť** saves the recording;
**Zrušiť nahrávanie** discards it. Permission failures explain how to recover.
Inactive controls never silently no-op.

Inputs have persistent labels, visible focus, linked help/error text,
`aria-invalid`, Enter submission where appropriate, and a focused error summary
for multi-field failures. Consequential deletion requires confirmation and uses
Undo where practical.

### Feedback

Feedback uses the shared form and dialog primitives. It exposes loading, success,
and error states to assistive technology, accurately explains whether a reply is
possible, keeps support contact selectable/clickable, and does not auto-close
before the outcome can be understood.

## Universal Responsive Contract

All routes and actions have the same functionality across sizes. Responsive
implementation may change column count, composition, density, or host surface;
it must not fork product behavior.

### Layout behavior

- Use fluid values (`clamp()`), container queries where ownership is local, and
  width-plus-height media conditions.
- Never use landscape orientation alone as a proxy for limited height.
- Child answer regions must fit without clipping. Short screens first reduce
  decoration and whitespace, then reflow the playfield; they never hide an
  answer or critical action.
- Portrait phones generally use two-column home cards when minimum targets and
  titles still fit.
- Landscape phones compress the shell header and use horizontal space for the
  playfield.
- Tablets and desktops add columns and breathing room within sensible maximum
  widths.
- Wide desktops center the experience instead of stretching pieces indefinitely.
- Parent routes scroll naturally when needed; game rounds should fit the active
  viewport whenever the mechanic permits.
- Rotation preserves route, current round, selected/entered data, open editor,
  and meaningful scroll/focus context.
- Safe-area insets apply to every fixed or edge-aligned control.

### Canonical regression matrix

Automated screenshots and targeted interaction checks must cover at least:

| Class | Viewport |
|---|---:|
| narrow stress phone | 320×568 |
| small phone portrait | 360×640 |
| phone portrait | 390×844 |
| short phone landscape | 667×375 |
| phone landscape | 844×390 |
| tablet portrait | 768×1024 |
| tablet landscape | 1024×768 |
| desktop | 1280×900 and 1440×900 |
| wide desktop | 1920×1080 |

The screenshot tool covers this full matrix in Chromium. Automated WebKit
coverage is a smaller smoke suite at 390×844, 667×375, and 1280×900 covering
home, parent entry, one literacy journey, and one numeracy journey. Every phase
must test the viewports affected by its changes.

## Accessibility and Input Contract

- Target WCAG 2.2 AA for both child and parent UI.
- Child controls target at least 48×48 CSS pixels; parent controls never fall
  below 44×44.
- Touch, mouse, keyboard, and assistive technology reach every action.
- All child answer patterns support logical keyboard navigation: Tab enters the
  answer group, arrow keys move within composite grids/groups where appropriate,
  and Enter/Space activates the focused answer without double submission.
- Hover never carries unique information.
- Focus order matches the visible layout after responsive reflow.
- Each route has a main landmark and a clear page heading.
- Radio choices, tabs, switches, lists, progress, status, and errors use native
  or correct ARIA semantics through shared primitives.
- Dialogs contain and restore focus, support Escape when dismissal is safe, and
  make the background inert.
- Errors and outcomes use visible text plus appropriate announcements; no result
  relies only on motion, audio, or color.
- Audio prompts have a visible replay action and visible essential instructions.
- Browser zoom and enlarged text remain usable without two-dimensional scrolling
  in ordinary content.

## Motion Contract

- Simple state changes use CSS transitions.
- Reusable interactive motion uses Motion through shared presets.
- GSAP or bespoke sequences are reserved for game mechanics that cannot be
  expressed cleanly through the shared motion layer.
- Press feedback is short and interruptible.
- Correct-answer celebrations are finite and brief; no infinite confetti or
  sound-wave loops remain.
- `prefers-reduced-motion` replaces translation, rotation, scaling, looping, and
  particle effects with short opacity or immediate state changes.
- Motion never delays input or navigation unnecessarily.

## Error Handling and Data Compatibility

- Existing local settings, custom content, hidden defaults, and audio overrides
  must survive the redesign.
- Storage changes require versioned migration and pure-logic verification.
- Invalid stored setting values fall back to supported registry values.
- Empty effective content pools recover to one deterministic safe default.
- Audio permission, playback, persistence, and submission failures show
  recoverable states rather than unhandled promises or inert controls.
- Route/game error boundaries provide retry and a safe route home.
- Console errors and failed same-origin requests fail E2E checks.

## Phased Delivery

All phases are publication blockers. Each phase must leave the branch internally
coherent and verified, but no intermediate phase is the public redesign.

### Phase 1 — Baseline and safety

- Commit the protected-route matrix tests and correct the gate/history model.
- Add the test-only parent-gate adapter.
- Add parent/settings/content E2E scaffolding.
- Add responsive overflow and canonical screenshot coverage.
- Capture persistence fixtures for existing local data.

### Phase 2 — Design-system foundation

- Introduce semantic tokens and accessible contrast pairs.
- Add Radix-backed repo wrappers and typed variants.
- Add universal app/layout shells and responsive/motion primitives.
- Cover all shared states on `/ui-kit`.
- Remove primitive-level reliance on `!important` and raw class contracts.

### Phase 3 — Catalog, home, and lobbies

- Extend the catalog with categories, settings IDs, and shell capabilities.
- Generate the grouped home from catalog metadata.
- Keep light/white home cards and the shared palette.
- Migrate all eleven lobbies to the shared responsive lobby shell.
- Hide settings actions for games with no settings.

### Phase 4 — Parent experience

- Build the dashboard and catalog-driven game settings.
- Replace the Boolean settings matrix with the settings registry.
- Build universal responsive parent layouts and automatic-save status.
- Rebuild custom content, recording, disabled-default, and feedback flows.
- Preserve and migrate all existing local data.

### Phase 5 — Shared game framework

- Introduce the game state contract, game shell, material primitives, prompt,
  audio replay, feedback, and completion patterns.
- Migrate Abeceda, Slabiky, Čísla, and Slová from the shared `FindItGame` family.

### Phase 6 — Bespoke literacy games

- Migrate Prvé písmenko, Skladaj, Doplň slabiku, and Doplň písmeno.
- Reuse the shared shell and tactile pieces without changing learning rules.

### Phase 7 — Bespoke numeracy games

- Migrate Spočítaj, Viac alebo menej, and Sčítaj.
- Guarantee collision-free, short-height-aware playfields and visible prompts.

### Phase 8 — Release hardening

- Complete responsive, essential accessibility, interaction, persistence,
  PWA/offline, audio, and production bundle-boundary verification.
- Review the final local screenshot set across the canonical matrix.
- Remove dead old UI paths and temporary migration scaffolding.
- Confirm the production bundle contains no test gate adapter and does not pull
  avatar/three.js code into the main chunk.
- Complete final design review before publication.

## Per-Phase Execution Model

The implementation will be performed sequentially under Codex orchestration:

- Each phase starts in a fresh **Claude Code Sonnet** session with **Extra**
  effort (`--model sonnet --effort xhigh`). If Claude's rolling five-hour quota
  is exhausted, Codex hands the current phase and unchanged worktree to a fresh
  Antigravity agent using **Gemini 3.8 Flash High**. Providers never implement
  the same phase concurrently.
- Implementation uses one long-lived `feature/full-app-ui-redesign` branch
  created from the approved planning commit. Each phase agent starts from the
  accepted commit produced by the previous phase; phases are not implemented
  concurrently and do not create parallel phase branches.
- Each phase agent must use the `superpowers:subagent-driven-development`
  workflow for its implementation tasks and independent reviews.
- Each phase receives only its phase plan plus this complete design spec and the
  repository instructions; no undocumented conversational context may be
  required.
- Work must occur on a `feature/` branch. No pull request is created unless the
  user asks.
- Each phase ends with a cohesive commit and a handoff manifest under
  `docs/superpowers/handoffs/`. The manifest records phase number, branch,
  accepted base SHA, resulting SHA, clean-worktree status, exact verification
  commands and outcomes, changed-file summary, reviewer/approval result,
  unresolved blockers/risks, and the next phase’s required base SHA and
  preconditions.
- Codex reviews every phase before the next phase starts. A phase is “accepted”
  only when its assigned checks pass and Codex records approval in the handoff
  manifest. A rejected phase returns to the same phase agent when available, or
  to a fresh remediation agent otherwise; a later phase never absorbs the fix.
- Codex remains the external orchestrator and reviewer regardless of which
  provider implements the phase. Project-local Claude hooks block push and
  destructive git operations; routine in-scope command prompts may be approved,
  while dependency changes still require the explicit approval below.
- Agents must present the need and compatibility impact of the planned component
  library before its first install. Any later direct dependency addition,
  removal, major upgrade, or substitution also pauses for Codex to decide
  whether it is a good fit.
- `ROADMAP.md` and the Decisions Log are updated in the same phase when scope or
  significant choices change.
- After Phase 8, Codex performs the final code/specification review. The user
  then reviews the final screenshots and is the authority for final visual
  sign-off.

The implementation plan created after approval of this document must be
self-contained and split into eight phase documents or eight clearly separable
phase sections. It must identify exact files, tests, dependencies, migration
constraints, and handoff checks for each fresh agent.

## Verification Gates

Every phase runs the cheapest relevant checks first and records actual output:

1. `npm run lint`
2. relevant `npx tsx <module>.verify.ts` checks for changed pure logic
3. `npm run test:audio` when audio keys/assets change
4. `npm run test:e2e` for routing, app shell, parent flows, or game loops
5. `npm run build` before phase handoff when bundling or production guards change
6. targeted screenshot sweep across affected canonical viewports

Screenshots are manual-review artifacts, not assertions or pixel baselines. The
single shared capture script writes every run to the ignored local path
`artifacts/ui/<full-git-sha>/<unique-run-id>/` so repeated runs never overwrite
earlier evidence. Every UI-changing phase records that path in its handoff; no
screenshot artifact is committed. Responsive phase acceptance also requires
automated DOM checks that:

- the document has no unintended horizontal overflow;
- all expected answer controls and critical actions intersect the viewport or
  are reachable in the explicitly scrollable parent region;
- rendered child and parent control bounding boxes meet their minimum target
  sizes;
- critical controls do not overlap at the tested viewport;
- focus order and keyboard activation work after responsive reflow.

Phase 8 must capture a named final screenshot set and record the command,
viewport matrix, local artifact location, Codex review, user visual sign-off,
date, and any accepted deviations in `docs/ui-audit/redesign-final-review.md`.
The full screenshot matrix runs in Chromium; a small WebKit smoke suite covers
home, parent entry, and representative literacy and numeracy journeys.

Release hardening additionally requires:

- all eleven home → lobby → round → feedback/completion paths;
- gate correct, incorrect, cancel, keyboard, direct-route, history, reload, and
  test-adapter paths;
- every settings dependency and persistence path;
- custom word and praise add/edit/delete/disable/restore/restore-all invariants;
- recording permission, cancel, stop/save, playback, replacement, and deletion;
- keyboard and screen-reader semantics for parent controls and dialogs;
- keyboard navigation and activation across every child answer/control pattern;
- reduced-motion behavior;
- no clipped targets, horizontal overflow, or inaccessible controls at the full
  viewport matrix;
- offline navigation and core-game availability;
- local-data upgrade fixtures;
- no console errors or failed same-origin requests;
- production absence of the automation bypass;
- preservation of the avatar lazy-chunk boundary even though avatar work itself
  is out of scope.

## Acceptance Criteria

The redesign is complete only when:

- Every shipping child and parent route uses the new system; no mixed legacy
  surface remains. Developer-only `/avatar-preview` is excluded, while `/ui-kit`
  must document the new system.
- All eleven games are available from a catalog-generated grouped home and use
  shared lobby/game shells.
- The visual result reads as one Living Toybox, not eleven differently colored
  apps.
- The parent dashboard and contextual game settings use one protected system.
- The gate asks on every fresh parent entry and cannot be bypassed by route,
  history, or reload.
- The test-only adapter makes E2E and screenshot setup deterministic and is
  absent from production.
- Settings save automatically and communicate persistence state.
- Default words and praise can be disabled/restored through the approved
  collapsed-list design while the effective pool can never become empty.
- Desktop, tablet, portrait phone, and landscape phone expose identical
  functionality and pass the responsive matrix.
- Shared components own semantics, focus, targets, contrast, and reduced motion.
- Existing settings, content, audio, game rules, answer-audio ordering, PWA, and
  offline behavior remain intact.
- The avatar is untouched and persistent gamification is not introduced.
- Phase verification evidence and final Codex review find no unresolved release
  blocker, and the user has recorded final visual sign-off.

## Deferred Backlog

- Robust friendly 3D buddy: improve models and runtime first, then define how it
  cheers children without blocking the game.
- Persistent achievements, sticker/toy collections, streaks, progression, or
  other gamification.
- New games and learning categories, using the scalable catalog and shells
  established here.
