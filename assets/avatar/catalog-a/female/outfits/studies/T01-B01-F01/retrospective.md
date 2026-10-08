# Female O01 (T01 / B01 / F01) retrospective

Status: first female T01 and exact female O01 on the +30% H02 head. Fit and
export gates pass; the new tee-sleeve occlusion gate fails on an inherited T01
defect. Art review pending.

Build: `build_catalog_female_outfit_study.py --recipe T01,B01,F01 --foundation
female/foundation/studies/h02-scale-130/female-foundation.blend --opening-relief .009
--controlled-components`, as for the T02 capsule. The builder, verifier, runner and
export check now take the recipe from `assembly-report.json` (default T02/B01/F01).
T01 uses the canonical `short_top_coverage`.

## Proof (fresh, complete runner)

Native and runtime-equivalent fit over 163 gait poses show zero body/head/hair/layer
pairs for T01, B01, F01 and the combined outfit. Also passing: removed-face
openings (neck, waist, ankle, shoe), six head gestures with rigid head/hair, face
TEXCOORD_0/image and UV-corner identity in `outfit.glb` and `body.glb`, and 16-pose
export at 1.2 µm. Export validation and all 12 material checks pass. The runner
skips Three.js skinning when the native gate fails; run directly, it passes at
2.0 µm over 16 samples. Reports: `fit-verification-report.json` and
`artifacts/verification/avatar-catalog/female-outfit-T01-B01-F01/runner-report.json`.

## Findings

1. **Hair vs tee.** The +30% hair tips touched the tee's upper back and sleeve
   backs in the run (up to 115 pairs). This was fixed in the H02 head study by
   shortening the rear locks 20%; see its retrospective.
2. **T01 underarm (inherited, both bases).** The tee coverage rule treats inner-arm
   skin beside the torso as torso and hides it. A small jagged gap then shows
   inside the sleeve opening. The new gate `tee_sleeve_hidden_faces_occluded` finds
   90/87 exposed faces per side. Three narrower coverage rules were tried and
   rejected: each exposed arm skin that the tee's side panel passes through
   (131–508 pairs), because in the A-pose the inner arm sits 3–15 mm from the torso,
   leaving no room for fabric. The fix is a T01 sleeve/underarm rebuild on both
   bases (T03 shares the rule).
