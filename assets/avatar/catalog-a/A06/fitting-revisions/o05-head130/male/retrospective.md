# A06 loop scarf on O05 (male, +30% head)

Status: technical gates pass; art review pending. Builder:
`tools/blender/catalog/build_catalog_a06.py --outfit-blend A02/fitting-revisions/head-envelope-v1/male/A02.blend
--top T05_crew_sweatshirt_outfit` (O05 = T05/B01/F04/A02). No outfit recipe includes A06,
and a scarf pairs naturally with the sweatshirt and beanie.

## Construction

- **Tube:** a chunky ivory tube (section 4.6 × 4.0 cm) on a closed path around the
  neck. It starts 6 mm off the neck skin above the collar and rests on the top.
- **Band:** navy, wrapped around the front.
- **Weights:** the body's at the matching neck/shoulder point, limited to neck, Spine,
  Spine01 and the shoulders, so the scarf follows the upper torso and never the head.
- **Rest refinement:** each centreline point is pushed out until the tube clears the
  top, the body and the head by 9 mm, then smoothed. The head counts at rest and in
  five head gestures; the scarf ignores the Head bone, so those posed heads are fixed
  obstacles.
- **Posed refinement:** each centreline point moves through its own blended skin
  transform in every gait pose. It is checked against the posed top, head and body,
  and any push maps back to rest through the inverse transform.

## What didn't work

1. **A thin 3.4 cm tube:** it read as a neck pillow.
2. **Neck clearance measured on skin alone:** the tube cut the sweatshirt collar
   (360 pairs).
3. **Head gestures alone:** in the run, the neck extends and drops the back of the
   head onto the scarf (142 pairs).
4. **Gait obstacles mapped back through fixed neck, spine or shoulder bone frames:**
   this never matched the scarf's blended skinning. Contacts went 40 → 10 → 8 → 14.
   Using each point's own skin transform fixed it.

## Results

- **Motion:** 163 poses with zero body and layer pairs.
- **Head:** five gestures clear.
- **Export:** 5.74 µm.
- **Validity:** materials and glTF pass.
- **Gallery:** passes on desktop and phone.

## Open

- Female A06: H02's bob hangs onto the shoulders where the scarf sits.
- Art review of thickness and front drape.

## Rebuild (2026-10-09)

Rebuilt with the builder change from the female fit: points relax along the loop between
posed refinements, and the build fails on a gap over four median spacings. Male spacing is
9–47 mm. Motion, head gestures, export (5.7 µm), materials and glTF still pass. The
committed path before this change had the same shape (verified identical before relaxation
was added).
