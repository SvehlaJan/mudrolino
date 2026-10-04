# Avatar progress and clothing workflow audit

Date: 2026-10-03. Scope: published assets, runtime, source provenance, Blender
tooling, and focused browser inspection. This is an audit and continuation
recommendation; no published model or avatar runtime was changed.

## Assessment

Keep the current character and garments as starting points. The clothing problem
has moved from generation to fit, hidden-body coverage, rig consistency, and
repeatable authoring. Generating additional outfits now would multiply those
problems. The June work is materially ahead of the May clothing notes.

The runtime already supports separate garments, persistent selections, skinned
tops rebound to the base skeleton, a rigid head accessory, and walk/run previews.
The renderer remains behind the lazy `AvatarPresenter` boundary. The base has
no animation clips: idle currently means a static pose, and success/failure have
no usable current clip. Body shape is uniform scale only; face customization and
bottom/hair slots remain scaffolding. The mannequin head still needs a friendly
face before it can fulfill the companion role.

## Measured asset state

Counts below come from decoded published GLBs, not historical task thumbnails.
Sizes are rounded decimal kB. Triangle counts describe rendered instances.

| Asset | Size | Triangles | State |
| --- | ---: | ---: | --- |
| Plain base | 529 kB | 105,108 | Body, head, face anchor; 24-bone rig; no clips |
| Walking base | 586 kB | 105,108 | One `walk` clip |
| Running base | 585 kB | 105,108 | One `run` clip |
| Blue T-shirt | 290 kB | 23,451 | Skinned to 24 joints; visible shoulder/chest intersections |
| Orange hoodie | 406 kB | 25,932 | Skinned to 24 joints; usable garment volume; fit needs pose QA |
| Blue sneaker pair | 1,161 kB | 329,572 | Two instances of a 164,786-triangle mesh; rigid; not animation-ready |
| Red cap | 127 kB | 14,261 | Rigid head attachment; catalog marks it animation-ready |

The dressed avatar is approximately 472,000–475,000 triangles. The sneakers
account for about 70% of that geometry. Small compressed files do not imply a
small rendering workload. The shoe optimization command in `package.json` is
not evidence that the currently published file meets a topology budget.

All seven GLBs returned zero validator errors. They retain 0–2 warnings each,
including skinned-node transforms and generated tangent space. The validator
also reports meshopt as unsupported informational data, so this is structural
validation, not proof of deformation or visual quality.

## Workflow gaps

1. **Body masking is still missing.** The browser close-up shows skin-colored
   speckling through the tee at the shoulders/chest and side. Increasing scale
   or applying more shrinkwrap will not establish reliable coverage across poses.
   Author covered-body regions, with a conservative margin at neck, sleeve, and
   hem openings. The app must toggle those regions when a garment is selected;
   a Blender Mask modifier alone does not implement runtime slot switching.

2. **There is no current saved garment source workbench in
   `assets/avatar/garments/`.** Raw generated GLBs survive, and a historical base
   `.blend` survives, but the fitted/skinned garment transformations are described
   largely in dated plans and interactive-session instructions. Save source
   scenes, modifier stacks, weight corrections, export settings, and QA evidence
   together for each accepted asset.

3. **The shoe QA does not match the current app.** `AvatarModel.tsx` attaches
   shoes to `LeftToeBase`/`RightToeBase`; both `inspect_slot_fit.py` and
   `render_avatar_runtime_slots.py` use `LeftFoot`/`RightFoot` while claiming to
   mirror runtime. Their animation import also removes the reference armature
   without explicitly removing all reference meshes. Correct these tools before
   using their pictures as runtime-equivalent footwear evidence.

4. **Published GLBs are poor editable master files.** Meshopt needs decoding
   before Blender import. The base's 0.01 scale is on the armature node, whereas
   the tops encode scale on the root joint and mesh. Identical joint names do not
   establish identical bind transforms. In this audit, simply assigning an
   imported top's Armature modifier to the imported base armature broke its fit.
   Preserve original binds while inspecting; establish a canonical rest rig and
   deliberately refit/rebind before publishing a new master. Do not normalize
   transforms indiscriminately after skinning.

5. **Animation provenance needs another cleanup pass.** Both current motion
   files contain 72 channels across translation, rotation, and scale. The app
   filters them at runtime, preserving only rotations and Hips translation for
   walk/run. Their actual exported contract differs from the older rotation-only
   cleanup notes. Produce explicit canonical clips and verify clip names/content.

