# Palette-A Blender catalog workflow

Start with `docs/avatar-workflow.md` for the shared Codex/Claude handoff and face
texture contract. `npm run avatar:blender -- --version` checks the selected Blender;
set `BLENDER_BIN` to test another installation. The Python gate runners use the
same resolver. Replace hardcoded executables in the examples below with the
selected path, or use `python3 tools/avatar/blender_cli.py SCRIPT [arguments]`.

The approved concepts are in `assets/avatar/concepts/2026-10-04/catalog-a/`.
Current progress and proof pointers are in `assets/avatar/catalog-a/catalog-progress.json`.
Use `foundation/catalog-body.blend` as the fitting source. The original canonical/H01 files and superseded outfit directories are historical references.

The active review UI is `/avatar-preview`, the live gallery. The old modular
workbench/customization UI and pre-catalog male exports are retired; shared
catalog construction sources, references, gaits and fitting history remain.

## Per-piece loop

1. Author the category topology against the shared metre-scale rest body. Preserve the rig, body topology and original vertex indices. Keep skin weights normalized and limited to four influences; use position for anatomical side assignment. Save the piece separately with a reversible `covered_<id>` body group.
2. Inspect front, back, side and three-quarter reference views. Review copies must be no wider than 320px. Measure contacts by anatomy/part before changing geometry, motion or coverage. Openings must preserve visible neck, hands and ankles.
3. Assemble a representative outfit from the independent masters. The assembler checks exact shared body topology/rest coordinates and unions coverage by original vertex index. Extend `OBJECT_NAMES` when adding a new piece.
4. Run gated independent and combined complete-cycle checks with all body/head obstacles and all garment pairs. Include quarter frames and clip endpoints. A clean selected frame alone is insufficient. Motion metadata binds each sweep to its source SHA-256.
5. Compare the exported GLB against the evaluated master, validate structure/materials, and render desktop/mobile motion in Three.js. The tool-only body/combined-garment fixture proves skinned rendering; actual per-piece product slot registration/switching needs separate integration checks.
6. Write the per-piece retrospective, apply its concrete workflow improvement, update progress and ROADMAP, and consolidate proof only while every source/export/browser hash still matches. Changes to foundation motion or geometry require rebuilding and rechecking dependent pieces. Keep the full catalog scope open until final style/budget/runtime acceptance.

## Commands

After building and inspecting a piece, wrap the sequential runner once with
`python3 tools/avatar/blender_queue.py --`. All agents share this per-user lock
across authorized checkouts. Use single-agent geometry authoring, one model/change at a time; optional subagents may perform narrow read-only checks of stable artifacts. Start the fixed production preview described below first; a previous build can be reused when app source is unchanged and its identity still matches. Every asset gate runs fresh, saves a stage log, and stops on failure:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py \
  --id=T05 --garment=T05_crew_sweatshirt --outfit=T05-B01-F01-A01 --head-check

python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py \
  --id=T06 --garment=T06_henley --outfit=T06-B01-F01-A01 --head-check \
  --surface-material='A ivory henley fabric' \
  --surface-material='A ivory henley ribbing' \
  --detail-material='A ivory henley placket' \
  --detail-material='A navy henley buttons'
```

The runner covers independent motion, optional opening anatomy and stitched details, assembly, combined motion, exported deformation, optional head clearance, cap attachment, GLB/material validation, production browser rendering and current-hash proof consolidation. The current export/corrective profile has 16 poses including run 7.25 and run 15.25. The latter is mandatory for F04. Bilateral corrective-side reports must match every independent/outfit source. Earlier 14-pose summaries are historical evidence and need refreshed comparison before reconsolidation under this profile. Add new IDs to the assembler's explicit object-name map. A successful candidate still needs final art, budget, other compatible heads/motions and real slot integration.

Run from this checkout. Blender is sequential, with script failures propagated:

```bash
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
CATALOG=assets/avatar/catalog-a
OUTFIT=T01-B01-F01-A01
REVIEW=artifacts/verification/avatar-catalog/outfits/$OUTFIT

