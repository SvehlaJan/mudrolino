# Game play surface cleanup

Status: Approved through the user's eight browser annotations and subsequent “Proceed” instruction.

## Scope

The nine games retain their current round logic, answer audio order, and session recap. This change addresses the visible feedback and play surfaces called out on Abeceda, Skladaj, Spočítaj, Viac alebo Menej, and Sčítaj. The shared shell changes apply to every game.

## Feedback

- The selected item's audio plays first, then the non-final success overlay appears while praise audio plays. One second after the complete answer audio sequence resolves, it advances to the next round. The Continue button and a click on the backdrop advance immediately through the same guarded action. A click inside the panel does not dismiss it. Manual advance, Back, pause, unmount, and a new answer cancel any pending timer. Final-round recap keeps its explicit Play again/Home choices and never auto-advances. Non-final failure feedback retains its current explicit Continue action.
- Remove the visible, normal-flow try-again banner from the shared `GameShell`. Preserve a polite screen-reader retry announcement in a visually hidden status region. The prompt and answer area must keep the same geometry on retry; tile-local retry styling and spoken audio remain.

## Skladaj

- Render a fixed tray cell for every syllable's original `trayIndex`. After placement, its cell becomes a noninteractive, aria-hidden empty slot, so remaining cards do not recenter or change order.
- Use the same tile dimensions, type scale, border, and material for a syllable in the tray and in a filled word slot. Empty word slots reserve that geometry. The word container's minimum size stays constant while pending slots become filled; narrow phones may wrap only where the complete word already requires it.
- Keep the existing tap-to-place, tap-to-return, movement animation, answer audio, and keyboard behavior.

## Numeracy

- Spočítaj and Sčítaj show a centered row of four number choices in a compact answer surface rather than a tall, mostly empty tray with left-aligned choices. Each target remains at least 48 px and fits at 320 px width.
- Viac alebo Menej shows two bounded, equal-height quantity cards centered in the available area. Objects use a readable consistent size and are centered inside each card; the cards do not stretch to the full leftover page height.
- The same surface dimensions hold before and after an incorrect answer, across narrow phone, short landscape, tablet, and desktop. Keep all choices reachable without horizontal or vertical page overflow.

## Verification

Add focused browser assertions for audio-complete-plus-one-second auto-advance, backdrop and panel clicks, cancellation/final-round safety, retry geometry and accessible announcement, Skladaj tray/word slot stability and visual parity, and numeracy centering/bounded height. Run affected pure logic verifiers if touched, lint, complete Playwright suite, build, and reduced-size screenshot review. Do not inspect full-resolution screenshots.
