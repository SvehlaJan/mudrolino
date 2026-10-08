# Avatar fit and 3D tooling audit

Reviewed 2026-10-07. This audit builds on the
[2026-10-06 model audit](2026-10-06-avatar-model-audit.md), which inventoried every
design. This one asks two questions: **does each model look right when worn**, and
**is the tooling helping or getting in the way**. It started from a user report:
the A01 baseball cap does not fit the head.

No model, reference or review state was changed. Evidence and the scripts that
produced it are in `artifacts/verification/avatar-catalog/2026-10-07-audit/`.

## Summary

- **The A01 cap is not fitted.** Its crown floats 9–12 cm above the hair, its
  band sits 6 cm above the ears, and it intersects the current painted H01 hair
  (233 triangle pairs). Its "fit-verified" status was earned on the original H01
  head, which is no longer the preferred head, and only checked for collisions,
  not for fit.
- **No garment is loose in the same way.** A distance survey of all 14 male
  garments finds normal relaxed ease. The cap is the only outlier.
- **Head size is the biggest visible gap from the references and blocks most
  head-related work.** The models are about 5.6 heads tall; the reference sheets
  are about 4–4.5. Of the existing proposals, **+30% is closest on both bases**.
- **Tooling optimizes for collision proof and catches neither fit nor look.**
  About 90 piece-specific scripts, tests and plans went into repairing
  B03/B04/F02 without producing an accepted piece. Meanwhile the cap passed every gate.

## 1. Why the cap doesn't fit (measured)

The cap was measured against the three current heads in rest pose. The gap is the
space between the inside of the crown and the head/hair surface, along rays from
the head centre (`cap-fit.json`).

| Head | Cap ∩ head/hair | Gap at crown top | Gap at 60° up (front/side/back) | Band above ear tops |
| --- | --- | --- | --- | --- |
| H01 original (no longer preferred) | 0 | 104 mm | 59 / 69 / 101 mm | 59 mm |
| **H01 painted (current)** | **233 pairs** | 120 mm | 84 / 78 / 91 mm | 59 mm |
| H02 female (no cap fit exists) | 0 | 122 mm | 88 / 94 / 93 mm | — |

Close-ups: `board-H01-painted.png`, `board-H02.png`, `board-H01-original.png`.

How it happened (`tools/blender/catalog/build_catalog_a01.py`):

1. The crown is a fixed half-ellipsoid (radii 181 / 175 / 212 mm) at a hard-coded
   height. Its first version hit one front wave of the original H01 hair. The
   whole crown was then scaled up ~11% to clear that one spot. That front-quarter
   point is now the only close region (7–8 mm); everywhere else the crown balloons.
2. The band is a flat horizontal ring at z = 1.703 m. A real cap band tilts: it
   sits on the forehead in front, just above the ears at the sides and on the
   back of the skull behind. The flat, high band makes the cap perch like a helmet.
3. The cap is sized to clear the full hair volume. Real caps compress the hair,
   so they are sized to the skull plus a thin layer of hair.
4. The gates check only that nothing intersects. Nothing measures how far the cap
   is from the head, so a cap floating 12 cm high passes.
5. Its proof is bound to the original H01. When the gallery switched to the
   painted head (whose hair comes from the reference-A study), nothing marked the
   cap as stale. The catalog still shows it as `recorded-pass`.

Fix specification (both bases):

- Give each hair style an **under-hat variant**: hair inside the crown is
  flattened to a 8–12 mm layer over the skull, and hair below the band stays as
  is. This is the usual approach for headwear on stylized avatars, and it is
  reusable for A02 and hoods.
- Derive a **head envelope** (skull plus compressed hair) and **landmarks**
  (brow line, ear tops, back of skull) from each head instead of hard-coding them.
- Rebuild A01 **from the envelope**: crown 3–6 mm outside it, band tilted along
  brow → ear tops → back of skull, and a brim attached at the band front with the
  reference's downward curve. Keep the palette, the 6 panel seams, the button
  and the navy rear strap.
- Add a **fit gate**: zero intersections *and* a crown-to-envelope gap of 12 mm or
  less over at least 90% of the crown, with the band within 5 mm on 90% of the
  ring and never more than 15 mm. (Implementation showed that fabric must bridge
  hair edges such as a front parting, so "5 mm all round" was too strict.)
- Mark A01's current technical state as stale/repair-needed for the painted
  H01 until this lands.

Do the rebuild after the head-size decision, but build the envelope tooling now.
With the envelope approach, a +30% head becomes a re-run instead of a re-author.

## 2. Every model: what to improve

Garment ease survey (`garment-ease.json`): median distance from garment vertex to
body. Tops are 31–41 mm (hoodies reach 77–80 mm at the 90th percentile because of
the hood), bottoms 28–34 mm and shoes 14–18 mm. These are plausible relaxed fits,
and no garment floats like the cap. Visual findings come from the 2026-10-06
four-view captures and the head-size proposals. Model bytes have not changed
since then, except for B04's isolated revisions.

