# Canonical fitting scaffold retrospective

Metre-scale rig reconstruction retains 24 original joint names and rest orientations. Both object transforms are identity-scale. Rest geometry changed by at most 0.0000001333 m. Walk/run preserve 96 quaternion curves per clip; imported motion meshes/helpers are removed.

Blender 5.1 Mesh.copy() preserves vertex-group definitions and weights. Recreating definitions introduced 24 unused `.001` duplicates; this was diagnosed and corrected. Assert group names/count rather than copying them twice. The final group count is 24.

This is a fitting scaffold using the old faceless body, **not** accepted palette-A character art. Export validation found no errors but a non-root skin warning and unused UV info. Final body/head styling, source/export reimport comparisons, expressions and complete deformation acceptance remain pending.

## Styled foundation and motion/export correction

The current fitting source is `catalog-body.blend`, with the styled H01 head and a connected neck. `canonical-body.blend` remains the original faceless normalization reference. Body vertex positions and rest rig remain stable across current clothing masters.

Original run motion had hand/forearm contacts with the unclothed torso. Comparison with the original Meshy rig ruled out retargeting loss. Shared arm spacing is walk 0.10 rad and run 0.40 rad; only eight upper-arm quaternion curves change in each clip. `motion-preservation-report.json` verifies the other 88 curves are identical, and the endpoint difference is 0.0000000596 frames from float rounding.

The body previously retained more than four weights on 22 vertices. glTF truncated those weights and animated source/export positions differed by up to 0.73 mm. Normalize the same four largest influences in the editable foundation before building any garment. The new outfit round trip agrees within 0.000003446 m across rest and 13 animated checks. The original H01 master remains a historical style source; use the current four-weight fitting foundation for clothing.

T01 and B01 pass independent and combined 163-pose quarter-frame sweeps with zero body and layer contacts. The 11 latest GLBs validate with no errors/warnings/infos/hints; exported head colors and fresh desktop/mobile candidate rendering pass. Final face/body style, expression controls, budget and full-catalog acceptance remain open.

## Footwear clearance — current foundation revision

The run now adds conditional deep-knee relief up to 0.10 radians (~5.7 degrees), sampled at quarter frames, to LeftLeg and RightLeg. This changes eight lower-leg quaternion curves in addition to the eight arm curves: 80 other run curves and 88 walk curves remain exactly unchanged. Bind pose and duration remain stable; endpoint rounding is 5.96e-8 frames. The earlier statement that only eight run curves changed describes the historical arm-only revision.

Current T01/B01/F01/A01 masters pass independent and combined 163-pose checks, including H01_head obstacles. The four-piece export round trip is within 6.07 micrometres, all 15 current GLBs validate cleanly, and six cap head gestures pass analytic rigid attachment and clearance. See `../outfits/T01-B01-F01-A01/verification-summary.json` for hash-bound evidence and explicit limits. Use this foundation for later pieces; original canonical/H01 source files remain historical references. Final art, expressions, budget and full-catalog compatibility remain open.