"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/blender/catalog/assemble_catalog_outfit.py -- \
  --foundation "$CATALOG/foundation/catalog-body.blend" \
  --catalog-dir "$CATALOG" --pieces T01,B01,F01,A01 \
  --output-dir "$CATALOG/outfits/$OUTFIT" --review-dir "$REVIEW"

"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/blender/catalog/review_catalog_motion.py -- \
  --blend "$CATALOG/outfits/$OUTFIT/outfit.blend" \
  --body body_underlayer_male,H01_head \
  --garment T01_crew_tee_outfit,B01_straight_trousers_outfit,F01_strap_sneakers_outfit,A01_baseball_cap_outfit \
  --substeps 4 --require-clear --target-z .92 --ortho-scale 2.10 \
  --output-dir "$CATALOG/outfits/$OUTFIT" --review-dir "$REVIEW"

"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/blender/catalog/verify_catalog_outfit_export.py -- \
  --blend "$CATALOG/outfits/$OUTFIT/outfit.blend" \
  --glb "$CATALOG/outfits/$OUTFIT/outfit.glb" \
  --report "$CATALOG/outfits/$OUTFIT/export-deformation-report.json"

"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/blender/catalog/verify_catalog_attachment.py -- \
  --blend "$CATALOG/outfits/$OUTFIT/outfit.blend" \
  --object A01_baseball_cap_outfit --bone Head \
  --obstacles body_underlayer_male,H01_head,T01_crew_tee_outfit,B01_straight_trousers_outfit,F01_strap_sneakers_outfit \
  --report "$CATALOG/A01/attachment-report.json"

node tools/avatar/verify_catalog_exports.mjs --outfit="$OUTFIT"
```

For each independent sweep, supply `<id>/<id>.blend` and the original piece object name. Current names are `T01_crew_tee`, `B01_straight_trousers`, `F01_strap_sneakers` and `A01_baseball_cap`.

Blender 5.1 on this Mac may need execution outside the default sandbox for Metal initialization. Keep one Blender process active. Assign the action slot as well as the action, preserve Mesh.copy() group definitions, and copy numeric RNA group indices before removing weights.

The reusable browser fixture expects a dedicated loopback dev server on port 3003:

```bash
VITE_AVATAR_POC_ENABLED=true npm run dev -- --port 3003 --host 127.0.0.1 --strictPort
node tools/avatar/verify_catalog_preview.mjs --outfit=T01-B01-F01-A01
```

Stop only the server started for this check. Browser reports retain expected availability HEAD aborts; page/console errors and failed GETs fail the gate. Reports and 320px review copies are saved under `artifacts/verification/avatar-catalog/outfits/<id>/`.

## Current limits

B03 is **not** fit-verified. Its rear-hem corrective still intersects in deep kicks; the body/shoe projection study diverged and is rejected. The exporter weight-threshold mismatch is fixed: source/export plus Three.js driving has an 18.284 micrometre bound under the unchanged 30 micrometre gate. Keep the separate fitting failure open; export fidelity does not establish animated fit. Independent work on B04 and other pieces can proceed without accepting B03.

Quarter-frame walk/run sweeps establish the sampled motion fit, not all possible motion. Head gestures are checked separately for rigid head accessories. H02-H06 fitting, full catalog combinations, final face/style/budget review and real bottom/shoes/accessory slot integration remain open. Preserve candidate sources under `assets/` until accepted; product model publication is a future integration step. No Meshy spending is authorized by this workflow.

## Evidence consolidation

After the complete fitting, export, material and browser gates pass, consolidate their current hashes:

```bash
node tools/blender/catalog/verify_exported_materials.mjs \
  assets/avatar/catalog-a/outfits/T02-B01-F01-A01/outfit.glb \
  assets/avatar/catalog-a/outfits/T02-B01-F01-A01/material-export-report.json
python3 tools/avatar/summarize_catalog_proof.py --outfit=T02-B01-F01-A01 \
  --attachment=T02/head-clearance-report.json \
  --attachment=outfits/T02-B01-F01-A01/cap-attachment-report.json
