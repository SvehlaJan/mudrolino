# Task and answer visual-language audit

Date: 2026-10-03. Source: `f6568c2` on `feature/full-app-ui-redesign`.
Status: implemented and verified. The matrix below records the original baseline; the final Slová-card appearance, development gallery and restored placement motion are documented in `docs/superpowers/handoffs/2026-10-03-task-answer-visual-language.md`.

## User contract

- Scored answers are raised tiles with rounded square corners and a visible shadow.
- Square proportions are the default. The user explicitly permits wider rectangles when content needs room, including comparison groups and longer text.
- Task content is flat. Circular frames suit individual pictures and counting objects; instructions, equations, word rails and blank slots do not need to become circles.

The rule applies to gameplay content. Replay, navigation, parent controls and completion actions have their existing utility-button treatment.

## Evidence

Audited all eleven catalog games in source and rendered first rounds at 1107×853 and 320×568, using seeded content and silent deterministic audio. All 22 visits recorded zero console/page errors and zero HTTP errors. Eleven desktop screenshots were inspected only as 320px review copies.

Local evidence: `artifacts/ui/2026-10-03T07-54-47-657Z-13257-f6568c2/manifest.json`. The served test bundle fingerprint matched current source with its build environment. This is a visual-style audit, not a full regression gate or evidence for a changed implementation.

## Game matrix

| Game / route | Task appearance today | Answer appearance today | Planned action |
| --- | --- | --- | --- |
| Abeceda `/alphabet` | Flat text and audio | Raised square wood tiles | Preserve geometry; adopt shared answer role |
| Slabiky `/syllables` | Flat text and audio | Circular magnet chips with a smaller shadow | Change to raised square tiles |
| Čísla `/numbers` | Flat text and audio | Raised square wood tiles | Preserve geometry; adopt shared answer role |
| Slová `/words` | Flat written word | Raised square picture tiles | Preserve square choices; normalize corner/elevation treatment |
| Prvé písmenko `/first-letter` | Flat picture in a rounded rectangular frame | Circular magnet chips | Use flat circular picture; raised square answers |
| Skladaj `/assembly` | Flat picture, rail and blank slots | Flat square felt tiles, including placed tiles that can be returned | Use flat circular picture; raise movable tiles in both tray and rail |
| Doplň slabiku `/complete-syllable` | Flat picture, rail and blanks | Flat square felt tiles | Use flat circular picture; raise answer tiles |
| Doplň písmeno `/complete-letter` | Flat picture, rail and blanks | Circular magnet chips | Use flat circular picture; raised square answers |
| Spočítaj `/counting` | Scattered circular objects with small shadows | Raised square number tiles | Flatten objects; preserve number choices and scattering |
| Viac alebo Menej `/compare` | Flat instruction; quantities illustrated inside each answer | Raised rectangular group cards containing shadowed circular objects | Preserve whole-card answer affordance and dimensions; flatten internal objects |
| Sčítaj `/addition` | Flat equation trays containing shadowed circular objects, or flat numerals | Raised square number tiles | Flatten object counters; preserve equation layout and answers |

Five games violate the answer rule. Three games use elevated counters for supporting content. Comparison's rectangular answer shape is permitted by the user's clarification.

## Root cause and exact source seams

`src/shared/game/materials/TactilePiece.tsx` combines material, shape and elevation in one variant: wood is square/raised, magnet round/raised, felt square/flat, counter round/shadowed. Rendering as a button does not change that treatment. Consequently, a game inherits its affordance from its material instead of the role of the content.

`src/games/syllables/syllablesDescriptor.tsx`, `src/games/first-letter/FirstLetterGame.tsx` and `src/games/complete-letter/CompleteLetterGame.tsx` choose magnet. `src/games/assembly/AssemblyGame.tsx` and `src/games/complete-syllable/CompleteSyllableGame.tsx` choose felt. Their shapes/elevation explain the five inconsistent games.

`src/shared/game/materials/QuantityTray.tsx` always renders counter pieces. It supplies both task objects and objects nested inside comparison answers. The outer comparison card is the answer; each inner object is supporting content.

`PictureCard.tsx` and `WordRail.tsx` request `shadow-card`, but neither the theme nor stylesheet defines it. Their computed box shadow is **none**. Do not add that missing class: doing so would elevate task content. Remove the stale references locally instead. Picture frames are presently box-like despite being flat, which makes them resemble answers.

`AnswerGroup.tsx` already provides square grid cells and compact horizontal number choices. `BalancePlayfield.tsx` deliberately uses stretched cards. There is no reason to rewrite answer geometry now that rectangular exceptions are accepted.

## Recommended design

Add a required `visualRole: 'answer' | 'task'` to the existing tactile piece. Following the user's later clarification, every answer uses the Slová picture-card appearance: white fill, a thin light border, 22px corners and existing `shadow-block`. Material decoration applies only to task content; visual role controls shape and elevation. Task counters keep circular shape and have no shadow. Avoid independent radius/shadow/shape flags and per-game class overrides.

Use a flat circular frame for the image in `PictureCard`, with any caption outside the circle. Keep word rails and blank slots flat and rectangular: they communicate sequence and missing positions. Preserve current prompt space budgets at narrow and short viewports rather than allowing the new circle to displace answers.

Two cases require explicit role assignment:

- Counting objects remain task content even though tapping plays a pop sound. They stay round/flat with existing 48px touch targets and keyboard focus.
- Placed Assembly tiles remain operable answers because tapping returns them to the tray. They stay raised; their surrounding rail and empty slot remain flat. Animation clones must retain the same tile appearance.

Disabled answers keep their recognizable tile shape/elevation; existing disabled opacity, focus, pressed feedback and reduced-motion behavior remain. Preserve item-before-verdict audio, hidden retry announcements, absence of visible retry banners, stable scattered positions and the reserved space for shadows.

## Alternatives considered

Changing magnet/felt globally without declaring a role would fix today's answers but preserve the coupling that caused the issue. Adding overrides in five games would duplicate the rule and make future games inconsistent. A new hierarchy of answer wrappers and task wrappers is unnecessary for this limited change: one explicit role on the existing primitive plus a flat picture treatment covers the observed variation.

## Acceptance criteria

1. All eleven active games show tile-shaped answers with visible elevation; compact answers remain square and comparison cards may remain rectangular.
2. Task pictures/counters have no elevation. Pictures/counters are circular; word rails, equations and blanks stay flat without forced circular geometry.
3. Assembly's tray, placed tiles and animation clones share the raised appearance; empty positions do not look pressable.
4. Every interactive target remains at least 48px. Text fits, focus stays visible, answers remain reachable without scrolling, and solid bottom shadows are not clipped at 320×568, 667×375 and desktop.
5. The hidden UI kit demonstrates task versus answer roles, including the incidental counting interaction.
6. Existing session, audio, scattering and retry behavior passes unchanged. Recordings remain a separate pre-deployment task.

Implementation sequence and verification: `docs/superpowers/plans/2026-10-03-task-answer-visual-language.md`.
