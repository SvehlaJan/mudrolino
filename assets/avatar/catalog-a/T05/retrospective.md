# T05 — blue/navy crew sweatshirt retrospective

Status: fit-verified authored candidate; final style/budget/head compatibility and catalog registration remain open.

The T05 reference has a matte blue body, navy crew collar, waistband and cuffs. `T05.blend`, `T05.glb` and `body-T05.glb` use the verified long-sleeve shell: 5,502 vertices / 5,478 polygons, 24 bone groups and at most four normalized influences. Actual mesh cuts define the contrasting trim boundaries; forearm-axis planes keep cuffs perpendicular to each arm. The hem classification excludes arm influences. Body coverage overlaps the elbow regions and preserves visible neck, wrists and hands.

No new fit failures were found. The independent master and T05/B01/F01/A01 combination each pass all 163 quarter-frame walk/run poses with zero body/head/layer contacts. Six head and six cap gestures pass. Fifteen GLBs validate cleanly, materials pass, and 14-pose bidirectional source/export agreement is within 6.07 micrometres. Fresh desktop rest/walk/run and phone run render without page/console errors or failed GETs on the existing identity-matched production build. Full proof: `../outfits/T05-B01-F01-A01/verification-summary.json`.

Apply before T06: reuse the verified shell and precise trim cuts; give new hardware surface-interpolated weights; run the full gates from `verify_catalog_piece.py`. This sequential runner stops at a failed stage and retains its log, reducing repeated manual command assembly while still checking each current source hash. The build was reused because app source did not change; all candidate asset checks were freshly run.

Still open: final reference/material/budget review, other heads and bottoms, feedback/expression motions, full-body mobile framing and actual slot registration/switching. Candidate assets remain separate from published models. No Meshy credits were spent.