```

The consolidator requires independent and combined 163-pose gates, all export/material/browser hashes, bidirectional rendered-surface parity and any supplied six-pose head reports. It rejects stale sources and observed static motion. Actual slot integration and full-body mobile framing remain separate acceptance work.

## Builder reuse

`catalog_piece.py` accepts a garment factory and an original-index coverage function, then saves a separate master and garment/body GLBs and renders six selected views. It verifies the registered object identity, prunes influences at or below Blender 5.1's glTF cutoff of 0.0001, and enforces four normalized influences before binding to the shared rig. This makes source fitting and export use the same weights. `catalog_tee_geometry.py` supports optional authored sleeve panel materials; material regions survive subdivision without being inferred from bone weights. `catalog_top_geometry.py` supplies measured long sleeves with region-restricted arm weights. These helpers establish candidate construction; the full independent/combined motion, export and browser gates still follow each build.

## Stitched detail fitting

For relaxed bottoms, `catalog_bottom_geometry.py` accepts per-design leg-ring dimensions on the shared quad pelvis/crotch topology. It preserves the measured ankle blend and cuts elastic material boundaries through the actual mesh. `full_trouser_coverage` is for full-length trousers; shorts must define their own coverage and preserve exposed legs. B02's projected pocket openings use surface-interpolated weights and are verified with:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py \
  --id=B02 --garment=B02_joggers --outfit=T01-B02-F01-A01 \
  --surface-material='A blue jogger fabric' \
  --surface-material='A navy jogger elastic' \
  --detail-material='A blue jogger pocket openings'
```

`inherit_detail_weights` in `catalog_piece.py` samples the nearest actual cloth triangle and interpolates its bone weights. Degenerate triangles fall back to nearest-vertex transfer; the complete fit gate still follows. `verify_catalog_details.py` measures each requested detail material against specified cloth materials at rest and all 163 quarter-frame clip poses. It reports the worst authored point for targeted diagnostics and fails when the declared separation threshold is exceeded. T04 uses a 12 mm cap, allowing intended cord/hardware thickness and offsets; its measured maximum is 8.03 mm. Add `--detail=T04/detail-fit-report.json` to the proof consolidator to require the current source-hash detail evidence.

## Pose corrective workflow

`catalog_correctives.py` authors portable native Blender knee-distance drivers and two exported `knee_clearance_Left/Right` targets. The shorts prototype rolls the rear hem during flexion while retaining the reference rest shape. Coverage preserves the underlying thighs; rolling fabric uses thigh-following weights. The assembler retargets copied shape drivers to its common armature.

`src/avatar/garmentCorrectives.ts` applies the corresponding knee-angle values to cloned, rebound garments after the animation mixer. Legacy garments without these targets are unchanged. Unit coverage checks flexion, straightening, clamping and avatar scaling. Runtime changes require repository checks and an avatar-enabled production build before browser proof.

Export verification compares the actual morph targets at the same evaluated master weights. A separate Three.js probe evaluates exported targets and clips, compares knee values and propagates differences through exported morph deltas. The combined source/export and driver error must stay below the same 30 micrometre geometry tolerance. The sequential runner detects these targets and requires the probe; proof consolidation rejects a missing/stale corrective report.

```bash
node_modules/.bin/tsx tools/avatar/verify_catalog_correctives.ts --outfit=T01-B03-F01-A01
```

Current B03 target/export error passes, while collision fitting fails. A clean browser render is evidence of rendering, not proof of collision-free fit. `diagnose_catalog_morph_export.py` separately compares unskinned basis/full targets and posed skinning when round-trip parity fails. Do not compensate for an exporter weight mismatch by altering target geometry.

## Stable browser proof

Prefer a fixed production preview for catalog acceptance. Development first-load checks can abort module GETs during page reload; retain those failures and keep the strict GET gate. The runner now records active/teardown request phases and outstanding GETs before close.

```bash
VITE_AVATAR_POC_ENABLED=true npm run build
npm run preview -- --port 3003 --host 127.0.0.1 --strictPort
node tools/avatar/verify_catalog_preview.mjs --outfit=T04-B01-F01-A01 --production
```

The production option verifies the served build identity against `dist/build-identity.json` and records it in the report. The tool-only `?agent=1` harness requests `/__avatar_fixture/{body,garments,walk,run}.glb`; the verifier intercepts them with candidate bytes. No public models are shipped or replaced. The build remains outside `dist-e2e`; no release/audio gate is implied by this asset rendering check.


