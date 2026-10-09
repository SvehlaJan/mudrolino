# Female O04 (T04/B04/F03) on the +30% head

Status: complete runner passes, 15/15; art review pending.

Builder: `--recipe T04,B04,F03 --controlled-components --back-relief .03 --back-clearance .0045
--hood-shape (the female fuller hood) --source T04=../../../T04/fitting-revisions/hood-v2/T04.blend
--source B04=<rolled-cuff-v1 candidate>`.

1. **The male hood-v2 cut into the bob** (up to 405 hair pairs in 137 poses). The female
   lowered hood that replaced T02's now covers every hoodie (`HOODIES`: T02 and T04 with
   their own fabric and lining materials), along with the back relief and the controlled
   pocket and zip re-weighting.
2. **The T04 pocket's outer top corner touches its own shell** in some walk poses (35
   pairs). The male T04 has the same 35 pairs at the same corner, so this is inherited.
   The female verifier still treated detail-to-shell contact as a hard gate. Under the
   2026-10-08 standard it is now a reported diagnostic
   (`detail_own_shell_diagnostic`); attachment distance and free-extension growth still
   gate.
3. **Pocket re-weighting now uses torso cloth only.** It had no effect here, but it stops
   a hanging sleeve from steering a pocket. Female O02 was re-run and still passes.

Results:
- **Fit:** native and actual-runtime 163-pose sweeps clear.
- **Coverage:** zero holes.
- **Export and Three.js parity:** 2.0 µm.
- **Materials and gallery:** pass.
