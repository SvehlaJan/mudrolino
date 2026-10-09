# Female O03 (T03/B03/F01/A01) on the +30% head

Status: technical gates pass with the accepted contact classes; art review pending.

1. **Core:** `female/outfits/studies/T03-B03-F01-head130` uses `--recipe T03,B03,F01
   --opening-relief .009 --controlled-components --tee-underarm --accept-armpit-crease
   --accept-leg-fold --source B03=../../../B03/fitting-revisions/thigh-coverage-v1/B03.blend`.
   - **Tee:** T03 takes the tee rule (arm skin release, 258 contact vertices).
   - **Shorts:** the female builder has a shorts rule. It hides hips and thighs inside
     the shorts from 15 mm above the hem to below the waistband, then releases thigh
     skin visible at rest or in any gait pose (688 vertices, zero contact).
   - **Leg-fold:** the dense-fit gate reports accepted leg-fold pairs (lower-leg, foot
     and shoe faces against the shorts) separately, as the male motion gate does.
   - **Result:** complete runner 15/15.
2. **Cap:** `attach_catalog_headwear.py` adds the A01 cap and its `under_A01` hair key from
   the female cap study. Results:
   - **Motion:** 163 poses clear apart from accepted leg-fold (up to 440 pairs).
   - **Cap gestures:** clear.
   - **Export:** 1.1 µm.
   - **Materials, glTF and gallery:** pass.