| Model | Visible problem | Action | Priority |
| --- | --- | --- | --- |
| Both bodies | Heads read small (≈5.6 heads tall vs ≈4–4.5 reference); thin limbs; small feet | Choose head scale (recommend +30% both). Keep body topology/rig/gaits fixed. | **Decide now** |
| H01 painted | Good face; hair is acceptable but bulky at the sides, which is where the cap hits | Re-run at chosen scale; add under-hat variant | 1 |
| H02 | Hair reads as a smooth pointed cowl/helmet; no part | Side part, face-framing locks, shoulder-length waves; under-hat variant | 1 |
| A01 cap | Floats, perches high, intersects current H01; no female fit | Rebuild from head envelope (section 1) on both bases | **1 (reported)** |
| T02 / T04 hoodies | Hood is a flat ridge, unreadable from front | Fuller lowered hood bowl after head scale; T04 orange lining, ivory zip | 2 |
| T06 henley | Buttons tiny | Four large navy buttons (already decided), wider placket | 2 |
| T01 / T03 / T05 tees and sweatshirt | Close to reference; edges boxy. **T01 underarm (found while fitting female T01):** the side panel passes through the inner arm in the A-pose, and the coverage rule hides inner-arm skin, leaving a small jagged gap visible inside the sleeve opening on both bases | Rounder hems/ribs. **2026-10-08:** contact-aware coverage releases camera-visible arm skin (canonical 1,177 visible cut faces down to 0 in O01 on both bases). The tee-contact edge (385 faces, including a thin line where the sleeve rests on the arm) is accepted for now and reported separately. T03 shares the rule. | 2 |
| B01 trousers | Fine; details faint | Readable waistband/pockets; keep construction | 3 |
| B02 joggers | Fine; gather above cuff weak | More volume above cuffs | 3 |
| B03 shorts, B04 trousers | Blocked by corrective-key leakage and self-contact after days of repair | **Rebuild from B01's passing construction** (time-boxed) | 2 |
| F01–F04 shoes | Hug the foot (good), but read small and thin-soled next to the chunky reference | Thicker soles, rounder toe caps after head scale; F02 rebuilt from F01's shell | 3 |
| Outfits with cap (11 male assemblies) | Inherit the cap problem | Reassemble after A01 rebuild | with A01 |
| Walk / run | Not reviewed as full loops | Review loops after head scale; keep bytes unless needed | 4 |

## 3. What to add next

Ordered so each step reuses the previous one and nothing gets fitted twice.

1. **Decide head scale** for each base. Recommend +30%; it is the closest of the
   reviewed options to both reference sheets. Review page:
   `artifacts/verification/avatar-catalog/proportion-options/2026-10-06-v3/review/review.html`.
2. **Headwear foundation and A01 rebuild:** head envelopes and landmarks, under-hat
   hair for H01/H02, parametric A01 on both bases and the new fit gate. This fixes
   the reported problem and adds the missing female cap.
3. **A02 beanie.** It uses the same envelope, so it is cheap after step 2. It also
   completes O05 with the existing T05/B01/F04 core.
4. **Female T01, then exact O01 (T01/B01/F01) on both bases.** This is the first
   complete paired outfit and the only missing piece of the first capsule.
5. **Fuller T02/T04 hoods and T06 buttons**, fitted against the final heads.
6. **Rebuild B04, B03 and F02** from the B01/F01 construction that already passes.
   Cap each at about a day before reconsidering.
7. **A03/A04 glasses** (need final eye/ear/nose landmarks from step 2), then **A05
   backpack** and **A06 scarf**.
8. Remaining female wardrobe by outfit recipe, then H03–H06 hair and expressions
   (E06 blink first).
9. Runtime budget on a real phone before product integration. Current previews
   are 112k–179k triangles.

## 4. Tooling review

What works: the headless Blender CLI with the shared queue and failure
propagation; saved procedural builders; source-hash-bound reports; the live
`/avatar-preview` catalog with references beside the model; and 320px review
boards. Keep all of these.

What to improve, by expected impact:

1. **Measure fit, not just collisions.** Every gate today asks whether two
   surfaces intersect. Add gap and ease measurements (radial gap maps for
   headwear; per-region ease percentiles for garments, like `garment-ease.json`)
   with simple thresholds. This is the gate that would have caught the cap.
   Promote `measure_cap.py` and `ease_survey.py` from the evidence folder into
   `tools/avatar/`, with tests.
2. **Make proof go stale automatically.** Each proof should record the revisions
   it was run against: head, hair, body and rig. When a preferred revision
   changes, a status command should mark the dependent proof stale and the
   gallery should show it. The hashes are already recorded; only the comparison
   against the current preferred revision is missing.
3. **Drive builders from measured landmarks, not coordinates.** A01 alone has 11
   absolute height literals (e.g. band at 1.703 m). A +30% head would break every
   head-dependent piece. Shared envelope/landmark helpers (head, neck, feet) make
   scale changes a re-run.
