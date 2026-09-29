# Parent flow UX cleanup

**Date:** 2026-09-29  
**Status:** Approved for implementation
**Scope:** Five browser annotations on game settings, the parent gate, help and feedback, and custom content rows.

## Goal

Make each parent screen explain its immediate task. Remove navigation and placeholder UI that repeats the previous screen, simplify the arithmetic gate, and give content-row actions enough physical and visual space. Keep the existing parent access, settings persistence, recording, and feedback behavior.

## 1. Game settings routes

`/settings/games` displays a full-width list of configurable games. Remove the desktop empty-state banner. The page H1 is **Nastavenia hier**; do not render a separate **Rodičovská zóna** heading on this route.

`/settings/games/:gameId` displays only the selected game's settings. Remove the desktop game-list sidebar. Show a small **Nastavenia hry** context label, the catalog's localized game title as the page H1 (for example, **Doplň písmeno**), and the existing game-specific subtitle below it. Constrain the settings content to a readable width rather than stretching controls across the full desktop viewport.

Preserve the current Back behavior: return to `/settings/games` when reached from the parent overview; close the parent area and restore focus to the lobby's settings trigger when reached from a game lobby. Direct links, unknown game IDs, and games without configurable settings keep their current protected and safe routing behavior. Settings still save immediately.

## 2. Parent arithmetic gate

Keep the desktop two-column arrangement and the existing header exit action. Replace the two large stacked cards on the left with one compact arithmetic expression containing a distinct answer slot, for example **14 − 7 = [7]**. The answer slot remains a live, labeled status and clearly shows the empty state. The keypad remains on the right with touch targets of at least 44 px.

On narrow portrait screens, stack the expression above the keypad. On short landscape screens, keep the two columns with the heading, expression, keypad, and exit action fully visible; reduce padding to fit while preserving the 44 px touch targets. Preserve keyboard digits, Backspace, Enter, wrong-answer recovery, focus handling, and the protected-route guard.

## 3. Help and feedback

`/settings/help` shows the feedback form directly in the page, headed **Pomoc a spätná väzba**. Remove the intermediate help card, the button that opens a modal, and the support email link. The form remains text-only: category and message fields, the category-specific message requirement, character limit, submit state, error state, and success confirmation all remain. On short screens, keep the submit action in a sticky bottom action area with safe-area spacing while the fields scroll, without covering the fields. No screenshot attachment feature is added.

The feedback service and payload contract stay the same. Since the modal has no other production consumer, move its form and state handling into a route-owned form component and remove the obsolete modal wrapper.

## 4. Custom content recording rows

The recording row uses parent-size icon buttons with matching 44 px slots. Remove reserved empty action slots and leave at least 12 px between visible controls so their circular shapes and shadows do not visually touch. Keep the item label flexible and move the action cluster below it at compact widths. Preserve action order, accessible names, recording states, custom-audio indicators, and menu behavior.

## Verification

- Check `/settings/games`, selected game settings, `/settings/help`, `/settings`, and `/content` across narrow phone, short landscape, and desktop layouts using reduced-size visual evidence.
- Assert the selected game title is the H1, the detail sidebar and overview placeholder are absent, and Back follows the entry path with focus restored from a lobby.
- Exercise feedback validation, submission success and failure, and keyboard access in the inline form.
- Assert the gate's expression, answer, keypad, and exit are fully in view at the small canonical viewports; preserve its input and access tests.
- Check visible recording action bounds do not intersect and that recording/play/menu interactions still work.
- Run lint, applicable pure verifiers, the relevant browser tests, and the production build. Routing and app-shell changes require the full E2E suite under `AGENTS.md`.

## Out of scope

Parent access lifetime, new settings, feedback attachments, audio storage changes, and a broader redesign of unrelated screens.
