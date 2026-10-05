# T06 — ivory henley retrospective

Status: fit-verified candidate; final reference/style/budget/head compatibility and runtime registration remain open.

The separate editable master and garment/body GLBs use an ivory long-sleeve shell, a projected button placket and four rounded navy buttons matching the pictured catalog design. The fitted shell has 6,008 vertices / 6,014 polygons, 24 bone groups and at most four normalized influences. The placket and hardware inherit barycentrically interpolated weights from the actual cloth surface. The subtle orange collar facing in the concept still needs the final material/reference pass.

No new fitting failures were found. Independent and T06/B01/F01/A01 sweeps pass 163 quarter-frame walk/run poses with zero body/head/layer contacts. The stitched-detail gate passes 164 rest/walk/run poses with a maximum separation of 7.154 mm against a 12 mm cap. Six head gestures and six cap gestures pass; 15 GLBs validate cleanly, materials pass and bidirectional export deformation agrees within 6.07 micrometres over 14 poses. Fresh desktop rest/walk/run and phone run render without page/console errors or failed GETs on the existing identity-matched production build. Current source hashes and scope are in `../outfits/T06-B01-F01-A01/verification-summary.json`.

Apply before B02: retain category-specific construction, reuse the shared independent-master driver and sequential fail-fast gate runner, project new stitched seams onto the finished cloth, and transfer their weights from surface triangles. The next bottom must have its own relaxed silhouette and cuff boundaries, with shoe clearance checked in the combined outfit. Document the single-command gate in the shared README so verification does not depend on manually assembling ten commands.

Still open: final art/material/budget acceptance, other heads and footwear, feedback/expression motions, full-body mobile framing and actual catalog slot registration/switching. No app source changed, no fresh app build is claimed, and no Meshy credits were spent.
