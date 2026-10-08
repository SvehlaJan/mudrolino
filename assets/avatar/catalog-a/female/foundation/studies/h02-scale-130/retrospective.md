# H02 +30% head retrospective

Status: technical checks pass; art review pending. Decision: the user chose +30%
heads on both bases on 2026-10-07.

Builder: `tools/blender/catalog/build_catalog_head_scale_study.py --base female --scale 1.3 --hair-taper 1.56,1.40,1.0 --rear-shorten 1.56,.2,.04,.10`.
Verifier: `tools/blender/catalog/verify_catalog_head_scale_study.py`.

Uniform scaling of the shoulder-length hair failed. The hair tips grew 2.5 cm down
and 4 cm back into the upper arms in the run (155 pairs at run 9.5, LeftArm/RightArm).
Hanging hair now follows `hair_hang_scale`: it scales fully with the head above
1.56 m (jaw), easing to its original size at 1.40 m (tips). Of five screened tapers,
this one clears the run and keeps rest head/hair embedding at exactly the source's
537 root pairs, so no skin shows through the hair.

Fitting female T01 then showed the tapered hair tips touching the tee's upper back
and the backs of the sleeves in the run (up to 115 pairs). Scaling the tips toward
the pivot made this worse, because it pulls them inward. Vertical-only
shortening of the *rear* locks' hanging length by 20% (`shorten_rear_hair`,
weighted from y = 0.04 to 0.10 m) clears the tee and the body. Face-framing locks
keep their length.

The earlier "no new head/hair pairs" rule was too conservative. Hair inner layers
can move into the hidden scalp and neck, which raised raw pairs from 537 to 605
without anything showing. The verifier now casts rays from outside (the face
excluded) and requires zero rays that hit skin in front of hair.

Fresh checks (`verification-report.json`): sources unchanged; head scaled exactly
and hair matches the taper and shortening rules; hair/body clear over 163 gait
poses plus six gestures; zero visible skin-through-hair rays (same as the source);
UV-corner identity and embedded face image; 16-pose export 0.6 µm.

Open: the planned hair redesign (side part, face-framing locks, wavy silhouette
instead of a cowl). The T02/B01/F01 capsule hood intersects the larger hair
(271 pairs in 16 run poses), so the hood refit is required before the capsule
moves to this head.