## Fitting studies must improve measured contacts

`fit_catalog_correctives.py` saves a separate exploratory source. It checks all
163 poses before accepting a target change, stops on regression of total pairs
or either body/shoe maximum, and restores the last measured best coordinates.
It also evaluates the final proposal before saving rather than leaving the last
iteration unmeasured. Source and output paths must differ. B03's regression
fixture stopped after one bad proposal and restored its baseline exactly;
`animated-fit-study-monotonic.json` records both measured iterations and the
saved state. This tool is not an acceptance gate: independent/outfit clearance,
detail/export/runtime and visual checks remain required.

## Shared low-top construction

`catalog_footwear_geometry.py` reuses the F01 annular loft primitives and measured
anatomical foot orientation/Foot–ToeBase flex/ankle-surface blend for new low-top
designs. F02 authors a continuous navy upper, two projected elastic side panels
and flat orange heel tabs, rather than retaining F01's sneaker strap. This
helper retains its default low-top behavior. Taller ankle footwear explicitly
uses measured shaft contours, triangle-surface ankle weights and face-safe
coverage rather than assuming the low-top parameters fit. Existing F01/F02
masters are unchanged by the F03 helper additions.

`catalog_piece.build_piece` accepts optional review target/scale parameters for
focused footwear construction views while keeping all saved reviews 320px wide.
The shared object identity is checked before export and when loading each
source for outfit assembly.


F02 demonstrates the shared corrective path on a small fabric part.
`add_soft_heel_tab_correctives` preserves the rest pull tab, folds its free tip
with knee flexion, and projects the folded target onto the actual rear upper.
Details first inherit the assembled shell's barycentric skin weights; sampling
the body a second time gave them different attachment motion. Assembly retargets
the drivers, and the existing runtime binder handles the exported names. The
sequential runner requires source/export parity and a separate Three.js probe
in addition to the full body/outfit/detail sweeps. F02's historical combined bound was 5.842
micrometres against the unchanged 30 micrometre gate. The later opposite-side
audit invalidates current fitting-candidate status; repair and fresh source-bound
proof are required. Own-shell contact and final visual bend also remain open.

Read `catalog-progress.json` for current per-piece status. B03/B04/F02 require
corrective repair; retain their historical evidence. F03 remains a fitting
candidate, but combinations using B04 need refreshed proof. F04 has independent
and isolated core-outfit proof; complete O05/A02 and promotion remain open.
Final art/budget/head/motion combinations/runtime slots remain acceptance work.

## Tall footwear and opening anatomy

F03 authors three broad projected straps, an integrated navy collar and ivory
toe edging. `fit_ankle_upper` fits the shaft to actual body contours before
thickening; `bind_foot_parts(..., ankle_weight_mode='triangle')` interpolates
the actual body surface instead of copying a nearest vertex. Preserve controlled
Foot–ToeBase flex in the sole/toe. Details inherit the assembled shoe shell's
weights rather than sampling body weights independently.

`face_safe_footwear_coverage` hides a body vertex only when every incident face
stays below the covered boundary. A simple height threshold can delete faces
that extend above a collar, creating jagged gaps. The optional opening gate
checks the actual active inverted mask, original vertices, removed faces and
current source hash. F03 uses a 185 mm opening and 4 mm safety margin:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/verify_catalog_piece.py \
  --id=F03 --garment=F03_high_tops --outfit=T04-B04-F03-A01 \
  --coverage-opening-z=.185 \
  --surface-material='A blue high-top upper' \
  --surface-material='A navy high-top collar' \
  --surface-material='A ivory high-top sole' \
  --surface-material='A ivory high-top toe edging' \
  --detail-material='A ivory high-top straps'

python3 tools/avatar/verify_catalog_coverage_regression.py \
  --id F03 --opening-z .185 \
  --output-dir artifacts/verification/avatar-catalog/F03/coverage-regression
