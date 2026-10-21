# Bear companion visual review — 2026-10-20

Independent asset review of `head45-soft-final-v2` and
`head45-soft-motion-v2`, compared with selected reference B and the earlier
head55 candidate. Root remains the sole model author. This review changed only
this document and launched no Blender or browser jobs.

## Result

The two earlier P2 silhouette findings are materially improved. No additional
blocking visible defect was identified in the inspected construction views and
single dance pose. This is a limited visual assessment, not user art acceptance
or a technical clearance/export pass.

- **Arms/paws: improved.** Fuller upper arms and reduced forearm bulging give a
  more continuous contour. Shorter, wider paws no longer look like elongated
  hanging ovals. A mild wrist constriction remains, particularly in side view;
  any further refinement should blend that transition without losing the
  proximal overlap. The previous strongly segmented appearance is reduced
  enough that it is no longer a blocking finding in these views.
- **Outfit: improved, with a residual reference difference.** The shorter tee
  and reduced flare make the shirt less tunic-like. Straight narrow trousers
  and small shoes retain a slimmer silhouette than B's stocky concept, but
  these unchanged catalog pieces are not newly demonstrated construction
  defects. Further body/outfit proportion changes should follow user style
  feedback rather than attempt to restore the rejected large-head silhouette.
- **Face/material identity: retained.** Honey color, round ears, lighter muzzle,
  dark eyes, smile and blue/navy/ivory outfit still identify the selected B
  direction. Smooth matte geometry is explicitly allowed by the approved spec;
  absence of concept fur is not a mismatch requiring repair. No obvious open
  neck seam, missing surface or clipping is visible in the reviewed stills.
- **Dance silhouette: improved, readability still open.** The supplied
  `dance-review.png` has a clearly broader arm silhouette than the earlier
  head55 samples. A single still cannot establish perceived dance quality,
  timing or visibility in game feedback. The earlier P1 finding about a roughly
  70px-tall phone bear remains **pending fresh actual game captures**, not
  confirmed against the enlarged slot/camera changes. This review does not
  infer that old captures represent the new presentation.

At the first review, head45 was the latest user-directed whole-head reduction after head55 was still
too large. Its smaller head is **not** marked as a mismatch with reference B.
The user's head-size/style confirmation remains pending.

## Evidence and identity

All inspected review PNGs are 320px wide. Paths below are relative to the repo.

- Reference: `artifacts/verification/bear-companion/reference-b-review.png`.
- Four construction views:
  `assets/avatar/catalog-a/companions/bear-v1/revisions/head45-soft-final-v2/{front,side,back,three-quarter}-review.png`.
- Dance pose:
  `assets/avatar/catalog-a/companions/bear-v1/revisions/head45-soft-motion-v2/dance-review.png`.
- Saved parameters: `headScale=0.45`, `upperArmInset=0.22`,
  `forearmGirth=1.2`, `pawWidth=1.18`, `pawLength=0.81`,
  `teeHemDrop=0.12`, `teeWidth=teeDepth=1.1`. Celebration parameters include
  arm lift 26 degrees, forearm 14 degrees, torso 4 degrees and 0.006m bob.

SHA-256 values were independently read from the current files:

| Artifact | SHA-256 |
| --- | --- |
| Then-current `bear-v1/outfit-lod.glb` (archived in `proven-head45-v1`) and revision `head45-soft-motion-v2/outfit-lod.glb` | `ff34c27f34c4504c83303195393366c0c6ee6a0a503ee8c6ce6a21ac4feabea4` |
| `head45-soft-final-v2/outfit.blend` | `e2746810c34db3ca81fd1d5c628ff81b7c3fd73cbae9f6a6bbf8963205352dac` |
| `head45-soft-final-v2/outfit.glb` | `9befa5e87039101b9a7916c488037800c009f1f016fb921920d7be69084df1ec` |
| `head45-soft-final-v2/bear-design.json` | `0aeeafcad87f8ad7a869fa8a6abcda70a3a579f1afc985d4b8a5e4cd636c0927` |
| `head45-soft-motion-v2/outfit-lod.blend` | `4aa6d047d3695a16a516c57a065954242ee81949f8cec3ef78c2eb69a56fb778` |

The revision construction, celebration and LOD reports bind the reviewed sources
and current export. They report 93,127 triangles and a 1.4-second `celebrate`
clip; these are existing report claims, not freshly executed verification here.

## Limits

