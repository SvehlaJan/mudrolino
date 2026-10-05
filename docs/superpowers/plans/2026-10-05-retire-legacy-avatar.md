# Retire legacy avatar assets and UI

User approved option 1: remove the pre-catalog male experiment, retaining the
new live gallery, all catalog sources, references and fitting history.

- Remove the seven public male/garment GLBs, four original FBXs, legacy workbench,
  customization panel, home overlay, persisted slot state and unused locale labels.
- Require explicit model URLs at the renderer boundary; retain its lazy chunk.
- Route old model links into the live gallery. Old modular links show the gallery.
- Keep an isolated agent-only renderer fixture using fixed /__avatar_fixture URLs
  fulfilled by browser tooling from selected catalog exports; ship no candidate assets.
- Replace obsolete UI checks/capture navigation with the gallery, regenerate UI
  inventory and retire package commands bound to removed assets.
- Update shared handoff, instructions and roadmap. Run fresh integration plus
  desktop/phone gallery, current study and production-candidate browser checks.
- Commit on feature/avatar-catalog after verification; do not push or open a PR.


Completed 2026-10-05. Seven legacy public GLBs and four original FBXs are removed,
with obsolete workbench/customization/home/persistence code and package optimizers.
All catalog models, references, rejected fitting attempts and 62 current female
proof dependencies remain unchanged. The UI inventory has 104 components.

Fresh `npm run verify:edit -- --force` integration passed: 161 unit tests, all pure
checks, 472 browser tests, production build and bundle boundaries. Report:
`artifacts/verification/2026-10-05T05-43-18-659Z-integration.json`.
A subsequent full gallery traversal exposed duplicate reference IDs in outfits.
A behavioral regression failed first, then passed after deduplication. After this
bounded inventory fix, fresh lint (zero errors, known ContentContext warning),
all 162 unit tests and all pure checks passed. No app renderer changed after the
integration run; the gallery server fix was verified through the migrated inspector.

Final inspector: 27 desktop and four phone models; playback/pause/scrub/camera/
skeleton/zoom/reset and 48 complete GLB transport rechecks pass with zero errors.
Report: `artifacts/verification/avatar-catalog/inspection-page/browser-report.json`.
Failed duplicate-reference and phone full-page screenshot runs are retained there;
phone overview captures now use viewport size, preserving every behavioral gate.
The gallery itself passes desktop/phone filtering/discovery/recovery/legacy-link
checks with 95 current assets and 41 model previews. The current female study has
two passing scoped browser cases; four production-candidate fixture cases pass on
fixed new URLs with matching body/garment/gait hashes and changing motion pixels.
Capture tooling produced 27 review images under ignored verification artifacts.
This is integration and asset proof, not a release/deployment or art acceptance.
