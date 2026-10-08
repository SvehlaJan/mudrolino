# B04 cloth branches and bounded inseam proposal

The complete improvement plan remains open. This step uses unchanged rolled-cuff
source `291d4927ef628ff300a7e3c3ed950776bc32944de6273f5d2fa915b9f7ace42d`;
no native or GLB candidate was saved, promoted or accepted.

`cloth-branch-diagnosis-v1/cloth-branch-diagnosis-report.json` reproduces exact
baseline polygon contact inventories at rest and run 7.25 in both domains.
Physical cloth-edge paths from actual lower-leg seeds distinguish panels that
cross X=0. All 13 rest outer/outer contacts join opposite branches. Near-equal
shared-seam paths remain ambiguous; the 57 raw cross-midline labels are not an
authoring inventory. Four 320px exact contacting-face cutaways were inspected;
they render grey despite requested colors, so branch assignments come from data.

Actual evaluated loop triangles count 55 rest pairs and 553 at run 7.25 in both
domains. Polygon BVHs count 55 and 548/549 but exchange/add/omit face identities.
The diagnostic preserves both methods. Use actual triangulation recomputed at
each pose for subsequent complete screens, mapping contacts to source polygons
and excluding only shared-index incident faces.

The one bounded separation hypothesis changes 46 fabric vertices in X only,
within Z 0.708–0.764 m. Lower-leg path imbalance must be at least 5 mm to avoid
assigning the shared seam; the proposal's full boundary is Z 0.65–0.775 m and
absolute X below 40 mm. Outer/inner coordinate floors are 4/6.5 mm per side;
height transitions taper the edit. Maximum movement is 8.676 mm. Every existing
shape target translates by the same per-vertex delta, retaining its correction
within float precision. Original skin, topology, materials, UVs, details, cuffs,
body, rig, gaits, bindings, drivers and remaining coordinates are unchanged.
Exact expected-state comparison checks all eight signature groups before the
screen. This floor construction is a hypothesis, not proof of normal thickness.

`inseam-separation-probe-v1/inseam-separation-screen-report.json` contains matched
baseline/proposal sweeps, each 164 native + 164 equivalent-runtime samples.
Both adapters' bind-rest error is zero. Baseline/proposal results:

| Check | Baseline | Proposal |
| --- | ---: | ---: |
| Rest whole-shell pairs, each domain | 55 | 16 |
| Worst whole-shell pairs, each domain | 553 | 509 |
| Native total pairs | 27689 | 20994 |
| Equivalent-runtime total pairs | 27688 | 20993 |
| Visible body contacts | 0 | 0 |
| F01/F03 contacts | 0 | 0 |
| Detail-to-cloth contacts | 0 | 0 |
| Maximum detail distance | 9.110 mm | 9.110 mm |

No sample's total count regresses, but seventeen new pair identities appear.
All sixteen remaining rest pairs are outer/inner fabric contacts. The rest
outer/outer crossings are removed; consistently constructing the lining is
still required. The separate folded-right-leg defect remains in motion.
The complete zero-contact criterion **fails**, so this is rejected evidence,
not a partially accepted model. Keep the broad rounded pocket target and do not
relax clearance or the 12 mm distance limit.

Next: establish actual corresponding outer/inner topology and construct an
ordered local thickness around the separated inseam, preserving the shared
crotch and the untouched outer silhouette. Diagnose remaining posed same-leg
contacts independently. Re-screen the matched source/proposal before saving,
then repair inherited keys and pockets and run dependent export/runtime proof.

Each completed job has exact transitive tool snapshots, input hashes and a
report hash in `execution-source/manifest.json`. Native stdout was observed
through owned terminal handles 78497 and 16230; no separate complete native log
was captured. Both handles are terminal. Three edge-path and three separation
behavioral contracts pass; the fresh whole unit suite passes 280 tests/53 files.
The separate integration qualification is recorded in the checkpoint: four
late-observation failures remain in its failed aggregate, despite 12/12 focused
reproduction cases passing. No fresh release or shipping acceptance is implied.