```

The regression preserves the real master, builds a separate unsafe fixture,
requires the actual gate to reject it with exit 1, and accepts the safe source.
F03's reproduced bug removes 366 faces crossing the boundary, up to 198.711 mm;
the current mask has zero violations. Opening proof does not replace animated
body/layer clearance.

## Diagnose rest fit, skinning and cloth ease separately

`diagnose_catalog_contacts.py` reports exact material/rest/posed bounds and
nearest-surface samples for the declared pose. Inspect both directions of a
garment pair to locate the opponent's anatomy. In F03/O04, rest contacts belonged
to B04's rear cuff; deep-kick contacts belonged to its rear hip/thigh. Its actual
body weights differed by up to 36.5 percentage points there. Nearest normals
can point inward on thick hollow garments; inspect the surface role before
using them as projection directions.

`fit_bottom_cuff` supplies measured posterior ease and triangle-interpolated
body ankle weights only in the cuff. `fit_bottom_rear_hip_weights` aligns the
local pelvis/thigh transition with the body. After those changes, excess rear
cloth ease still hit the high-top during the deepest kick.
`add_rear_hip_compression_correctives` retains the rest design and compresses
the local rear panel toward the body as the knee bends. It uses the shared
native/exported/Three.js corrective path. Other bottom masters are not silently
changed; apply these functions only with per-design geometry and fresh fit proof.
Build studies separately before promoting them, preserve failures, and rerun
every source-bound outfit affected by a master revision. B04's original master
is retained in `fitting-revisions/before-high-top-fit/`; fresh sneaker/high-top
proof supersedes its earlier hashes.

Zero contacts can make a worst-pose sweep choose the first frame. Use
`render_catalog_pose.py` to review the exact corrected regression separately:

```bash
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/blender/catalog/render_catalog_pose.py -- \
  --blend assets/avatar/catalog-a/outfits/T04-B04-F03-A01/outfit.blend \
  --motion run --frame 7.25 \
  --garments T04_zip_hoodie_outfit,B04_ivory_trousers_outfit,F03_high_tops_outfit,A01_baseball_cap_outfit \
  --output-dir artifacts/verification/avatar-catalog/outfits/T04-B04-F03-A01/deep-kick
```

The renderer saves three 320px views and source-bound contact/corrective values.
The export comparison and actual Three.js probe also include run 7.25.
`verify_catalog_proof_regression.py` tests the collector in an isolated report
copy: unchanged sample counts cannot hide a missing deep-kick pose, unsafe
opening reports are rejected, and real proof inputs remain byte-identical.

```bash
python3 tools/avatar/verify_catalog_proof_regression.py \
  --outfit T04-B04-F03-A01 \
  --report artifacts/verification/avatar-catalog/outfits/T04-B04-F03-A01/proof-regression-report.json
```

Historical pre-side-audit proof: both revised outfits have 163-pose motion, 164-pose detail, 15-pose
export/corrective, six-gesture cap, 15-GLB/material and four-case production
browser proof. Their combined export/driver bounds are 7.179 micrometres for
the sneaker outfit and 6.471 for the high-top outfit, below 30. Eleven
wearables retain current fitting-candidate status after the new side audit. The other thirteen concepts, B03 fitting and
all final art/budget/heads/motions/combinations/framing/slot acceptance remain
required.

## Independent keys and flexible attachments — F04 retrospective

Always create independent bilateral shape keys with `from_mix=False`. Blender's
default mixed shape creation copied the left target into the Right key in B03,
B04, F02 and the initial F04. Side isolation is distinct from collision freedom;
old body/layer proof for B04/F02 is retained but no longer establishes current
candidate acceptance. The runner now executes `verify_catalog_corrective_sides.py`
on all independent masters plus the outfit; the collector rejects opposite-side
deltas or stale/incomplete source inventories.

Flexible heel loops need POINT/BOOLEAN attachment roles: sewn ends keep the
12 mm distance limit, the free section may extend only 3 mm beyond its original
rest envelope, and own-shell intersections must remain zero. Use
`--detail-anchor-attribute F04_loop_attachment --require-detail-clear` in the
piece runner. These checks do not replace the dense body/garment-layer sweep.

The corrected F04 source passes 163 body poses and 164 loop/own-shell poses.
Its isolated T05/B01/F04 core passes 163 body/layer poses and 16 export/Three.js poses at a combined 7.623 micrometre bound. Canonical promotion, browser and complete O05/A02 remain open; separate B01 fitting
studies preserve canonical B01. Diagnoses distinguish the raised loop's cuff
envelope from its deep-kick rear-thigh contact. See F04's retrospective and
current progress JSON for source-bound evidence and outstanding work.

The reference gallery now has 16 sheets, adding A02/A05/A06 construction. The
subsequent female-body/catalog phase remains required after current acceptance.

## Isolated model studies

The female H02 fixture and F02 bounded corrective repair are registered through
`model_studies`; see `docs/avatar-workflow.md` for the metadata contract and current
proof limitations. Run their own verifiers before changing stage text. Preserve
canonical masters and rejected study sources. The F02 repair remains repair-needed
because its heel tabs touch the shoe shell, despite clean side/body/layer checks.
The female study proves sampled clearance and UV transport, with final style and
female-fitted wardrobe still pending.

For source-bound production checks of an isolated outfit:

```bash
node tools/avatar/verify_catalog_preview.mjs --outfit=T02-B02-F02-A01 \
  --outfit-dir=assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/outfit \
  --output-dir=artifacts/verification/avatar-catalog/F02/independent-keys-repair/browser \
  --preview-url=http://127.0.0.1:3003 --production
