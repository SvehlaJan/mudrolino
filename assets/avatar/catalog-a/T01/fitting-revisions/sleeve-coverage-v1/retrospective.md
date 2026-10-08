# T01 contact-aware coverage revision retrospective

Status: technical gates pass on both bases. A thin contact edge remains; art
review is pending. The garment is the canonical T01; only its body coverage changes.

Builders: `tools/blender/catalog/build_catalog_t01_sleeve_coverage.py` (male, this
folder) and `build_catalog_female_outfit_study.py --tee-underarm
--accept-armpit-crease` (female O01). Shared logic:
`catalog_coverage_visibility.py` (hole test, release, gait re-hide, settle loop)
and `catalog_tee_underarm.py` (arm-skin selection). Gate CLI for any outfit:
`verify_catalog_coverage_visibility.py`.

## Problem

The canonical short-top coverage hides arm skin inside the sleeve and beside the
torso. Through the sleeve opening and below it this showed as a jagged dark cut.
Collision gates never saw it, because they only test skin that remains visible.

## New hole test

A hidden face is a hole if a camera can see its spot and the first thing behind it
is visible skin seen from inside. Cameras stand 3 m away in 8 directions at 0.9,
1.2, 1.5 and 2.2 m. If garment or nothing lies behind the spot, it is only an
outline change and is ignored. That case occurs when hidden skin pokes slightly out
through cloth, as female calves do through B01.

Canonical male T01 has 1,177 such faces. Shown alone without shoes, canonical B01
has 830 at the ankle hem. T05 has 1.

## Construction

1. Release hidden arm skin that a camera can see. Inside and below the sleeve,
   skin within 1.5 mm (male) or 4 mm (female) of the tee stays hidden.
2. Re-hide released skin that touches the tee anywhere in the 163-pose walk/run
   sweep.
3. Alternate 1 and 2 until stable. Skin kept hidden because it touches the tee is
   recorded as the body vertex group `contact_T01`.
4. Hole gates count faces cut by `contact_T01` separately, as the user-accepted
   defect (2026-10-08): in the A-pose the arm presses against the torso and the
   sleeve rests on the arm.

## Results

| | Visible holes | Accepted contact faces | Motion |
| --- | --- | --- | --- |
| Male T01 alone | 13 (hem, from low cameras; covered by trousers) | 385 | 163 poses clear |
| Male O01 (+30% head) | 0 | 385 | 163 poses clear; export 6.07 µm |
| Female O01 (+30% head) | 0 | 385 | Complete runner passes, incl. Three.js 2.0 µm |

Renders show the dark band inside the sleeve opening reduced to a thin line where
the sleeve rests on the top of the arm, which is contact skin. The armpit crease
edge beside the torso remains, as accepted.

## Rejected approaches (2026-10-08)

- **Narrower coverage rules alone:** each exposed inner-arm skin that the side
  panel passes through (131-508 pairs).
- **Side-panel relief:** moving the panel off the arm at rest and in every gait
  pose, mapped back through skinning, did not converge. Intruders went
  842 → 792 → 814 and midpoint conflicts reached 7,725-11,740, because the arm
  touches the torso in many poses. Relief against visible arm skin only, without a
  torso limit, made rest worse (587 pairs).
- **Geometric armpit selector:** widened 2 → 8.5 cm to absorb remaining faces, it
  also swallowed the top-of-arm cut. It was replaced by recorded contact skin, which
  is a physical criterion rather than a region shape.
- **Bug:** `dominant()` counted the `covered_T01` group (weight 1.0) as a bone,
  misclassifying hidden vertices. An earlier passing result depended on it and was
  re-run after the fix.

## Open

- Thin contact edge where the sleeve rests on the top of the arm. A few mm of sleeve
  ease near the hem would let that skin show.
- T03 shares the coverage rule; done in the same way (see below).
- Per-piece previews (T01 alone, B01 alone) show hem cuts from low cameras.
- The male preview in this folder shows the original head; O01 uses the +30% head.

## T03

The builder takes `--id T03 --garment T03_raglan_tee`
(`T03/fitting-revisions/sleeve-coverage-v1/`). T03 shares the tee shell and
coverage rule, so it gives identical numbers: 1,177 visible cut faces down to 13
hem faces when shown alone, 385 accepted contact faces, and 163-pose motion clear.