This review inspected supplied native construction renders, one native dance
pose, parameters and hash-bound reports. It did not inspect a freshly rendered
head45 runtime or actual game capture, play the motion, rerun geometric gates,
measure device performance, or establish all-pose source/export fidelity.
Earlier head55 runtime/clearance results cannot establish those properties for
the changed head45 geometry and broader motion. User art acceptance, fresh
runtime/game-size review and the author's current technical gate remain
separate requirements.


## Success-feedback enlargement review

A separate read-only review of the feedback layout and companion camera found
no blocking spec or code-quality issue in this change. Source inspection
confirmed 160×184px desktop, 128×148px narrow/short-landscape, and 96×112px
combined narrow-and-short slots. Short landscape places the bear beside the
feedback content. Existing child buttons retain their 48px minimum size.
Changes to panel spacing and the character slot apply to successful feedback;
failed feedback keeps its existing presentation. No answer, audio, expiry or
continue timing was changed by the enlargement.

Only the product `LearningCompanion` requests camera distance 5.2. The ordinary
gallery default remains 7.2, and bounds-based inspection ignores this optional
distance. Fresh focused verification ran
`npx vitest run src/avatar/inspectionCamera.test.ts src/avatar/LearningCompanion.test.ts`:
2 files, 10 tests passed.

The following supplied actual-game review copies were inspected at 320px
width, with sidecars binding them to model
`ff34c27f34c4504c83303195393366c0c6ee6a0a503ee8c6ce6a21ac4feabea4`
and test build fingerprint
`05205063aeb3ed4a20e72ae60481836a11e2ccc12b229f96420fc78e5cac1281`:

- `artifacts/verification/bear-companion/game-reviews-head45/geometry-narrowPhone-sk-success.png`:
  the face, arm silhouette and feet are readable, with Continue fully visible.
- `artifacts/verification/bear-companion/game-reviews-head45/geometry-shortLandscape-sk-results.png`:
  the side-by-side arrangement keeps the character, result text and both
  completion buttons visible without overlap.
- `artifacts/verification/bear-companion/game-reviews-head45/geometry-desktop-sk-reduced-motion.png`:
  the still uses the enlarged framing and fits the same reserved visual area.

These images materially resolve the earlier roughly 70px phone presentation
finding for the inspected Slovak scenes. A static capture cannot establish the
perceived quality of the whole dance. This reviewer launched no browser jobs;
Czech scenes, the combined narrow-and-short branch, all-pose framing and the
full integration result still require the implementation owner's coordinated
browser evidence. This conclusion covers the enlargement only, not final
user art acceptance or verification of the whole branch.


## Smaller head35 size study — separate read-only review

After the user still found the revised head too large, the modeling owner
created `revisions/head35-construction-v1/` and `head35-motion-v1/`. A separate
review agent inspected their320px front, three-quarter, side and supplied dance
views and compared the saved design parameters. Ears, eyes, brows, muzzle, nose
and smile shrink with the head; only `headScale` (.45→.35) and explanatory text
differ from the prior construction parameters. The neck stays visibly connected
in all four views. The reviewer saw no new obvious clipping, detached feature
or surface gap.

This is a narrow visual review of supplied renders, not final user art acceptance,
all-pose clearance or actual game-size readability. The smaller facial details
require fresh game-size inspection. The concept's larger head is superseded by
the user's explicit whole-head reduction request; prior body/outfit fidelity
findings remain applicable only if those surfaces remain unchanged.

## Head35 actual-renderer review — current export

Reviewed all 30 supplied `*review.png` captures in
`artifacts/verification/bear-companion/browser-final35/`: five deterministic
poses each for desktop front, three-quarter, side and back, plus phone and short
front views. Their widths are all 320px. Comparison used reference B and the
previously inspected head35 native construction/dance views. No Blender or
browser jobs were launched by this reviewer.

The current `bear-v1/outfit-lod.glb` and
`revisions/head35-motion-v1/outfit-lod.glb` independently hash to
`f391a612b80dd63f069cf5f5d9514a585f9f3e1040f2593974762cb8a8ea16d4`.
That exact SHA is bound by `browser-final35/browser-report.json`, whose
`actual-renderer-fixed-candidate` result reports 30 framed captures, changing
pixels and zero console errors/failed requests. Its context is Chromium
148.0.7778.96, guarded Vite development source, started
`2026-10-20T19:46:18.873Z`, commit
`f9754188ae9b0bb3db348026c73919f322fdb9d3`; individual source hashes are retained
in the report. These are reviewed existing results, not fresh executions by
this reviewer.

