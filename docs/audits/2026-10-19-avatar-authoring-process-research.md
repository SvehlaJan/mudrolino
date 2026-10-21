# Bear authoring: research and bounded experiments

Researched 2026-10-19 before bear geometry authoring. Research only: no Blender
execution, geometry, exports, runtime changes or acceptance proof were produced.
The authoring agent owns the scene. Recommendations below are hypotheses to test,
not measured improvements or new mandatory rules.

## Scope and evidence

The approved target is direction B, one T01/B01/F01-inspired outfit, the existing
24-bone rig and one stationary celebration. Actual bear/dance fit is required;
human walk/run proof cannot establish it. Human masters and coverage indices stay
unchanged. [Approved design](../superpowers/specs/2026-10-19-bear-companion-design.md),
[reference brief](../../assets/avatar/concepts/2026-10-19/bear-mascot/README.md).

Read: [AGENTS](../../AGENTS.md), [workflow](../avatar-workflow.md),
[pipeline skill](../../.agents/skills/blender-avatar-pipeline/SKILL.md),
[catalog loop](../../tools/blender/catalog/README.md), the
[fit/tooling audit](2026-10-07-avatar-fit-and-tooling-audit.md), and the foundation,
female capsule, sleeve and heel-tab retrospectives cited below. These are recorded
historical observations; their model proofs were not rerun in this research.

Some English Blender manual pages returned fetch errors. Current official
Armature/API pages were available through indexed results; current Data Transfer
documentation was available under the Dutch locale with English body text.
Export behavior was additionally checked against live official exporter source.
Those sources can advance independently of the installed Blender: record the
actual executable/exporter version before applying a setting.

## Documented facts and their implications

