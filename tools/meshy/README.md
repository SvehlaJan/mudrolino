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

## Chaining

The helper prints JSON to stdout, including:
- `task_id`
- `project_dir`
- `downloads`
- `available_formats`
- `balance`

Reuse `--project-dir` for follow-up steps like refine, rig, and animate so related outputs stay together.