**Visual result:** no new obvious disconnected neck, detached facial feature,
surface hole, clipping or pose-dependent outline break was identified in these
captures. Runtime appearance agrees with the head35 native views within this
visual scope. Ears, eyes, muzzle and smile remain proportionate within the
smaller whole head; the neck stays visibly connected through the sampled
poses. Honey/cream face colors and cornflower/navy/ivory outfit roles retain B's
identity. The deliberately smaller head is governed by the user's repeated
whole-head reduction request, not the concept's larger proportions. No user
acceptance is inferred.

`revisions/head35-motion-v1/body-preservation.json` reports exact non-head vertex
attributes, world transforms and oriented triangle multisets, plus all 72
animation tracks' times/values, preserved from head45 SHA
`ff34c27f34c4504c83303195393366c0c6ee6a0a503ee8c6ce6a21ac4feabea4`.
The referenced preserved head45 GLB's hash was independently confirmed. Three
rigid meshes differ only in triangle ordering; their winding and duplicate face
counts are preserved. Thus the residual slender trousers/small footwear and
mild wrist constriction are inherited style differences already discussed
above, not evidence of a new head35 body/outfit regression. The preservation
algorithm itself was not rerun in this review.

**Limits:** these are fixed actual-renderer poses, not a playback or fresh
full-game feedback inspection. They do not close actual game-size face/dance
readability, perceived animation quality or control reachability. The enlarged
head45 game captures elsewhere in this audit are historical presentation
evidence and cannot approve head35's smaller face. The author's separate dense
169-sample, material, validator and budget gates were not rerun here; this visual
review makes no substitute technical clearance claim. No new blocking visible
asset defect was found within the stated captures; final art approval remains
with the user.

## Head35 actual-game presentation — six inspected scenes

Fresh current-model game screenshots in
`artifacts/verification/bear-companion/game-reviews/` were inspected at their
saved 320px review width:

- `geometry-narrowPhone-{sk,cs}-success.png` at 320x568: full bear, praise and
  Continue are visible with clear separation. Metadata measures the character
  at 127 CSS pixels tall in a 128x148 reserved canvas (the Czech capture rounds
  canvas width to 129). The smaller head still reads as a bear through ears,
  light muzzle and dark facial marks; fine smile/glint detail is necessarily
  less legible than the full silhouette. There is no observed overlap or
  cropped extremity.
- `geometry-shortLandscape-{sk,cs}-results.png` at 320x180, from 667x375: the
  side-by-side layout keeps the bear, result heading, score and both Play Again
  and Home buttons visibly separate. The character is 127 CSS pixels tall in
  the source viewport; the roughly 61px review-copy height reflects image
  downscaling, not a smaller runtime companion slot.
- `geometry-desktop-{sk,cs}-reduced-motion.png` at 320x225, from 1280x900: the
  still occupies 156–157 CSS pixels vertically in a 160x184 canvas. It remains
  fully framed above the praise and Continue control. Desktop review-copy
  scaling makes facial details too small for a detailed expression judgement;
  no framing or control-placement defect is visible.

Each of these six metadata files binds source SHA-256
`f391a612b80dd63f069cf5f5d9514a585f9f3e1040f2593974762cb8a8ea16d4`
and test-build fingerprint
`122e82510e7ee92c00b23e67e48a2f162b1ed28353b2e0be103273c08c13bc5a`,
commit `f9754188ae9b0bb3db348026c73919f322fdb9d3`, with empty errors and
failed-request arrays. They were captured on 2026-10-20 between 19:53:05Z and
19:53:44Z. Success/results metadata identifies `rendered3D`; reduced-motion
metadata identifies `still`. These six files were read independently here;
other screenshots and the full integration totals are outside this UI review.

Compared with the original roughly 70px phone character, the current 127px
character materially resolves the earlier **whole-body presentation size**
finding for these scenes, and preserves the previous enlargement despite the
head reduction. Phone fixed-pose renderer captures
`browser-final35/phone-front-0-review.png` and `phone-front-0.5-review.png` also
show a clearly different lowered/open-arm silhouette without clipping.
That comparison establishes distinguishable supplied poses, not the perceived
quality of continuous playback or a guarantee that every dance phase is equally
readable. No new blocking visible UI defect was found in the six inspected
scenes. Browser jobs were not launched by this reviewer, controls were not
interacted with, and video/playback review and user head-size/art approval
remain separate.
