# Female O02 (T02/B02/F02) on the +30% head

Status: repair-needed. The complete runner passes 13 gates, skips 1 and fails 1, the
dense fit, in a single pose. Art review pending.

Builder: `build_catalog_female_outfit_study.py --recipe T02,B02,F02 --controlled-components
--opening-relief .009 --back-relief .03 --back-clearance .0045 --collar-relief .003
--drop-correctives F02 --source F02=../../../F02/fitting-revisions/independent-keys-repair/F02.blend
--hood-shape (the fuller hood)`.

## Tooling generalized

The female builder and verifier now handle pieces by kind instead of naming T01, T02,
B01 and F01:
- **Long tops** T02, T04, T05, T06.
- **Short tops** T01, T03.
- **Full-length bottoms** B01, B02, B04.
- **Footwear:** F01 and F02 low-top, F03 and F04 tall.

The builder takes `--source ID=path` for revisions. Per-shoe opening heights are
recorded and checked, and accepted contact skin applies to whichever tee is in the recipe.

## Fitting

1. **The male F02 collar cut into the female ankle** (61 pairs at rest).
   `--collar-relief` pushes the collar zone outward per angular sector around each ankle
   until it clears the body by 3 mm, moving the corrective targets with it. All fit gates
   then passed.
2. **Export parity failed by 6.26 mm.** F02's heel-tab knee correctives are driven in
   Blender, but the female export and Three.js checks don't drive morphs; the Three.js
   check rejects active morphs outright. Dropping the correctives (`--drop-correctives
   F02`) restored exact parity.
3. **Without the fold, the heel tab meets the joggers.** At run 7.25, the deepest
   back-kick, the slip-on heel hits the back of the joggers (14 pairs). That is the
   leg-fold class the user accepted for B03, but it has not been accepted for B02 yet.

Every other gate passes:
- **Body, head and hair:** clear in all 163 poses.
- **Coverage:** zero visible holes.
- **Export:** parity at the micrometre level.
- **Materials and gallery:** pass.

Next: either accept leg-fold for O02 or support driven correctives in the female export
and Three.js checks, so the male fold can be kept.
