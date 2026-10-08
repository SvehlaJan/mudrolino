# Female O02 (T02/B02/F02) on the +30% head

Status: complete runner passes, 15/15; art review pending.

Builder: `build_catalog_female_outfit_study.py --recipe T02,B02,F02 --controlled-components
--opening-relief .009 --back-relief .03 --back-clearance .0045 --collar-relief .003
--source F02=../../../F02/fitting-revisions/independent-keys-repair/F02.blend
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
   Blender, but the female export and Three.js checks didn't drive morphs; the Three.js
   check rejected active morphs outright. Dropping the correctives (`--drop-correctives`,
   kept as an option) restored parity, but then the heel tab hit the joggers at run 7.25
   (14 pairs).
3. **Correctives now driven in the female checks.** Both checks now apply the source's
   evaluated `knee_clearance_` values to the exported copy at every sample, as the male
   checks do, and record them per sample; any other active morph still fails. With the
   fold kept, everything passes.

Results:
- **Fit:** native and actual-runtime 163-pose sweeps with zero contacts.
- **Coverage:** zero visible holes.
- **Export and Three.js parity:** combined bound 2.0 µm.
- **Materials and gallery:** pass.