4. **Look before you sweep.** In the per-piece loop, render an automatic
   four-view sheet beside the reference on every preferred base first. Run the
   160-pose sweeps only after it looks right. Today the expensive technical proof
   comes first, and art problems like the cap surface late.
5. **Stop growing one-off repair tooling.** B04 has 61 dedicated builders,
   scripts, tests and plans, F02 has 25 and B03 has 4, with no accepted result.
   Replace them with a few generic diagnostics (contacts by pose/region, side isolation, shell
   self-intersection) that take a piece ID, and archive the one-offs. Set a time
   box after which the default is to rebuild from a working construction.
6. **One structured status source.** Status is restated in prose in
   `catalog-progress.json` (free-text `stage` strings), `catalog.json` review
   states, `ROADMAP.md` (one avatar bullet is ~250 words),
   `docs/avatar-workflow.md` (520 lines), a 550-line handoff and the
   retrospectives. These have already drifted: A01 reads as fit-verified. Make
   `catalog.json` hold enum states plus evidence links, generate the short human
   summary from it, and move history into retrospectives. That also shrinks what
   every agent session has to read.
7. **Store binaries properly.** Git tracks about 1 GB under `assets/avatar`
   without LFS: 84 `.blend` (≈444 MB), 189 `.glb`, and 325 files in
   history/rejected/revision folders. About 470 MB more is untracked and pending.
   The packed repository is already 312 MB. Move `*.blend`/`*.glb` to Git LFS for
   new commits. Stop committing regenerable intermediates such as per-piece
   `body-XX.glb`, each of which embeds the full body (≈140 MB total). Keep
   rejected studies as reports plus builder arguments rather than binaries.
   Rewriting existing history is destructive and needs a separate explicit
   decision.
8. **Bind proofs to what they actually use.** The female outfit verifier hashes
   every `.py` in `tools/blender/catalog` at start and fails if that set changes.
   Adding an unrelated script while a 30-minute proof runs invalidates it, and any
   new tool makes every earlier proof "stale". Record the modules a gate imports
   (e.g. `sys.modules` after loading) instead of the whole directory.
9. **Readable builders.** Several builders are written as `;`-joined one-liners
   with unnamed magic numbers. Format them normally and lift design parameters
   into a named per-design block that mirrors `docs/avatar-construction-targets.md`.

Blender MCP stays optional. Its screenshot tools fail on large payloads, so CLI
renders remain the reliable review path.

## Reproduce

```bash
D=artifacts/verification/avatar-catalog/2026-10-07-audit
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py $D/measure_cap.py $D/rerun
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py $D/ease_survey.py $D/rerun-ease.json
```

Both scripts are read-only: they import the current GLBs and save nothing back.
Review boards are at most 320px wide.

## Execution checkpoint (2026-10-07)

The user approved these recommendations, including +30% heads on both bases.

- **Heads:** isolated +30% studies for H01 and H02 pass fresh checks: sources,
  rig, gaits and body unchanged; hair and garments clear over 163 gait poses plus
  six gestures; UV/image identity; export 0.6 µm. H02's shoulder-length hair
  needed a hang taper because scaled tips hit the upper arms in the run. The
  female T02 hood now intersects the larger hair and needs its refit.
- **A01:** rebuilt from head envelopes on both bases
  (`A01/fitting-revisions/head-envelope-v1/`). Crown gap p50 is 3.3–3.5 mm (was
  89–130 mm), band p90 is 4.1–4.5 mm, there are zero intersections over 168 gait
  and gesture poses, and desktop/phone gallery playback passes. Art review is
  pending. The old cap is kept as history and marked repair-needed.
- **Tooling items 1 and 3** (fit gate; landmark/envelope-driven building) are
  implemented for headwear in `catalog_headwear_plan.py` with 17 Vitest cases.
  Items 2 and 4–8 remain proposals.
- **A02:** first beanie on both bases, using the same tooling now shared in
  `catalog_headwear_geometry.py` (A01 was rebuilt on it with identical results).
  Each item has its own `under_<ID>` hair key. The fit gate passes (crown p50
  4.8–5.4 mm, band p90 3.4–3.7 mm, 168 poses clear). The male assembly is the O05
  recipe.
- **O01 on both bases:** female T01 is new. The female outfit builder, verifier,
  runner and export check now take a recipe. The male O01 uses a new +30% male
  foundation and opt-in `--uv-export` in the assembler, since the garment exporter
  dropped the painted face's UVs. Fit, export and material gates pass on both. A
  new tee-sleeve occlusion gate exposes the inherited T01 underarm gap on both
  bases. Female hair got 20% shorter rear locks, and the verifier now counts
  visible skin-through-hair rays instead of raw head/hair pairs.
- **T01 underarm (2026-10-08):** new general hole gate (`verify_catalog_coverage_visibility.py`:
  hidden faces a camera can see with visible skin behind them). Canonical male T01
  has 1,177; B01 shown alone has 830 at the ankle. Contact-aware T01 coverage
  reaches 0 in O01 on both bases; the female complete runner and all male outfit
  gates pass. The side-panel relief did not converge and was dropped.
