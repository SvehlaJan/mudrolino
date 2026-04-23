---
name: meshy-3d-generation
description: Use when working in this repository and the user wants Meshy 3D generation operations such as text-to-3d, image-to-3d, retexture, remesh, rigging, animation, balance checks, or controlled .glb downloads.
---

# Meshy 3D Generation

Use the repo-local helper at `tools/meshy/meshy_ops.py` for all Meshy work in this project.

## Rules

- Load `MESHY_API_KEY` only from the current environment or repo-local `.env`.
- Never read or write shell profiles.
- Save outputs only under `meshy_output/`.
- Before any credit-spending command, present the cost summary and wait for user approval.
- Only pass `--confirm-spend` after the user approves.
- Skip 3D printing and 2D image endpoints in this repo.

## Workflow

1. Run `python3 tools/meshy/meshy_ops.py balance`.
2. Summarize the intended Meshy operation and expected credits.
3. After user approval, run the matching helper command with `--confirm-spend`.
4. Add `--wait --download-glb` when the user wants the finished `.glb`.
5. Report `task_id`, `project_dir`, downloads, available formats, and updated balance.

## Command Mapping

- Text prompt to 3D preview: `text-to-3d-preview`
- Refine a preview task: `text-to-3d-refine`
- Single image to 3D: `image-to-3d`
- Multiple images to 3D: `multi-image-to-3d`
- Texture transfer: `retexture`
- Topology or format conversion: `remesh`
- Auto-rigging: `rig`
- Custom animation: `animate`

Run `python3 tools/meshy/meshy_ops.py <command> --help` for flags.
