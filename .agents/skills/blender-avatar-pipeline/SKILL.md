---
name: blender-avatar-pipeline
description: Author, fit, inspect or export teo-learn avatar models in Blender, including catalog clothing, rigged GLBs, motion cleanup and texture-ready heads. Use for Blender CLI or MCP work; ordinary React UI changes use the avatar area rules instead.
---

# Blender avatar pipeline

Read `docs/avatar-workflow.md` from the repository root first. It gives the shared
Codex/Claude handoff, active sources, next work and selfie texture contract.
For catalog authoring or fitting, then read `tools/blender/catalog/README.md`
and the affected piece's retrospective. Read `catalog-progress.json` for current
status; historical passing reports can be invalidated by a later audit.

## Execute and preserve evidence

Run from the intended checkout. `npm run avatar:blender -- --version` identifies
the chosen executable; set `BLENDER_BIN` for a side-by-side installation.
Use `python3 tools/avatar/blender_cli.py SCRIPT [script arguments]` for headless
work. It uses factory startup and propagates Python failures with
`--python-exit-code 1`. The catalog runners share this executable resolver.

Keep construction changes in a saved builder or revision script, `.blend`, GLB,
retrospective and source-bound reports. Preserve rejected studies that explain
a failure. A dev-viewer entry or an export-fidelity pass is not final acceptance.
Run Blender import/export jobs sequentially. If macOS Metal initialization fails
before Python starts in the Codex sandbox, rerun the same command with escalation.

MCP is optional for live scene inspection and visual edits. Availability depends
on the client's configured tools; current upstream supports Claude and Codex.
Use one client to own the live Blender scene at a time, save the construction
change as code, then verify through CLI and the actual Three.js viewer.

## Blender invariants

- Preserve the shared body topology/original vertex indices, metre scale, bind
  pose and normalized four-influence weights. Coverage masks use those indices.
- Assign bilateral attachments by anatomical position: world X >= 0 is character
  left; X < 0 is right. Imported viewer-perspective object names can be inverted.
- Create independent corrective keys with `from_mix=False`. Verify opposite-side
  isolation, own-shell/detail attachment and full independent/outfit motion.
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
- The catalog's garment exporter disables texture coordinates. A textured head
  needs its own UV-preserving export profile; don't silently reuse that profile.

## Completion

For a piece, follow the catalog runner and required additional gates in its
README. For renderer/asset changes, read the browser-verification skill and
inspect desktop and phone; review images must be <= 320px wide. Preserve the
lazy renderer boundary described in `.claude/rules/avatar.md`.

Update progress, retrospective and ROADMAP with exact proof scope. Final style,
budgets, compatible combinations and real slot switching remain separate gates.
Meshy generation goes through its skill and the root credit-approval rule.
