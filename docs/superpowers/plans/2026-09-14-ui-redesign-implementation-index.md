# Full-App UI Redesign Implementation Index

This index is the launch contract for the approved eight-phase redesign. The
product and UX requirements live in
`docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`; the documents
below turn that specification into executable, test-first work.

## Execution rules

1. Create `feature/full-app-ui-redesign` from the commit that contains this plan
   set.
2. Run phases strictly in order on that one branch. Never implement phases in
   parallel.
3. Assign each phase to a fresh Antigravity agent using Gemini 3.8 Flash.
4. The phase agent must use `superpowers:subagent-driven-development`, follow
   `AGENTS.md`, and read the approved design spec, its phase plan, and all prior
   accepted handoff manifests before editing.
5. Each phase stops after its verification gate and handoff commit. The next
   phase starts only from the exact SHA recorded in the accepted manifest.
6. No phase opens a pull request. Codex performs the final cross-spec review
   after Phase 8.

## Phase order

| Phase | Plan | Accepted outcome |
|---:|---|---|
| 1 | `2026-09-14-ui-redesign-phase-1-baseline-safety.md` | Route-safe parent access, test-only quick-pass, persistence and viewport fixtures |
| 2 | `2026-09-14-ui-redesign-phase-2-design-system.md` | Semantic tokens and repository-owned Radix/CVA UI foundation |
| 3 | `2026-09-14-ui-redesign-phase-3-catalog-home-lobbies.md` | Catalog-generated routes, grouped light-card home, and unified lobbies |
| 4 | `2026-09-14-ui-redesign-phase-4-parent-experience.md` | Protected dashboard, registry settings, universal content/recording/feedback flows |
| 5 | `2026-09-14-ui-redesign-phase-5-shared-game-framework.md` | Shared game state/shell/material contracts and all four FindIt migrations |
| 6 | `2026-09-14-ui-redesign-phase-6-bespoke-literacy.md` | Four bespoke literacy games migrated without learning-rule changes |
| 7 | `2026-09-14-ui-redesign-phase-7-bespoke-numeracy.md` | Three numeracy games migrated with collision-free responsive playfields |
| 8 | `2026-09-14-ui-redesign-phase-8-release-hardening.md` | Full release matrix, final contact sheet, dead-code removal, and Codex-ready evidence |

## Fresh-agent launch prompt

Replace `<N>`, `<PLAN>`, and `<BASE_SHA>` with the accepted phase values:

```text
Implement UI redesign Phase <N> from <PLAN> on branch
feature/full-app-ui-redesign, starting at <BASE_SHA>. Read AGENTS.md, the full
approved design specification, this phase plan, and every prior accepted handoff
manifest before editing. Use the superpowers:subagent-driven-development skill
for task execution and independent reviews. Follow the plan task-by-task and
test-first; preserve all phase boundaries and existing product contracts. Run
and record every required verification command. Update ROADMAP.md, write the
phase handoff manifest with exact SHAs and evidence, commit it, then stop. Do not
start the next phase and do not open a pull request.
```

## Final Codex review inputs

After Phase 8, provide Codex the branch head and these artifacts:

- the approved design specification;
- all eight implementation plans;
- all eight accepted handoff manifests;
- `docs/ui-audit/redesign-final-review.md` and its named contact sheet;
- the Phase 8 verification output, bundle evidence, and clean-worktree status.

Codex reviews the result against the specification and plan set, not only the
visual screenshots. Any unresolved publication blocker reopens the owning phase
before release.