```

Require completed candidate GETs, nonempty canvas and moving walk/run pixels;
source hashes alone do not establish that the renderer loaded the candidate.


## First female T02/B01/F01 capsule

Use the frozen female H02 study, separate per-piece native sources, recomputed
coverage and the isolated outfit builder. This capsule is not O02. The user kept
its reviewed proportions; remaining art review does not authorize changing its
body/head/hair to accommodate clothes. See the study retrospective for exact
current proof and rejected attempts.

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/blender/catalog/run_catalog_female_outfit_study.py \
  --study-dir assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01 \
  --report-dir artifacts/verification/avatar-catalog/female-outfit-T02-B01-F01
```

Use `--probe` during bounded iteration. Full proof checks independent source
equality (including transforms, active modifiers and driver targets), body/head/
hair/layers, removed-face opening anatomy, sewn/free details and own-shell pairs,
closed-component topology, head gestures, both head-bearing UV exports, materials
and actual Three.js skin math. Browser proof remains separate. `--reuse-native`
requires a current successful structured native report and records reuse explicitly;
it cannot reuse a failed or stale result. Keep all prior failed evidence in history.

For folded parts that collapse when projected, construct a regular surface first,
transfer actual underlying cloth skin, then add thickness. Check sneaker closures
against each other, not only the upper. Face-safe masking must preserve every
removed incident face at neck, wrist, waist and ankle boundaries.

The source native quaternion curves and actual glTF interpolation differ between
keys. Keep shared gait bytes unchanged, distinguish their pose sweeps, and compare
transport using equivalent actual-runtime bone poses; do not loosen the tolerance
or replace browser interpolation to make proof pass.


## B04 continuous-cuff proof

Use the isolated cuff source and the saved dependent runner, wrapped once through
`blender_queue.py`. The verification plan checks the independent source and the
cap-free T01/B04/F01 and exact O04=T04/B04/F03 combinations. It writes fresh proof
under a separate, previously nonexistent directory; source/preservation/initial
screen files stay unchanged. Initial screen/preservation reuse is explicit and
requires current source/tool hashes plus the complete ordered 328-pose inventory.

New cloth skin must apply the established 0.0001 export cutoff before normalization
and full-cycle screening. Raw triangle interpolation can contain zero/tiny
influences; check the final retained field for positive normalized weights and
at most four bones. Preserve original garment fields outside the stated hem
boundary. Saved polygon ordering can change: compare new directed face inventories
with duplicate counts, and retain original UVs by face/corner identity rather
than assuming untextured garments have no native UV layer.

Standalone export fidelity uses `verify_catalog_independent_garment_export.py`;
actual Three.js corrective proof remains separate. Browser fixture rendering
checks can crop feet, so review cuff construction through the gallery's fitted
camera at <=320px. Preserve request cancellations and state their actual scope;
a rendering smoke capture never substitutes for a strict whole-gallery gate.


### Whole garment self-clearance and reset-pose capture

