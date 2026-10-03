# Parent layout and game header implementation plan

**Goal:** Apply the six browser comments without changing game or feedback submission behavior.

**Design:** Parent settings and content use the feedback page's centered `maxWidth="narrow"` (672px). Content keeps its rail/list layout on larger screens and opens the existing editor dialog instead of overflowing a third column. Parent-gate arithmetic and its answer status are flat. Feedback uses shared flat radio/textarea variants with visible focus and selected state, plus restored screenshot-email guidance at `jan.svehla@pm.me` before and after submission. Game titles are centered through a shared PageHeader alignment; narrow screens reserve a centered title row below back/progress so long titles never collide with controls.

**Architecture:** Reuse AppScreen width tokens and existing dialogs. Extend RadioGroupControl (`surface: raised | flat`), TextAreaControl (`surface: outlined | flat`) and PageHeader (`align: start | center`) with defaults preserving other consumers. Update UI-kit examples in the same change. No new component, route, dependency or backend.

## 1. Feedback and centered parent composition

- [x] Update existing feedback email expectations to visible `mailto:jan.svehla@pm.me`, including success. Update desktop content editing expectation to a focused, dismissible dialog; assert centered bounded page width on desktop. Run the focused tests before implementation and confirm failures.
- [x] Set GameSettingsOverviewScreen and CustomContentScreen to `maxWidth="narrow"`. Remove the now-impossible spacious three-column content branch; reuse medium/compact dialog behavior, retaining short-screen full-screen editing and return focus.
- [x] Add flat shared radio and textarea variants. Feedback selects them, keeps message-required validation and sticky submit, and restores screenshot guidance inside scrolling fields and the success state. Remove the decorative submit divider.

## 2. Flat gate and centered game titles

- [x] Replace the raised parent-gate equation card with a plain flat div and remove the answer status border/shadow; preserve labels, equation/answer line, keyboard and gate behavior.
- [x] Add PageHeader center alignment with equal side tracks on wider screens and a separate centered title row below controls on narrow screens. GameShell uses it for all game titles. Parent headers keep start alignment.
- [x] Add live UI-kit examples for flat radio/textarea and centered header. Regenerate the gallery inventory if source references change.

## 3. Verify and record

- [x] Run `npm run verify:integration` once after implementation, including existing keyboard, accessibility, recording/editing, feedback and all-game geometry contracts. Keep browsers silent. Fix failures before delivery.
- [x] Capture the touched parent scenes and representative short/long game titles at phone, short landscape and desktop. Inspect only 320px review copies; check title/control separation, centered bounded content, flat surfaces and reachable form/editor actions.
- [x] Update ROADMAP and save a short handoff with commands, results and capture provenance. Commit on the existing feature branch; no deployment or PR.
