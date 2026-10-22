# Shared 3D guidance: reflection and application checks

Updated 2026-10-22 after the approved generated-bear work. This change updates
instructions only; it neither regenerates assets nor spends credits.

## What changed

- `docs/avatar-authoring.md` now owns the reusable reference-to-runtime process;
  model-specific numbers and failed studies remain in the bear retrospective.
- Canonical Blender, Meshy and browser skills live in `.agents/skills/`. Claude
  wrappers and the existing Cursor Meshy adapter point to shared files; AGENTS.md
  and avatar area rules route to them. CLAUDE.md still imports AGENTS.md.
- Canonical human topology rules are scoped to canonical asset edits. Independent
  characters keep their own anatomy/rig contracts, and fused fixed outfits are
  distinguished from removable wardrobe assets.
- Imported transform/units, raw pre-loader weights, fixed native/export
  correspondence, contact scope and actual product-clock framing have explicit
  completion evidence. Model/texture/export versions remain choices to inspect.
- Browser guidance incorporates entrance opacity, single-image measurement,
  remount identity checks and media-decode/TTS races without extending product
  timing or weakening real-audio coverage.
- Meshy instructions reuse scoped budget approval and recover submitted tasks
  before retrying. Removed duplicated Meshy6/lowpoly/preprocessing defaults and
  the retired public-directory publication recipe.

## Before/after application checks

Two isolated agents read the old skills before edits. They identified missing
unit-conversion, raw-weight, fixed-correspondence, real-clock readiness, opacity,
media fallback and task-recovery instructions. One applied the unqualified human
topology invariant to the replacement bear; another repeated the stale Meshy6,
lowpoly and automatic enhancement recommendations from the Claude skill.

A fresh agent then started from CLAUDE.md/AGENTS.md and followed updated links.
It correctly handled independent anatomy, single-view uncertainty, fixed-outfit
limits, actual transforms/raw weights, fixed bidirectional parity, visible product
frames, opacity/media races, scoped credit approval and local-only completion.
It resolved Claude/Cursor Meshy adapters to the same source. Its recovery-command
gap prompted explicit metadata/history and helper-method pointers; a creation
command with `--project-dir` is not a resume operation.

These are agent application/discovery checks, not execution inside the Claude or
Cursor binaries, Blender/browser acceptance tests or new provider API research.
Structural checks cover YAML frontmatter, local Markdown links, referenced repo
paths and whitespace. The official Python skill validator could not start because
PyYAML is absent; the local fallback checks use the installed js-yaml parser.

An independent final read-only review found no actionable contradictions in
topology scope, budget approval, task recovery, proof scopes or harness routing.
Fresh repository checks passed: lint (zero errors and the known ContentContext
react-refresh warning), all 600 unit tests and `verify:pure`. The fallback parsed
seven skill frontmatters and checked local Markdown links across thirteen
guidance files; twelve repository path references in the new shared guide/Meshy
skill resolved. `git diff --check` passed. No browser, Blender or paid operations
were run for this documentation-only change.
