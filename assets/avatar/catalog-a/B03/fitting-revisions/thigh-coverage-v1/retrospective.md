# B03 thigh coverage revision (thigh-coverage-v1)

Status: coverage fixed; one decision is open (leg-fold contact). Builder:
`build_catalog_t01_sleeve_coverage.py --id B03 --garment B03_casual_shorts --region thigh
--source ../independent-keys-repair/B03.blend` (the side-isolated B03).

## Problem

Canonical B03 hides only the pelvis. The thigh under the leg tube is live skin, and
it poked through the shorts at run 4.75 and 9–10.5.

## Construction

1. Hide thigh/hip skin from 15 mm above the hem ring up to the pelvis mask.
2. Release hidden skin any standard camera can see at rest.
3. Release hidden skin any camera can see in **any of the 163 gait poses**, since the
   legs gape as they swing. Re-hide released skin that touches the shorts, and never
   release the pelvis.

Rest-only release left up to 347 see-through faces in walk poses, and every 8th pose
missed 22 at run 15.0, so the release checks all 163.

## Results

- Thigh poke-through is gone.
- 688 thigh vertices were released by pose, with zero contact skin.
- Side isolation and glTF pass.
- Shown alone, 5 faces at the waistband show in run 14.5–15.0. They are canonical
  pelvis-mask edges, and a top covers them.
- The only remaining body contact is the run back-kick (6.25–8.25 and 14–15.75): the
  heel and calf pass into the rear of the shorts, up to 338 pairs.

## Why that contact is a gait property

- **The bare body passes through itself:** in the same frames its lower leg goes
  into its own thigh and seat, up to 562 face pairs.
- **B01 trousers do it too:** they fold through themselves there, with 309 calf-to-thigh
  cloth pairs that no gate checks.
- **Every garment meets it:** any garment covering the thigh must be crossed by the
  folding leg.

In O03 (T03/B03/F01, `../../../outfits/O03-head130-T03-B03-F01`), the shoe makes the
same contact with the shorts (up to 436 pairs). Options: accept leg-fold contact as
a recorded class, as the T01 armpit was; soften the run's 145° back-kick for everyone;
or keep trying shorts deformation, which earlier inflation and projection loops made
worse.

## Decision (2026-10-08)

The user accepted leg-fold contact as a known class. `review_catalog_motion.py --accept
leg-fold:<shorts>` reports pairs between the shorts and lower-leg, foot or shoe faces
separately, and everything else must stay at zero. B03 passes with up to 338 accepted
pairs, and O03 (T03/B03/F01) with up to 459. B03 thigh-coverage-v1 is now the current
male B03.
