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

## Best-practice flags (Meshy 6 / 2026 API)

`--ai-model latest` resolves to **Meshy 6**. These optional flags map to current API parameters:

- `--target-formats glb` — only generate the formats we use; skips fbx/obj/stl/usdz and finishes faster.
- `--auto-size` + `--origin-at {bottom,center}` — Meshy estimates real-world height and sets the mesh origin, cutting manual transform tuning. Use `center` for accessories that pin to a bone, `bottom` for shoes/ground items.
- `--model-type lowpoly` — game/mobile-ready topology; preferred for this app's bundle size and mobile performance.
- `--decimation-mode {1,2,3,4}` — adaptive polygon reduction.
- `--hd-texture` — 4K textures (meshy-6/latest only), on refine/image/multi/retexture.
- `--keep-lighting` — keep baked lighting (default removes it for a flat, even look).
- `--image-enhancement` — pre-clean input images (image / multi-image), useful for AI-generated reference plates.
- `--texture-image-url <path|url>` — guide refine texturing from a reference image.

Deprecated: `--symmetry-mode` (Meshy deprecated it 2026-05-11; the helper warns and may be ignored by current models).

Recommended garment recipe (text-to-3d): `--model-type lowpoly --target-formats glb --auto-size --origin-at center` on preview, then `--target-formats glb` on refine. **Do not pass `--hd-texture` for small avatar garments** — 4K maps bloat the GLB (~17 MB) for no visible gain at avatar scale; a normal refine plus the optimization step below lands well under 1 MB.

After download, optimize the GLB for the web runtime (the app uses plain `useGLTF` with no Draco/Meshopt decoder, so do **not** compress geometry):

```bash
npx --no-install gltf-transform optimize in.glb out.glb \
  --texture-compress webp --texture-size 1024 --compress false
```

Then validate with `node tools/avatar/validate_gltf.js out.glb` (a lone `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` warning is benign) before publishing to `public/avatar/garments/`.

When `--wait` is set the response now also surfaces `consumed_credits` (actual spend) alongside the updated `balance`.

## Chaining

The helper prints JSON to stdout, including:
- `task_id`
- `project_dir`
- `downloads`
- `available_formats`
- `balance`

Reuse `--project-dir` for follow-up steps like refine, rig, and animate so related outputs stay together.
