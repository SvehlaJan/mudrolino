# Local Meshy Skill Design

Date: 2026-04-23

## Goal

Create a repo-local Meshy workflow that keeps Claude, Cursor, and Codex aligned on one audited execution path for Meshy 3D generation operations, without the upstream repo's shell-profile access or 3D-printing behavior.

## Scope

Included:
- balance checks
- text-to-3d preview
- text-to-3d refine
- image-to-3d
- multi-image-to-3d
- retexture
- remesh
- auto-rigging
- animation
- `.glb` downloads

Excluded:
- 3D printing workflows
- slicer detection or app launching
- 2D image endpoints
- shell profile reads or writes

## Architecture

- Shared helper CLI: `tools/meshy/meshy_ops.py`
- Shared operator reference: `tools/meshy/README.md`
- Claude adapter: `.claude/skills/meshy-3d-generation/SKILL.md`
- Cursor adapter: `.cursor/skills/meshy-3d-generation.md`
- Codex repo instructions: `AGENTS.md`

## Safety Rules

- Load `MESHY_API_KEY` only from the current process environment or repo-local `.env`.
- Write outputs only under `meshy_output/`.
- Require explicit confirmation before credit-spending commands.
- Keep the helper as the source of truth for API calling, polling, downloads, and metadata.

## Command Shape

The helper exposes one subcommand per Meshy operation and returns JSON so agents can chain task IDs and project directories without scraping prose.

Representative commands:
- `python3 tools/meshy/meshy_ops.py balance`
- `python3 tools/meshy/meshy_ops.py text-to-3d-preview ...`
- `python3 tools/meshy/meshy_ops.py text-to-3d-refine ...`
- `python3 tools/meshy/meshy_ops.py image-to-3d ...`
- `python3 tools/meshy/meshy_ops.py multi-image-to-3d ...`
- `python3 tools/meshy/meshy_ops.py retexture ...`
- `python3 tools/meshy/meshy_ops.py remesh ...`
- `python3 tools/meshy/meshy_ops.py rig ...`
- `python3 tools/meshy/meshy_ops.py animate ...`

All credit-spending commands require `--confirm-spend`. Long-running operations use `--wait`, and `.glb` downloads are opt-in via `--download-glb`.

## Outputs

All task outputs live under `meshy_output/` with:
- one folder per project
- `metadata.json` per project
- `history.json` at the root
- downloaded `.glb` files and optional `thumbnail.png`

## Verification

- Start with a failing Python unittest against project-scoped key loading and output bookkeeping.
- Implement the helper until the unittest passes.
- Smoke-check the CLI help output after the helper exists.
