# Bear learning companion — first version

Date: 2026-10-19

Status: conversational design approved by the user. Reference direction B is
selected; no bear model, dance or game integration has been implemented or verified.

## Purpose

Give Mudrolíno a recognizable, reassuring default companion before parent-selfie
personalization is ready. The bear fills a gentle caregiver role: patient,
encouraging and delighted by a child's success. A personalized human parent can
later take over this same role.

The user selected an imaginary/animal companion, a bear, visual direction B,
feedback-only appearances, success-only reactions and one fixed outfit. They
approved the first-version scope on 2026-10-19.

## Character

Use **B, the middle storybook bear**, in the saved
[comparison sheet](../../../assets/avatar/concepts/2026-10-19/bear-mascot/comparison-v1.png).
It has a rounded honey-brown head, round ears, lighter muzzle, gentle eyes and a
warm smile. Its proportions balance a cuddly bear identity with limbs capable
of readable gestures and a small happy dance. Keep the character gender neutral;
avoid baby styling, stern teacher styling and exaggerated mischief.

The one default outfit is the existing palette-A concept combination T01/B01/F01:
cornflower-blue crew-neck shirt, navy trousers and blue/ivory sneakers. Adapt the
bear to the shared 24-bone skeleton and clothing proportions, and fit this outfit
on the actual bear. The reference image establishes an appearance, not proof
that existing garment meshes fit it. Preserve existing human sources and coverage
indices; create separate bear construction sources and exports.

The image is a concept render. Its fur texture does not require expensive fur
geometry or simulation. Use the catalog's simple rounded material style and
check that the face reads at the actual feedback size.

## Learning behavior

- Appear only in response to a completed correct answer, across all 11 games.
  A correct intermediate tile in a word-building game is not a completed answer.
- Perform one short happy dance, then disappear. Use a stationary dance with
  gentle side-to-side steps and arm movement, not travel across the activity.
- Run the animation within the existing feedback window. Existing Continue,
  backdrop dismissal and automatic progression remain usable immediately under
  their current rules. A shorter window may interrupt the dance; do not wait for
  animation, model loading or image loading before progressing.
- Preserve answer-item audio before praise. The bear is silent and adds no
  speech, music, sound effects or extra audio promise to the session controller.
- Wrong answers, exhausted attempts, prompts and normal active play do not show
  the bear. Keep their existing feedback.
- Include the final correct answer. The current shell suppresses its ordinary
  success panel on the last round, so rendering only inside that panel would miss
  this case. Show one celebration associated with the last correct answer,
  including when React first observes it in the completion phase. Do not create
  a second celebration when the same answer proceeds to session completion.
- A session ending on an incorrect round must not trigger a bear merely because
  the results panel uses a success visual tone.
- Dismiss on navigation, restart or return to active play. Pause hides/stops the
  reaction; resuming must not start a second celebration for the same answer.

## Presentation and accessibility

Use a small, transparent, noninteractive companion area associated with the
existing success feedback. Do not add a new modal, an extra Continue button or
a permanent companion beside the activity. Reserve its dimensions before loading
so the existing text and controls do not jump. Keep all controls visible and
reachable on narrow phones and short landscape screens.

The bear adds visual celebration; existing visible feedback and announcements
carry the answer result. Treat it as decorative in that context to avoid duplicate
screen-reader announcements or keyboard stops. Under reduced motion, show a still,
happy bear for the same eligible feedback, without dance or entrance/exit motion.
No facial animation or lip sync is needed; a fixed warm smile is enough.

## Integration boundaries

`src/shared/game/GameShell.tsx` owns the common presentation and receives the
existing `GameState`. Add one shared companion integration here instead of
adding animation logic to each game's answer handler. Identify celebrations by
the current run and resolved round so rerenders, final completion and repeated
input cannot replay one answer's dance. Cover this policy with behavioral Vitest
tests; do not change the answer state machine just to time a visual effect.

Keep renderer/model/animation work in `src/avatar/`, entered through the lazy
`AvatarPresenter`. Its current `AvatarModel` loops an active clip; this version
needs an explicit one-shot celebration behavior without changing gallery gait
playback. Reuse the existing runtime boundary, adding coverage for asynchronous
model and WebGL failures. Missing assets or unsupported rendering leave the
current success feedback usable. Never statically import the Three.js scene or
model from the game shell.

Prepare the required model/animation opportunistically during a game so the
first correct answer has a chance to show it. A late load never delays an answer
or produces a celebration during the next question. Keep model failure handling
separate from feedback eligibility and avoid repeat failed requests each round.

Store editable `.blend` and exported `.glb` files through the existing private
R2 manifest workflow. Only accepted runtime exports are candidates for the
planned Vercel Blob delivery. Preserve the renderer/GLB Workbox precache exclusions.
Offline learning must work with or without the optional bear; this version does
not promise an uncached avatar will be available offline. Test with local fixture
assets before publishing any runtime assets. Production release still requires
the user's shipping request and the repository release process.

## Scope and previous decisions

This is a neutral-default product lane before selfie customization. The earlier
requirement to finish both human bases before human-avatar product integration
does not block this explicitly approved bear version. Neither human base is
declared accepted by this decision.

Keep one outfit and no avatar settings or saved selection in this version. Fit
only that combination and the celebration motion; do not claim compatibility
with the whole wardrobe from a shared skeleton alone. Keep base, clothing and
animation responsibilities separate so later work can add outfit choices and
swap the bear for a parent avatar through the same game-facing integration.

The bear is the intended face of the app, but this first version does not replace
the app icon, install artwork, home screen or branding assets. Naming, extra
outfits, a dressing screen, unlocks, ongoing guidance, wrong-answer reactions,
new facial expressions and selfie generation are separate later work.

## Delivery and acceptance

1. Save a reproducible bear construction source, fixed outfit and one-shot dance.
   Preserve the concept, source hashes and per-revision retrospective. Review
   front/side/back/three-quarter and actual feedback-sized views of the bear.
2. Verify body/garment/head clearance over the dance, including between its keys,
   and validate source/export deformation, materials and GLB structure. Walk/run
   proof on human outfits does not establish dance fit on this bear. Include
   start/end poses so returning to rest does not jump.
3. Fit within the existing phone outfit budget: at most 95,000 runtime triangles
   and 2.1 MB gzip for the fixed character/outfit, with animation bytes reported
   separately. Measure actual device/browser rendering rather than assuming the
   triangle count establishes acceptable performance.
4. Cover normal correct answers, wrong answers, intermediate assembly progress,
   last-round success, last-round failure, rerenders, pause/resume, restart,
   navigation and early dismissal. Assert no additional progression delay and
   unchanged answer-item/verdict audio order.
5. Exercise reduced motion, missing/late model, failed renderer chunk and WebGL
   failure. Existing feedback and completion controls remain usable in every case.
6. Review desktop, narrow-phone and short-landscape browser captures at no more
   than 320px width, preserving the repository's capture metadata. Check both
   Slovak and Czech feedback and control reachability.
7. Run lint, Vitest, affected pure verifiers, `verify:edit`, production build/bundle
   checks and fresh `verify:integration` for the shared shell change. Run the
   required release profile before any requested shipping operation. Report
   actual results and reuse separately; do not count older catalog proof as fresh.

The next implementation plan should deliver the fitted character/dance first,
then the shared one-shot presentation and game integration, followed by the
complete browser/asset checks. This document records the approved product design;
it is not an implementation-completion or production-release record.
