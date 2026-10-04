# Blender 5.2.2 LTS upgrade — 2026-10-04

User authorized updating Blender and then committing the avatar work/reference
pack. The original Blender session was closed by the user before replacement.

- Installed official Apple Silicon 5.2.2 LTS at `/Applications/Blender.app`.
- Preserved 5.1.1 at `/Applications/Blender 5.1.1.app`.
- Verified installer SHA-256 against Blender's published checksum:
  `dc4125399b8bfefe283cc1624d6cfc7809d1cac20ace51072127eb371f31f210`.
- Verified the app's signature and macOS Gatekeeper acceptance as notarized.
- CLI reports Blender 5.2.2 LTS, build hash `d13f752e3b9c`.
- Used Blender's native Copy Previous Settings operator and saved 5.2 preferences.
  A fresh normal startup confirmed the existing `bl_ext.lab_blender_org.mcp`
  extension was configured and loaded. Factory-startup catalog jobs intentionally
  use their own clean preferences. No Claude/Codex MCP client settings were changed.

Sources: [official LTS releases](https://www.blender.org/download/lts/),
[official 5.2 files and checksums](https://download.blender.org/release/Blender5.2/).

## Representative export smoke

Exported a new GLB from the isolated T05/B01/F04 loop-compression study using
the catalog's evaluated coverage-mask body and the existing exporter. The source
master remained unchanged at SHA-256
`b3fe565af52203c3fe769c0315f77aa72c34f9d24e83627865254826eb88ba61`.

All 16 rest/walk/run deformation samples passed the existing 30 micrometre gate;
maximum source/export distance was 5.740 micrometres. Khronos validation of this
new 5.2 export had zero errors, warnings, infos or hints. The initial scratch
export omitted the evaluated coverage-body naming/profile and was rejected by
the comparison; the corrected scratch export followed the actual assembler.
Canonical sources and exports were not replaced by this installation smoke.

The new fixture's SHA-256 is
`65cd1ccd5c3d9655707286279c93e309c20ee8d392a6bd3912dac45349f844bb`.
Logs/reports are retained under
`artifacts/verification/avatar-catalog/blender-5.2.2-upgrade/` locally.
This tests an existing untextured outfit profile; the future UV/textured head
needs its own export and runtime proof. Model acceptance status is unchanged.

## Branch verification

Fresh `npm run verify:edit -- --force` selected the **integration** profile and
passed lint, 96 unit tests, all pure verifiers, audio inventory, test build,
integration browser coverage, production build and bundle boundaries. Report:
`artifacts/verification/2026-10-04T15-34-07-813Z-integration.json`.
Female reference images and handoff prose were completed afterward; no runtime
code changed after that verification. No release profile, deployment or push
was performed.