6. **Historical guidance conflicts with current files.** The Blender skill's
   neutral-parent default no longer exists under `public/avatar/meshy/`; use the
   modular male base. The May docs describe old tops and unfinished steps that
   June commits already completed. The current catalog and this measured audit
   should guide continuation.

## Recommended continuation

1. **Finish one good T-shirt on this base.** Establish a source `.blend` with a
   canonical rig. Preserve a recognizable garment silhouette, clean collar and
   sleeve boundaries, and adjust shoulder/armpit weights. Add covered-body
   regions and prove their runtime toggling. Avoid another cropped-body shell;
   that approach was already rejected for clothing quality.
2. **Make the shoes inexpensive and predictable.** First test local geometry
   reduction against silhouette/texture quality; a proposed starting budget is
   5,000–10,000 triangles per shoe, subject to visual review. Keep most of the
   upper/sole rigid. Add a controlled toe region only if required by the chosen
   motions, and mask the enclosed foot. Use interpolated body-weight transfer as
   a starting point for soft tops, not as a blanket footwear solution.
3. **Build the useful companion motions.** Add a subtle idle and a short cheer
   on the current rig; add a gentle retry reaction if needed. Walk/run are useful
   stress tests, but they do not deliver the session-completion buddy. Historical
   neutral-parent cheer/shrug references require deliberate retargeting.
4. **Expand the wardrobe after the first outfit passes.** Reuse an accepted tee
   mesh for colors/material variants; use a separate tailored master for bulky
   hoodies. Reserve Meshy for genuinely new silhouettes or accessories, with
   Blender responsible for fit, topology, weighting, and final export.

For each asset: save source → fit in canonical rest pose → clean weights/binds →
define covered-body regions → export to a candidate directory → validate →
render front/side/back and several walk/run/raised-arm poses → load the exported
candidate in the real slot renderer on desktop/mobile → optimize → recheck the
optimized candidate → publish and mark animation-ready. Record build identity,
parameters, warnings, and review images at no more than 320px width. Correct QA
tool/runtime mismatches before automating this gate.

Blender's [Mask modifier](https://docs.blender.org/manual/fr/5.1/modeling/modifiers/generate/mask.html)
supports authoring visibility by vertex group; its
[Data Transfer modifier](https://docs.blender.org/manual/en/4.3/modeling/modifiers/modify/data_transfer.html)
supports interpolated vertex-group transfer; its
[Decimate modifier](https://docs.blender.org/manual/en/5.1/modeling/modifiers/generate/decimate.html)
supports a local geometry-reduction experiment. These are building blocks, not
automatic guarantees of fitted, animation-ready clothing.

## Blender feasibility and evidence

Blender 5.1.1 is installed at `/Applications/Blender.app/Contents/MacOS/Blender`.
CLI import, Python scene editing, rig inspection, scene saving, and CPU rendering
were exercised successfully. Headless startup crashed in the sandbox and worked
outside it. No Blender MCP is needed for this workflow.

I can directly change vertices, garment openings, materials, weights, modifiers,
and export settings with Blender Python, using image review between iterations.
Polished topology and silhouette still require visual judgment; the earlier
procedural garment failures are a reason to improve existing authored meshes.

Audit artifacts are under
`artifacts/verification/avatar-audit-2026-10-03/` (ignored):

- `avatar-workbench.blend`: an editable **static fitting reference**, reconstructed
  from decoded published assets. Contains the base, both tops on their original
  imported rigs, shoes, cap, camera, and lights. Tee visible, hoodie hidden. It is
  not a canonical production master or a verified retargeted animation scene.
- `build_workbench.py`: reproduces that scene and two 320px static renders.
- `asset-inventory.json`: counts, textures, joints, animation paths, validation.
- `browser-report.json`, `browser-audit.mjs`: fresh focused Chromium observations.
- `browser-*-review.png`: 320px canvas reviews for tee idle/walk and hoodie run at
  1280×900, plus tee walk at 390×844.

The browser checks waited for model-ready bone diagnostics and rendered all four
configurations. See the report for request cancellations: React development
availability probes abort HEAD requests, and the first desktop page also recorded
aborted module GETs during development reload. No page/console errors were
recorded; this does not constitute a clean strict-network gate. This is a focused visual audit, not a
`verify:edit`, integration, or release gate, and not comprehensive animation QA.
Canvas `toDataURL()` length alone is not valid visual proof here: identical PNG
lengths occurred for different visibly rendered outfits; use actual screenshots.
No Meshy requests or credit spending occurred. No app asset was overwritten.
