---
name: blender-avatar-pipeline
description: Use when authoring, fitting, inspecting or exporting teo-learn avatar models in Blender, including generated/reference-based characters, catalog clothing, rigs and motion; ordinary React UI changes use the avatar area rules.
---

# Blender avatar pipeline

Read `docs/avatar-workflow.md` from the repository root first. It gives the shared
Codex/Claude handoff, active sources, next work and selfie texture contract.
For catalog authoring or fitting, then read `tools/blender/catalog/README.md`
and the affected piece's retrospective. Read `catalog-progress.json` for current
status; historical passing reports can be invalidated by a later audit.
For new characters, 2D-reference reconstruction, generated meshes or revised
motion, read `docs/avatar-authoring.md` before construction. It covers likeness,
imported units, raw weights, proof scopes and actual product playback.

## Execute and preserve evidence

Run from the intended checkout. `npm run avatar:blender -- --version` identifies
the chosen executable; set `BLENDER_BIN` for a side-by-side installation.
Use the shared queue for headless work:

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py SCRIPT [script arguments]
```

Wrap a sequential gate runner once through that queue; see the workflow for
process ownership and interruption behavior. The CLI uses factory startup and
propagates Python failures with
`--python-exit-code 1`. The catalog runners share this executable resolver.

Keep construction changes in a saved builder or revision script, `.blend`, GLB,
retrospective and source-bound reports. Preserve rejected studies that explain
a failure. A dev-viewer entry or an export-fidelity pass is not final acceptance.
Parallelize code/review work and serialize Blender import/export jobs through the
shared queue. If macOS Metal initialization fails
before Python starts in a sandbox, rerun the same command through the harness's
approved execution/permission mechanism.

MCP is optional for live scene inspection and visual edits. Availability depends
on the client's configured tools; current upstream supports Claude and Codex.
Use one client to own the live Blender scene at a time, save the construction
change as code, then verify through CLI and the actual Three.js viewer.

## Cheap screens before full sweeps

For a new character or motion, first save a proxy silhouette and an animated
export. Preserve each revision's parameter input beside its saved source before
changing a shared configuration file. Review proportions at <=320px, then sample the actual GLB in Three.js:
require distinct evaluated poses, intended clip name/duration, exported triangle
count, compressed bytes and normalized bone weights before a long fit sweep.
A clean validator, native render or clip entry does not prove moving runtime
geometry. The bear example and rejected measurements are in
`assets/avatar/catalog-a/companions/bear-v1/retrospective.md`; its
`tools/avatar/sample_bear_runtime.mjs` demonstrates an actual skinning probe.

- With skinned export and `export_apply=False`, MASK modifiers can be ignored.
  Bake coverage on a disposable copy, retaining bone groups and the untouched
  authoring body. Compare rendered source/export surfaces after export.
- When deriving each new pose using depsgraph updates, keep its action inactive
  during calculation; existing curves otherwise overwrite the authored pose.
  Bind the intended action/slot immediately before inserting its keys, or write
  curves directly. Reopen and test the exported motion afterward.
- Weight limiting/normalization must filter groups to deformation bones. Coverage
  and other semantic groups are not bone weights; never normalize them together.

Contact and opening-visibility checks are independent. A zero-contact mask can
still cut a visible hole. Use a small bounded pose bracket to locate a fitting
failure, then sweep the saved revision through native and actual runtime poses.

## Blender invariants

- When editing canonical catalog bodies/garments, preserve shared topology and
  original vertex indices, metre scale, bind pose and normalized four-influence
  weights. Coverage masks use those indices. An independent new character gets
  its own anatomy and rig contract; fit its rig to the accepted shape.
- Assign bilateral attachments by anatomical position: world X >= 0 is character
  left; X < 0 is right. Imported viewer-perspective object names can be inverted.
- Create independent corrective keys with `from_mix=False`. Audit saved masters
  separately: changing a helper leaves their old keys intact. Verify opposite-side
  isolation first, then own-shell/detail attachment and full independent/outfit
  motion. Compare a newly found failure against the unchanged canonical source.
- Select export objects explicitly. Remove stale mesh data with
  `bpy.ops.outliner.orphans_purge(do_recursive=True)` before export; old mesh data
  can otherwise survive revisions and contaminate GLB material/surface parity.
- Clear background objects through `bpy.data.objects.remove(obj, do_unlink=True)`;
  context-dependent deletion can silently retain them.
- Imported actions may be layered. Read legacy fcurves or layers/strips/channel
  bags as appropriate. Assign a new action before writing with
  `action.fcurve_ensure_for_datablock(...)` and bind its slot:

  ```python
  armature.animation_data.action = action
  if hasattr(armature.animation_data, 'action_slot') and action.slots:
      armature.animation_data.action_slot = action.slots[0]
  ```

- For legacy Meshy clip cleanup, remove unrelated source actions and export with
  `export_animation_mode='ACTIVE_ACTIONS'`, `export_force_sampling=False`,
  `export_nla_strips=False`, `export_bake_animation=False`. Standalone generated
  motion GLBs need cleanup; use `tools/blender/export_clean_avatar_clip.py` and
  `docs/3d-avatar-knowledge-base.md` for that branch.
- The garment exporter disables texture coordinates. Use the separate H02
  UV-preserving profile and canonical face fixture for textured heads. Reimport
  proof must match UVs with their rest-position/corner identity, including seams;
  matching a set of UV values alone can miss reassignment to the wrong corners.
- For a thick folded detail that collapses during surface projection, construct
  an ordered surface first, transfer actual underlying garment weights, then add
  thickness. Keep explicit detail roles and sewn/free anchor attributes. Attachment
  distance does not replace zero own-shell intersections.
- Preserve exposed anatomy by checking every removed incident face at garment
  openings. Validate independent masters against the assembled mesh, including
  transforms and active modifier/driver configuration. Textured outfits need UV
  corner/image proof for runtime-consumed `body.glb` as well as `outfit.glb`.
- Compare source/export skinning under equivalent bone poses. Blender scalar
  quaternion interpolation can differ from glTF quaternion SLERP between keys.
  Preserve canonical motion bytes, report that difference separately, and fit
  the actual runtime poses as well as the saved Blender actions.
- Check hair against dense gait and six head gestures, then review its complete
  silhouette. Preserve rejected geometry and source-bound reports.

## Completion

For a piece, follow the catalog runner and required additional gates in its
README. After changing feedback slot sizes, re-render the fallback still from the
proven source at least twice the largest CSS dimensions; upscaling old pixels
does not satisfy that requirement. Bind the still render separately so a
presentation-only export does not invalidate unchanged geometry proof.
For renderer/asset changes, read the browser-verification skill and
inspect desktop and phone; review images must be <= 320px wide. Preserve the
lazy renderer boundary described in `.claude/rules/avatar.md`.

Update progress, retrospective and ROADMAP with exact proof scope. Final style,
budgets, compatible combinations and real slot switching remain separate gates.
Meshy generation goes through its skill and the root credit-approval rule.
