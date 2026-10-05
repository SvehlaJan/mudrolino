# Reference A versus the current 3D avatar

Reviewed 2026-10-04. Direction: the selected bright, friendly palette-A character
with expressive Genmoji-like faces. The reference is a style target; future
selfie avatars must retain their own identity rather than all becoming H01.

## Evidence

Source-bound screenshots and reference crops:
`assets/avatar/catalog-a/style-review/2026-10-04/manifest.json`.
The capture command is `node tools/avatar/capture_catalog_style_review.mjs`.
It captures H01 and the latest T05/B01/F04 study in front, side, back and
three-quarter views in the actual Three.js viewer. All review copies are 320px
wide. The final capture includes 27 old/revised/reference/detail reviews without page/console errors or
non-abort request failures. Canceled requests remain recorded. This is a visual
rest-pose review, not new animated-fit, expression or slot-switching acceptance.

Baseline reference: `assets/avatar/concepts/2026-10-04/a-bright-friendly.png`.
Construction/style anchors: H01 in `catalog-a/06-face-hair.png`, the four-view
character in `05-character-views.png`, O05 in `07-outfit-combinations.png`, and
F04 in `11-ankle-boot-construction.png` under the same reference directory.
O05 includes the A02 beanie; the current fitting study has no beanie. Side
comparisons may mirror the current screenshot for visual alignment; the source
model and anatomical assignments are unchanged. Lighting and perspective differ,
so these images do not establish exact dimensions or a color-calibration result.

## Findings and smallest useful changes

| Priority | Visible difference | Blender refinement |
| --- | --- | --- |
| First | H01's lower face reads as a long tapered wedge. Reference A has fuller cheeks and a more defined rounded chin. | Sculpt the lower face into a shorter, broader cheek/chin silhouette. Preserve the existing neck attachment and rig; review front and side together before changing the full body. |
| First | The eyes read as narrow vertical beads; the nose is a round button and the smile/moustache are thin raised curves. | Widen the visible eye opening, seat the eyes into the face, add restrained lid volume, shape the nose bridge/tip and replace the outline smile with a simple lip volume. Keep a neutral friendly expression as the base. |
| First | Stubble reads as a broad dark lower-face patch, with sparse facial definition. The reference has a clear beard/moustache boundary and sideburn continuity. | Repaint the beard mask on the head surface, with a deliberate cheek line and connected sideburns. Check COLOR_0 and materials in Three.js, including the side and back. |
| First | Hair reads as round clumps, especially at the front and in profile. Reference A uses broad swept locks. | Flatten/elongate the existing front masses into a few connected swept waves. Retain a closed scalp and rounded transitions; optimize after the silhouette works. |
| Next | T05/B01/F04 establish the right palette and outfit categories, but cuffs/hem and cloth silhouette read more geometric at this scale. | Give the navy sweatshirt trim clearer volume/readability and soften visible hem/cuff transitions. Preserve fit-cleared inner surfaces; rerun fitting for any changed shell. |
| Next | F04's navy side panels have blocky corners. The construction reference shows rounded elastic panels and a softer sole edge. | Round the panel boundary and refine the outer sole bevel. Keep ankle opening, heel-loop anchors and existing coverage constraints. |
| Next | A02 is absent, leaving O05 incomplete. | Build the navy dome/blue folded cuff from the A02 construction sheet after the head silhouette is settled; then test head gestures and clearance. |

The screenshots do not justify scaling the entire body or rig. That would change
every garment's fitting source before the head, pose, camera and light differences
have been separated. The next comparison should use the same camera/light setup
for the old and revised 3D head, with the reference alongside.

## Head construction and personalization

The current H01 report lists 37,560 vertices / 37,926 polygons and nine material
primitives. Hair is the main existing optimization opportunity. No performance
target or slowdown is inferred from these counts. The head is weighted rigidly
to Head; that supports replacement but is not an expression rig. Inspecting the
export confirms no facial morph targets. H01's default smile is authored geometry.

**Personalization plan corrected after the 2026-10-04 user clarification:**
the selfie becomes a stylized 2D texture on a reusable UV-mapped head. H01 is a
fictional style reference, not a target identity or a personalized mesh pipeline.
The current head exports have no facial UVs; modeled/baked features need a
separate texture-ready construction. No real-selfie likeness test has run yet.
See `docs/avatar-workflow.md` for the current contract and sequence.

## Execution order

The isolated H01 visual study below is complete as a candidate. Next prove a
texture-ready head and neutral local sample texture in front/side/three-quarter
views, then one consenting selfie when provided. Settle compatible hair/headwear,
build A02 and complete O05; repair B03/B04/F02 and refresh affected outfits.
Expression studies and expanded heads follow the texture proof. Final style,
budget, slot integration and the female phase remain required.

## First implemented head study

`H01/style-revisions/reference-a/` now contains a separate editable head/outfit
study, exported H01.glb/outfit.glb and a retrospective. It shortens and broadens
the lower face, flattens/re-seats the widened eyes against the facial surface,
reshapes nose proportions, connects the moustache and beard mask, and elongates
the front hair volumes. The scalp is adjusted together with its closed hair cap.
Geometry/bind/action hashes assert that body, three garments, rig and walk/run
curves remain exact. The original H01 and fitting study remain available.

Fresh study proof: all 41 walk/run frames plus three head gestures pass rigidity;
GLB reimport deviation is 0.186 micrometres. Head-to-T05 clearance passes 163
quarter-frame poses with zero contacts. Both GLBs have clean Khronos validation
and exported-material proof. Desktop/phone Walk/Run, pause, scrub, camera,
skeleton, zoom and reset pass on the revised study. Lint has zero errors and
the known warning; 92 unit tests, pure checks, production build and bundle guard
pass. These are focused fresh checks; the full 472-test integration profile was
not rerun for this development inventory/model-only change.

The first study is not final art: wider eyes still need eyelids and expression
work, nose/lip shapes and swept hair detail need further sculpting, headwear
compatibility remains open, and the head has no facial morph targets. Its
38,018 vertices / 38,414 polygons exceed the original head count, so no geometry
optimization is claimed. Accepted IDs and production assets are unchanged.