| Evidence | Implication for this bear (inference) |
| --- | --- |
| Blender's **Preserve Volume** uses quaternion deformation. Core glTF uses linear blend skinning. [Blender Armature](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html), [glTF skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins). | Keep the authoring Armature modifier's Preserve Volume off when comparing against core glTF. Do not repair an export mismatch by changing the bear's shape until equivalent deformation methods and bone poses are confirmed. |
| glTF joint order must agree with inverse-bind matrices; weights are nonnegative and should sum to one. Four weights are supported per attribute set; clients may support only one set. [glTF skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins). Official exporter source derives inverse binds from armature world and bone rest matrices. [Exporter skins](https://raw.githubusercontent.com/KhronosGroup/glTF-Blender-IO/main/addons/io_scene_gltf2/blender/exp/skins.py). | Freeze names, hierarchy, rest matrices, object transforms and gait bytes as separate invariants. A new bear mesh can have its own topology/index map; do not overwrite human indices or reuse human masks without recomputing them. |
| glTF `LINEAR` rotation uses shortest-path quaternion SLERP between keys. [glTF interpolation, Appendix C.4](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html). The female capsule previously differed by about 195 µm when unlike native/runtime poses were compared. [Capsule retrospective](../../assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01/retrospective.md). | Distinguish (a) native versus runtime motion differences from (b) source versus export geometry error at equivalent bone matrices. Sample the actual exported dance between keys, rather than changing interpolation or tolerance to manufacture parity. |
| Data Transfer maps elements and interpolates source values; it can transfer vertex groups, and offers distance-limited mappings. [Current Data Transfer manual](https://docs.blender.org/manual/nl/latest/modeling/modifiers/modify/data_transfer.html). The foundation's excess influences once caused about 0.73 mm export error. [Foundation retrospective](../../assets/avatar/catalog-a/foundation/retrospective.md). | A simplified skinning scaffold is a useful experiment, not proof of final skinning. Restrict transfer by anatomy/side, inspect mismatches, then apply the repository's final weight pruning/top-four normalization before fit screening. The local `<=0.0001` cutoff is an exporter-specific policy, not a glTF requirement. [Current helper](../../tools/blender/catalog/catalog_piece.py). |
| The current exporter comments warn ordinary shape keys are not preserved through its apply-modifiers path. [Official primitive extraction](https://raw.githubusercontent.com/KhronosGroup/glTF-Blender-IO/main/addons/io_scene_gltf2/blender/exp/primitive_extract.py). `shape_key_add` defaults to `from_mix=True`. [Current Object API](https://docs.blender.org/api/current/bpy.types.Object.html?highlight=bound_box). | If correctives become necessary, settle topology first, use independent keys with `from_mix=False`, and verify exported targets explicitly. Record modifier order and export options; do not assume a viewport modifier stack is transported automatically. |
| Khronos Validator checks format, references, accessor values and animation data and emits JSON issues/statistics. [Official validator](https://github.com/KhronosGroup/glTF-Validator). Three.js `AnimationMixer.setTime` evaluates a specific time, scaled by `timeScale`; `GLTFLoader` returns scene and clips. [Mixer](https://threejs.org/docs/pages/AnimationMixer.html), [loader](https://threejs.org/docs/pages/GLTFLoader.html). | Use structural validation and deterministic runtime sampling as distinct gates. A validator pass does not establish clothing fit, appearance, correct candidate loading or phone performance. |

## Existing failures to avoid repeating

- **Collision-free does not mean fitted.** A cap passed while floating 9–12 cm;
  the audit recommends gap/ease measurements and four-view review before long
  sweeps. Measure bear shirt/waist/cuff distances against the intended silhouette,
  with visible opening/occlusion review. Do not inherit cap thresholds for shirts.
  [Fit/tooling audit](2026-10-07-avatar-fit-and-tooling-audit.md).
- **Coverage cannot repair an inadequate armhole.** Existing T01 experiments
  copying body weights or releasing skin visible in any pose worsened holes or
  contacts. The retrospective proposes new sleeve/shoulder ease or an arm-following
  sleeve with gusset. Test that construction early for the bear's outward dance
  gestures. [Sleeve retrospective](../../assets/avatar/catalog-a/T01/fitting-revisions/sleeve-coverage-v1/retrospective.md).
- **Distance is not face clearance.** F02's weights already matched underlying
  triangles, yet its ribbon still crossed the moving shell; 17 offset/weight
  screens failed. Stop a bounded parameter bracket when its premise fails.
  [Heel-tab retrospective](../../assets/avatar/catalog-a/F02/fitting-revisions/heel-tab-shell-clearance-v1/retrospective.md).
- **Invalid rest capture creates false collisions.** Reset before each runtime
  pose adapter and compare captured rest against bind matrices. Use actual
  evaluated loop triangles with source polygon identities for contact diagnosis.
  [Catalog correction](../../tools/blender/catalog/README.md#whole-garment-self-clearance-and-reset-pose-capture),
  [existing rest guard](../../tools/blender/catalog/runtime_rest_capture.py).
- **Mask whole incident faces safely.** Recompute coverage on the bear's own
  topology; retain faces crossing neck/wrist/waist/ankle boundaries. Check exposed
  holes in motion as well as rest. Keep reversible coverage separate from any
  later baked/decimated runtime mesh. [Catalog openings](../../tools/blender/catalog/README.md#tall-footwear-and-opening-anatomy),
  [sleeve evidence](../../assets/avatar/catalog-a/T01/fitting-revisions/sleeve-coverage-v1/retrospective.md).

## Ranked experiments for this task

These are proposed tests, not work performed by this note.

1. **Bind/export vertical slice before detail.** On a coarse bear plus simple
   shirt/trouser/shoe shells, export one representative dance bend. Check all 24
   names/rest transforms, weights, neutral state and equivalent-pose export parity.
   Stop on transport failure. This tests the greatest shared dependency cheaply.
2. **Proxy silhouette before dense fitting.** Use a small parameter block for
   head/muzzle/ear/torso/limb proportions and garment ease. Review front, back,
   side, three-quarter and actual feedback-sized <=320px images. Then freeze
   proportions for fitting. Record elapsed time and rejected candidates; do not
   assume the proxy saves time until measured. A low-resolution collision proxy
   can reject obvious failures but cannot certify the final surface.
3. **One shoulder construction comparison.** Compare the initial tee shell with
   one bounded arm-following sleeve/gusset variant at rest, maximum arm lift and
   torso sway. Measure both contacts and visible masked faces, plus silhouette.
   If neither improves both, revise construction rather than expanding mask hacks.
4. **Progressive dance sampling.** Use diagnostic extrema for turnaround only;
   require a full actual-runtime quarter-frame sweep, endpoints and neutral-rest
   check on the saved candidate. Add local midpoint refinement around minimum
   clearance/high angular change. Run any retained native action sweep separately.
   Quarter-frame samples are a discrete claim, not a continuous collision proof;
   do not copy the human gait's fixed 163-sample count onto a different dance.
5. **One final source-bound acceptance run.** After cheap screens clear, reopen
   the saved source, verify final evaluated topology/weights/masks, complete
   dance body/layer/opening checks, export/material parity, Validator JSON and
   actual Three.js desktop/phone rendering. Report triangles/gzip with dance
   bytes separate. A selected render or small parity probe does not replace this.

For each experiment record: hypothesis, changed parameter/vertex scope, immutable
baseline hashes, source/clip/export hashes, actual Blender/exporter versions,
arguments, imported helper hashes, ordered pose/time inventory, timing, worst
pose/part and review paths. Preserve rejected evidence; reuse only explicitly
identified unchanged proof. This extends existing source-bound practice rather
than introducing a parallel proof system. [Workflow](../avatar-workflow.md),
[catalog loop](../../tools/blender/catalog/README.md).

## Conditional lessons to propose after measurements

Do not edit skills from this research alone. If this bear demonstrates that a
coarse export slice catches a later blocker, add that concrete prerequisite and
its failed/passing evidence to the pipeline skill. If the proxy reduces measured
iteration time without missing a final-surface failure, document its exact scope
and retain final topology gates. If sleeve reconstruction improves both holes
and fit, record the geometry principle and reusable parameter contract. If dense
runtime samples find a failure absent at keys, save that counterexample and its
time as a regression case. Keep general pipeline rules short; put bear-specific
dimensions, pose inventories and rejected alternatives in its retrospective.
