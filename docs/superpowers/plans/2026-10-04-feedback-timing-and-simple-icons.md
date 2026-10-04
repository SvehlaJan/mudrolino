# Feedback timing and simple icons

**Goal:** Match failure dismissal to success, remove idle retry lock time, and simplify literacy home icons.

**Design:** Both transient verdicts advance one second after their audio ends and allow backdrop dismissal through the same controller action. The retry cooldown is a minimum measured from the tap, overlapping audio and tile movement; input still waits for both. Screen-reader retry feedback remains available after unlocking until the next tap. The seven literacy icons use large glyphs or simple outlines; numeracy drawings stay as reviewed.

## Implementation

- [x] Add controlled-clock regressions for failure advance, pause/cancel/final-round behavior, and cooldown overlapping held audio/placement. Observe failures, then update `gameSessionController.ts` and the hook clock.
- [x] Wire failure backdrop dismissal in `GameShell.tsx`; retain polite retry announcements after input unlocks. Verify backdrop dismissal in real complete-syllable rounds and use durable wrong-attempt counters in existing browser helpers.
- [x] Simplify the seven literacy glyphs in `GameCard.tsx`; document behavior in the development gallery and review home/gallery screenshots at 320px.
- [x] Run fresh integration, inspect affected captures, update ROADMAP with outcome and decision. Preserve concurrent avatar edits.
