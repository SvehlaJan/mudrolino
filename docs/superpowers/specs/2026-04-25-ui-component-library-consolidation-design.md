# UI Component Library Consolidation Design

## Context

Hravé Učenie has a coherent playful visual language, but the implementation currently spreads repeated UI patterns across route screens, shared game components, bespoke games, settings, overlays, feedback, and recordings. The app uses Tailwind utility classes heavily, with a small global stylesheet for theme tokens, fonts, shadows, safe-area helpers, and animations.

The consolidation should prepare the app for a future redesign by creating a shared component library and a designer-reviewable UI kit route. This phase is not a redesign, but it should standardize the current UI. If using shared components makes some screens look a bit different, that is acceptable and preferred over preserving every current one-off spacing, color, radius, or typography choice.

## Goals

- Create a first-party UI component library under `src/shared/ui/`.
- Standardize repeated UI styling for layout, buttons, cards, tiles, forms, overlays, and navigation.
- Add a hidden in-app `/ui-kit` route that shows shared components and states for UX review.
- Migrate existing screens to use the shared primitives where patterns repeat.
- Update agent and project documentation so Codex, Claude Code, and contributors use and maintain the UI library.
- Keep the current playful app identity, while allowing standardization changes to margins, padding, colors, typography, radii, and component states.

## Non-Goals

- Do not perform a full visual redesign.
- Do not install Storybook or a separate design-system toolchain.
- Do not change game mechanics, round logic, content, audio behavior, or routing flows beyond adding the hidden UI kit route.
- Do not abstract game-specific layout logic when it is genuinely bespoke.
- Do not preserve pixel-perfect current styling when a standardized component creates a cleaner consistent result.

## Selected Approach

Use shared primitives plus an in-app UI kit route.

This is preferred over token-only cleanup because the app needs a concrete review surface for a UX designer and needs to remove repeated class strings. It is preferred over Storybook because the current project does not need extra tooling to prepare for redesign.

## Proposed UI Library Structure

```text
src/shared/ui/
  tokens.ts
  AppScreen.tsx
  TopBar.tsx
  Button.tsx
  IconButton.tsx
  Card.tsx
  ChoiceTile.tsx
  RoundCounter.tsx
  OverlayFrame.tsx
  FormControls.tsx
  UiKitScreen.tsx
```

The exact file split may change during implementation if the codebase shows a simpler boundary, but the exported component families should remain stable enough for documentation and designer review.

## Component Families

### Screen Layout

`AppScreen` should centralize the common full-screen page behavior:

- `min-h-[100svh]` / fixed-height game screen behavior where needed.
- Standard responsive padding.
- Background color.
- Max-width content wrappers.
- Overflow behavior for app screens, game screens, and scrollable parent screens.

### Navigation And Actions

The current app already has a shared `TopBar`, but bespoke screens duplicate top-bar markup. The consolidation should move top-bar primitives into `src/shared/ui/` and migrate repeated usages.

Components:

- `TopBar`
- `BackButton`
- `IconButton`
- replay/settings button variants
- `RoundCounter`

### Buttons

Button primitives should cover existing button shapes and states:

- primary full-width action buttons
- secondary or quiet action buttons
- circular play buttons
- compact row action buttons
- disabled and loading states
- pressed states

Buttons should use icons when the action is icon-like, matching the existing app style.

### Surfaces

Surface primitives should standardize white panels, settings cards, modal panels, game boards, and lightweight rows.

Components:

- `Card`
- `Panel`
- `ModalPanel` if needed
- list row surface variant if recordings benefit from it

The goal is to stop duplicating one-off combinations of `bg-white`, rounded corners, borders, shadows, and padding.

### Choices And Tiles

`ChoiceTile` should support repeated selectable/tappable surfaces:

- find-it game cards
- counting number options
- settings range choices
- feedback category choices
- segmented category filters where the shape fits

It should expose enough state to cover selected, correct, wrong, disabled, pressed, and neutral states. Game-specific content rendering remains the responsibility of the caller.

### Forms

Form primitives should standardize parent-facing controls:

- toggle
- segmented choice / range selector
- search input
- textarea
- loading/error affordances for feedback submission

The existing `SettingToggle` can either move into the UI library or become a thin domain wrapper around shared form primitives.

### Overlays

`OverlayFrame` should centralize modal overlay shell behavior:

- fixed overlay positioning
- backdrop styling
- panel sizing
- close/pause affordance placement
- shared confetti rendering for success-like overlays

Success, failure, and session-complete overlays can keep their distinct semantic content and tone, but should share the same frame API where practical.

### UI Kit Route

Add a hidden `/ui-kit` route for designer and contributor review. It should not appear on the home screen.

The route should show:

- app shell examples
- top bars and counters
- buttons in default, pressed, disabled, loading, and icon-only states
- cards and panels
- choice tiles in neutral, selected, correct, wrong, and disabled states
- form controls
- overlay panel examples or static overlay samples
- real Slovak labels and representative game content

The UI kit is the review surface for the future redesign. When a shared component or state changes, the matching UI kit example should change in the same implementation.

## Documentation Requirements

Update these docs during implementation:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`

The agent docs should instruct Codex and Claude Code to:

- prefer `src/shared/ui/*` primitives for new UI work
- avoid copying long Tailwind class strings when a shared primitive exists
- update `/ui-kit` when adding or changing a shared UI component or state
- keep the UI kit and docs synchronized with component API changes
- preserve the current app identity unless a task explicitly requests redesign
- standardize screens through shared components even if exact old spacing, colors, typography, or radii change

The README should include a short "UI Component Library" section with:

- location: `src/shared/ui/`
- review route: `/ui-kit`
- maintenance expectation: primitive, UI kit example, and docs stay aligned when the shared UI contract changes

## Migration Plan

1. Add the shared UI library skeleton and `/ui-kit` route.
2. Move or wrap the existing top-bar behavior into `src/shared/ui/`.
3. Add core primitives for app screen layout, icon buttons, round counter, buttons, cards, choice tiles, form controls, and overlay frame.
4. Migrate settings, feedback, and recording screens first because they contain many repeated cards, controls, and action buttons.
5. Migrate shared game UI in `FindItGame`.
6. Migrate duplicated pieces in `CountingItemsGame` and `AssemblyGame`, especially top bars, replay buttons, counters, card panels, and tiles.
7. Migrate success, failure, and session-complete overlays to use the shared overlay frame where practical.
8. Update `AGENTS.md`, `CLAUDE.md`, and `README.md`.
9. Review `/ui-kit` and representative app routes for visual consistency.

## Acceptance Criteria

- A `src/shared/ui/` library exists and exports the agreed component families.
- `/ui-kit` exists, is hidden from normal child navigation, and shows useful component variants and states.
- Existing repeated UI patterns use shared primitives where practical.
- Some visual differences from the current app are acceptable when they result from standardization.
- The app still feels like the same playful preschool app and does not introduce a new redesign direction.
- `AGENTS.md`, `CLAUDE.md`, and `README.md` describe how to use and maintain the UI library.
- New UI work has an obvious path: use a shared primitive, extend one, or add a new primitive with a UI kit example.

## Verification

Run:

```bash
npm run lint
npm run build
npm run dev
```

Then browser-check:

- `/`
- `/alphabet`
- `/counting`
- `/assembly`
- `/settings`
- `/recordings`
- `/ui-kit`

Check at least one mobile-ish viewport and one desktop viewport because the app uses fixed-height game screens and large touch targets.

The verification question is: "Does the app now use a consistent shared UI system, with a reviewable component inventory, without accidentally becoming a redesign?"