Body/layer checks and detail-to-cloth checks do not test the entire cloth shell
against itself. **2026-10-08 correction:** these self-checks were applied to B04/F02
only. Measured on every garment with one rule, no passing piece clears them:
whole-garment self pairs are B01 489 rest / 1,531 worst (B04: 77 / 848), and
detail-to-shell pairs are B01 392 / 940, F01 2,164 / 2,374 and T02 0 / 257. Most of
this is deliberate construction: pocket backs sit inside the cloth thickness, and
soles and collars overlap the upper. Use `audit_catalog_detail_shell.py
--report OUT NAME:PIECE.blend:OBJECT ...` as a diagnostic and compare a candidate
with its passing sibling, not with zero. `audit_catalog_b04_shell_self.py` stays as
B04 history. A self-crossing that shows at runtime is still a defect, so judge it
in renders. Preserve the fitted silhouette; a small liner offset cannot fix
outward-surface self-crossings.

Reset the rig before creating **each** RuntimeGaitPose adapter. Capture and
validate its native rest against bind matrices (`runtime_rest_capture.py`);
otherwise a prior pose can silently become a false rest pose. Keep invalid
execution evidence separate and rerun guarded proof rather than interpreting
its artificial collisions as a model regression.

Use the evaluated mesh's actual loop triangles at each pose when testing full
self-clearance, retaining their source polygon identities. A polygon BVH can
choose different diagonals for deformed quads: B04's diagnostic run counts 553
actual-tessellation face pairs versus 548/549 from polygon triangulation. Shared
vertex incidence is still the only contact exclusion. Preserve older results
with their original method and scope. For anatomical panel diagnosis, physical
paths from lower-leg seeds can distinguish branches across X=0; retain measured
path differences and leave near-equal shared-seam assignments qualified.

## Head scale and headwear (2026-10-07)

- `build_catalog_head_scale_study.py --base male|female --scale 1.3 [--hair-taper z_full,z_tip,tip_scale]`
  writes an isolated scaled head study with `head-landmarks.json`; verify it with
  `verify_catalog_head_scale_study.py --study-dir DIR`.
- `build_catalog_a01_fitted.py --base male|female --output-dir DIR` fits headwear to
  the verified head: an `under_hat` hair shape key, then a crown offset from the
  worn skull+hair envelope above a tilted band. `verify_catalog_headwear.py
  --study-dir DIR` runs the fit gate (crown gap <= 12 mm on 90% of samples, band p90 <= 5 mm and max <= 15 mm,
  no penetration), intersections over gait plus six gestures, morph export and
  16-pose export fidelity.
- Pure rules (scale, landmarks, band, under-hat radius, crown ease, fit gate) live in
  `catalog_headwear_plan.py` and are tested by `tools/avatar/headwearPlan.test.ts`.
  Reuse them for A02-A04 rather than hard-coding heights.
- Female outfits: `build_catalog_female_outfit_study.py --recipe T01,B01,F01` (default
  T02,B01,F01). The verifier, runner and export check read the recipe from
  `assembly-report.json`.
- Male outfits on a scaled head: `build_catalog_scaled_male_foundation.py --head-study DIR`,
  then `assemble_catalog_outfit.py --foundation DIR/foundation.blend --uv-export`. The
  plain garment exporter drops texture coordinates and breaks painted faces.
- Coverage holes: `verify_catalog_coverage_visibility.py --blend OUTFIT --body BODY --garment ID:object ... [--accept-contact T01]`
  reports hidden body faces a standard camera can see. `catalog_coverage_visibility.settle_coverage`
  releases such skin and re-hides any that touches the garment over the gait (recorded as
  `contact_<ID>`). The T01 revision builder is `build_catalog_t01_sleeve_coverage.py`.
  The assembler takes `--source ID=path.blend` to use a piece revision and records each
  piece source and the foundation with SHA-256 in `assembly-report.json`.
- Hoods: `build_catalog_hood_revision.py --id T02|T04` builds the fuller hood (`hood-v2`)
  through the canonical builders; the female builder takes the same shape as
  `--hood-shape JSON`. H02 hair: rear locks shorten by 30% (`--rear-shorten
  1.56,.3,.04,.10`) so the tips clear long sleeves in the run.
