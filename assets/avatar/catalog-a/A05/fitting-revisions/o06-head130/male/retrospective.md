# A05 backpack in O06 on the +30% head (male)

Status: technical gates pass with one user-accepted contact class (arm-brush,
2026-10-08); art review pending. Builder: `tools/blender/catalog/build_catalog_a05.py
--outfit-dir outfits/O06-head130-T06-B02-F02 --top T06_henley_outfit`. This folder holds
exact O06: T06 placket-v2, B02, F02 repair and A05.

## Construction

- **Pack:** a rounded box (superellipsoid, 30 × 34 × 12 cm) with a front pocket,
  ivory zip and pulls, and a carry loop, in T02's tangerine. It sits 14 mm behind the
  most backward point of the henley under it. Weights are the body's at the matching
  back point, limited to Hips/Spine02/Spine01/Spine, so it bends with the back but not
  with the shoulders.
- **Straps:** navy padded bands. They go from inside the pack, over the shoulder clear
  of the neck, down the chest and round the side at the waist, back into the pack's
  lower corner. Pack and straps are one object, so the sewn-in ends are not contact.

## What it took (all on the strap)

1. Nearest-point projection onto the two-layer henley sometimes landed on the inner
   layer. Control points inside the cloth also flipped the outward normal.
   **Fix:** project from the torso axis outward through the top only, taking the
   first hit and the outer layer within 6 mm.
2. Rays from outside hit the sleeve where the arm hangs beside the torso. **Fix:** the
   same radial rule for lifting band vertices to clearance, since a flat band digs in
   at its edges.
3. Under the arm there is no room; the elbow sits 2–4 cm from the torso at z 1.1. The
   strap wraps at the waist instead.
4. Weights inherited from the nearest cloth sometimes came from the sleeve, so the
   strap swung with the arm into the torso. **Fix:** weights come from the torso
   layer found radially.

## Results

- **Motion:** 163 poses with zero body and layer pairs, apart from accepted arm-brush
  contact (forearm sleeve against the strap's waist segment in the walk, up to 276
  pairs; `review_catalog_motion.py --accept arm-brush:A05_backpack_outfit`).
- **Coverage:** zero holes at rest. In motion, one face at run 5.0, as in every
  long-top outfit.
- **Other gates:** corrective sides, export at 18.5 µm, head clearance, materials and
  glTF pass. Gallery verification passes on desktop and phone.

## Open

- Pack size against the reference, which spans more of the back.
- Female A05.
- Packs with hoodies; the lowered hood occupies the upper back.
