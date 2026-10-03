# Card morph and game icon plan

The browser comments authorize three focused changes: contain emoji inside flat circular pictures, replace generic home glyphs with eleven game-specific SVG drawings, and improve placement in Assembly/CompleteSyllable/CompleteLetter.

Cards retain their entire raised surface during travel. Guided transfers animate position, width, height, corner radius and text size independently, so glyphs remain undistorted while squares become target rectangles. Empty slots reserve the widest available answer with invisible, accessibility-hidden sizing labels; that width remains stable after placement. Assembly uses the same content-fitting slots for every possible syllable and resizes returnable buttons to fill them. Wrong guided answers travel to the blank and return to their original position without committing a fill; Assembly continues to animate every placement and its existing wrong-sequence reset. Reduced motion remains immediate, with no wrong-answer slot preview. Cancellation restores sources and removes clones at every stage.

SVG icons depict letter cards, a syllable pair, numbered cards, counted dots, unequal dot groups, addition, word/picture matching, an emphasized first letter, joining syllables, and missing syllable/letter slots. They inherit the existing category palette and appear in the gallery.

- [x] Add morph/return lifecycle tests and browser regressions for full-card bounds, rectangular arrival, longest-choice fit, wrong-answer round trip and emoji containment. Verify expected failures before implementation.
- [x] Implement responsive pictures, semantic icons, fitted slots and cancellable guided morph/return; update Assembly's existing morph and gallery specimens.
- [x] Run targeted checks followed by integration, inspect seeded 320px review captures, update ROADMAP/handoff and commit on the existing branch.
