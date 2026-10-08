# Female T02/B01/F01 on the +30% head (fuller hood)

Status: complete runner passes, 15/15; art review pending. Builder:
`build_catalog_female_outfit_study.py --recipe T02,B01,F01 --controlled-components
--opening-relief .009 --back-relief .03 --back-clearance .0045 --hood-shape
'{"depth":0.04,"half_width":0.1,"bottom_z":1.215,"bowl_start_z":1.33,"side_arch":0.015,"bottom_bulge":0.55}'`
on `female/foundation/studies/h02-scale-130`.

`bottom_bulge` keeps 55% of the bowl depth at the lower rim, so the hood hangs as a
pouch instead of tapering into the back. The first run failed in 2 of 163 poses
(run 9.5 and 9.75, 6 pairs). The hood was not the cause: the rear H02 hair tips
touched the back of the upper sleeve as the arm swung back. A probe that assembled
only T02 and swept hood/hair/body found it in minutes, against 30 minutes for the
full runner. Moving the bowl start did not change the result. H02's rear
shortening went from 20% to 30%, and A01, A02 and O01 were rebuilt on the new hair.

Results: native and actual-runtime 163-pose sweeps with zero contacts, zero coverage
holes (T02 shown alone has the shared hem face #67100), detail attachment, export
and Three.js skinning, and materials. Gallery verification passes on desktop and
phone.

Open: the collar roll and front V from the reference; comparing hood depth with
the reference.
