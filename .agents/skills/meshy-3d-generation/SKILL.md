---
name: meshy-3d-generation
description: Use when performing Meshy generation, remeshing, rigging, animation, balance checks or interrupted-task recovery for teo-learn.
---

# Meshy 3D generation

Use `tools/meshy/meshy_ops.py` from the checkout root. Read
`tools/meshy/README.md` and command `--help`; consult current provider docs before
choosing a paid operation's model/options/cost. For reference-driven characters,
also read `docs/avatar-authoring.md`.

1. Check balance and record operation, inputs, expected cost and task chain.
   Obtain approval before `--confirm-spend`. An explicit existing budget covers
   operations within its scope/cap; announce each and reconcile actual spend
   without requesting the same approval again.
2. Keep `MESHY_API_KEY` in the environment or repo-local `.env`, secrets out of
   output and downloads under `meshy_output/`. Shell profiles are out of scope.
3. Pin model/options deliberately, including reference preprocessing. Verify
   provider defaults and dated recipes rather than assuming permanent meanings
   for `latest`, topology quality or output size.
4. Preserve submitted task ID/project before polling. If waiting/download fails,
   inspect saved provenance and resume that task before another paid submission.
   Recover it from the project's `metadata.json` and `meshy_output/history.json`.
   There is no dedicated resume subcommand: inspect `MeshyClient.fetch_task` /
   `poll_task` in the helper. Reusing `--project-dir` on a creation command still
   creates another task. Classify entitlement versus credit errors.
5. Download/hash/inspect actual geometry, textures and budgets before chaining
   remesh, rig or animation. Use supported endpoint/task lineage. Generation
   success is construction input, not final runtime or art acceptance.
6. **Meshy `animate` on non-human/mascot proportions**: Preset library animations
   (3 credits each) are retargeted human mocap. On wide-head, chubby-torso mascots
   (such as `bear-v2`), raw Meshy animation GLBs re-embed the ~21 MB mesh with a
   stray helper `Icosphere`, bake location/scale drift onto all bones, rest at
   human `0°` arm abduction (clipping the belly/hips), and shrug clavicles/elbows
   straight through wide cheeks and ears. Even with clavicle locking and outward
   arm offsets in Blender, human elbow trajectories still clip wide mascot heads.
   Use Meshy `animate` only for cheap motion-rhythm reference (e.g. stepping
   cadence) or humanoid characters; author production mascot clips procedurally
   in Blender where `arm-torso-leg` and `arm-head` clearance, floor contact, and
   exact loop closure are enforced directly.

Use `--wait --download-glb` for a finished GLB. Report task ID, project directory,
terminal state or recoverable interruption, downloads, actual credits and remaining
approved budget. API access or balance does not authorize a separate plan purchase.
Publication follows the shared avatar workflow, not a retired public directory.
