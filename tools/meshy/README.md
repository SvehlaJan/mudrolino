# Meshy Local Helper

This repo uses a local Meshy helper instead of the upstream skill pack's inline scripts.

## Rules

- Set `MESHY_API_KEY` in the current shell or repo-local `.env`.
- Do not read or write shell profiles.
- All downloads go to `meshy_output/`.
- Any command that spends credits must include `--confirm-spend`, and agents should only add that flag after the user approves the cost.

## Commands

- `python3 tools/meshy/meshy_ops.py balance`
- `python3 tools/meshy/meshy_ops.py text-to-3d-preview --prompt "..." --confirm-spend`
- `python3 tools/meshy/meshy_ops.py text-to-3d-refine --preview-task-id <id> --confirm-spend`
- `python3 tools/meshy/meshy_ops.py image-to-3d --image <path-or-url> --confirm-spend`
- `python3 tools/meshy/meshy_ops.py multi-image-to-3d --image <a> --image <b> --confirm-spend`
- `python3 tools/meshy/meshy_ops.py retexture --input-task-id <id> --text-style "..." --confirm-spend`
- `python3 tools/meshy/meshy_ops.py remesh --input-task-id <id> --target-format glb --confirm-spend`
- `python3 tools/meshy/meshy_ops.py rig --input-task-id <id> --confirm-spend`
- `python3 tools/meshy/meshy_ops.py animate --rig-task-id <id> --action-id <n> --confirm-spend`

Add `--wait --download-glb` when you want the helper to poll the task to completion and save the resulting `.glb`.

## Generation flags (2026 API)

As of October 21, 2026, `--ai-model latest` resolves to **Meshy 7.1**. Pin `--ai-model meshy-7.1` for a reproducible model choice. See the [Image to 3D API](https://docs.meshy.ai/en/api/image-to-3d) and [API pricing](https://docs.meshy.ai/en/api/pricing). These optional flags map to API parameters:

- `--target-formats glb` — only generate the formats we use; skips fbx/obj/stl/usdz and finishes faster.
- `--auto-size` + `--origin-at {bottom,center}` — Meshy estimates real-world height and sets the mesh origin, cutting manual transform tuning. Use `center` for accessories that pin to a bone, `bottom` for shoes/ground items.
- `--model-type standard` — standard generation. Legacy `lowpoly` retires **October 30, 2026**; use `standard` for new runs and optimize downloaded assets for mobile.
- `--decimation-mode {1,2,3,4}` — adaptive polygon reduction.
- `--texture-resolution {2k,4k,8k}` — explicit base color texture resolution (image-to-3d only). The API deprecates `hd_texture` in favor of `texture_resolution`; the legacy `--hd-texture` flag remains available.
- `--keep-lighting` — keep baked lighting (default removes it for a flat, even look).
- `--image-enhancement` / `--no-image-enhancement` — enable preprocessing or send `image_enhancement: false` to preserve the reference appearance without style processing (image / multi-image). Omitting both flags leaves the field absent and preserves the API's default behavior; the flags are mutually exclusive.
- `--pose-mode {a-pose,t-pose}` — request a character pose (image-to-3d; also available on text preview).
- `--texture-image-url <path|url>` — guide refine texturing from a reference image.

Deprecated: `--symmetry-mode` (Meshy deprecated it 2026-05-11; the helper warns and may be ignored by current models).

For garments (text-to-3d), use `--model-type standard --target-formats glb --auto-size --origin-at center` on preview, then `--target-formats glb` on refine. Prefer 2K textures for small avatar garments and optimize the downloaded GLB before shipping.

For a single character reference, this prepares Meshy 7.1 standard generation with textures, an A pose, image preprocessing disabled, and GLB-only output:

```bash
python3 tools/meshy/meshy_ops.py image-to-3d \
  --image meshy_output/bear-reference.png \
  --ai-model meshy-7.1 --model-type standard \
  --no-image-enhancement --pose-mode a-pose --texture-resolution 2k \
  --target-formats glb --wait --download-glb --project-name bear-reference
```

Expected cost: **30 credits** for one mesh with 2K textures, using the API's default standard geometry resolution (no Ultra surcharge). This command intentionally stops at the spend guard until the user approves that cost and `--confirm-spend` is added. No generation is submitted without confirmation.

After download, optimize for the installed web runtime. It has no Draco/Meshopt
decoder; keep mesh transport decoder-free while optimizing supported textures and
attributes:

```bash
npx --no-install gltf-transform optimize in.glb out.glb \
  --texture-compress webp --texture-size 1024 --compress false
```

Then validate with `node tools/avatar/validate_gltf.js out.glb` and follow the
candidate's warning policy. The generated-bear path uses
`tools/avatar/optimize_generated_bear.mjs` for texture/attribute packing and
tangents; its final gate requires zero errors/warnings. Check installed tools
before reusing version-specific workarounds. Preserve native/runtime parity and
real-texture proof after optimization. Accepted assets use the storage/publication
flow in `docs/avatar-workflow.md`; `public/avatar/garments/` is retired. Shared
operational guidance lives in `.agents/skills/meshy-3d-generation/SKILL.md`.

When `--wait` is set the response now also surfaces `consumed_credits` (actual spend) alongside the updated `balance`.

## Chaining

The helper prints JSON to stdout, including:
- `task_id`
- `project_dir`
- `downloads`
- `available_formats`
- `balance`

Reuse `--project-dir` for follow-up steps like refine, rig, and animate so related outputs stay together.
