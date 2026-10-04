# A01 — orange baseball cap retrospective

Status: authored candidate. Final reference/style acceptance and actual accessory-slot registration remain open.

Reference: A01 in `assets/avatar/concepts/2026-10-04/catalog-a/04-accessories.png`: orange soft crown, simple curved bill with navy underside and a blue rear adjustment band. Editable master: `A01.blend`; separate exports: `A01.glb`, `body-A01.glb`. The mesh has 4,364 vertices / 4,272 polygons. Every vertex has one weight of 1.0 on Head. No head, hair or face geometry is hidden.

The first crown intersected H01's front waves in 653 triangle pairs. The limiting hair point required a minimum horizontal scale of 1.0802 for that crown envelope. Increasing the radii by roughly 11%, then moving the visor attachment to the matching front ellipse, cleared the hair with a small margin. The rear adjustment band follows the resized crown. Additional crown subdivision was unnecessary for this broad smooth object: keeping the authored 64-sector/17-ring crown reduced the complete asset from 10,570 to 4,364 vertices while preserving the silhouette.

Body/head fit is checked against both independent body meshes. The shared outfit assembler and motion reviewer now include H01_head in their obstacle set, rather than checking only the torso mesh. `attachment-report.json` compares every vertex to the analytic Head transform during independent yaw, nod, look-up and tilt poses, and also checks the cap against the head/body and other outfit pieces. Complete walk/run fitting is recorded in `motion-sweep-4x.json`; combined fitting and the GLB round trip are recorded under `../outfits/T01-B01-F01-A01/`.

Apply to later head accessories: fit from measured hair envelopes; update crown and brim together; use the same rigid head attachment for every cap part; check head/hair meshes explicitly; verify independent head gestures as well as locomotion; simplify broad surfaces before spending budget on detail. Shader colors remain plain materials with no accidental vertex-color modulation.

Still open: fitting on H02–H06, compatibility with bulky hoods/hair, final cap/profile/material review, expressive head/body art and actual accessory-slot registration. The renderer fixture currently proves the cap as an independent skinned mesh in the assembled outfit; it does not prove the legacy accessory attachment path. No Meshy spending was used.

Final fitting evidence for this revision: the independent and combined checks each cover 163 walk/run poses with zero body and layer contacts. The combined export agrees with the editable master within 6.07 micrometres across rest and 13 animated poses. Fifteen current GLBs validate with zero errors/warnings/infos/hints, material colors pass, and desktop rest/walk/run plus phone run render without page/console errors or failed GETs. The authoritative hashes and limits are in `../outfits/T01-B01-F01-A01/verification-summary.json`.

Six separate head gestures have zero obstacle contacts and a maximum analytic Head-attachment error of 0.307 micrometres. This proves rigid attachment on H01; other hair/head variants remain to be fitted.
