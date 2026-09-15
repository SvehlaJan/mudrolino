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
   Codex-accepted handoff manifests before editing.
5. Each phase stops after its verification gate and handoff commit. Codex
   reviews and either accepts or rejects that exact SHA before any later phase
   starts. For Phases 1–7, Codex records the reviewed candidate SHA and result in
   the handoff manifest and commits that review; the resulting acceptance commit
   is the next phase's base. Phase 8 records Codex approval and user visual
   sign-off together in its final review commit. All eight phases are blocking.
6. If Codex rejects a phase, the same phase agent fixes the findings when it is
   available. Otherwise assign a fresh remediation agent that receives the
   phase plan, rejected SHA, and review findings. A later phase must never absorb
   rejected work from an earlier phase.
7. Every UI-changing phase runs the shared screenshot script and records its
   local artifact directory. Screenshots are uncommitted manual-review evidence
   under `artifacts/ui/<full-git-sha>/<unique-run-id>/`; they are not pixel-diff
   assertions and never establish a visual baseline.
8. The listed component-library stack is the approved starting proposal, not
   permission for an implementation agent to change dependencies freely. Before
   the first install, and before any later direct dependency addition, removal,
   major upgrade, or substitution, the agent must explain the need and
   compatibility impact and obtain Codex approval.
9. No phase opens a pull request. Codex reviews every phase and performs the
   final cross-spec review after Phase 8. The user alone gives final visual
   sign-off.

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
| 8 | `2026-09-14-ui-redesign-phase-8-release-hardening.md` | Full release matrix, final local screenshot set, dead-code removal, and review evidence |

## Fresh-agent launch prompt

Replace `<N>`, `<PLAN>`, and `<BASE_SHA>` with the Codex-accepted phase values:

```text
Implement UI redesign Phase <N> from <PLAN> on branch
feature/full-app-ui-redesign, starting at <BASE_SHA>. Read AGENTS.md, the full
approved design specification, this phase plan, and every prior Codex-accepted
handoff manifest before editing. Use the superpowers:subagent-driven-development skill
for task execution and independent reviews. Follow the plan task-by-task and
test-first; preserve all phase boundaries and existing product contracts. Run
and record every required verification command. Update ROADMAP.md, write the
phase handoff manifest with exact SHAs and evidence, commit it, then stop. Do not
start the next phase and do not open a pull request. Return the exact SHA and
handoff to Codex. If Codex rejects it, fix only that phase's findings and repeat
the gate; do not defer them to a later phase. For any UI change, run the shared
screenshot script and record the uncommitted
`artifacts/ui/<full-git-sha>/<unique-run-id>/` directory for manual review. Do
not add or replace a component library without first presenting the need and
compatibility impact to Codex for approval.
```

## Review inputs

After every phase, provide Codex the phase plan, exact branch SHA, handoff
manifest, command results, clean-worktree status, and—when UI changed—the local
screenshot directory. For Phases 1–7, Codex reviews code, behavior, scope, and
screenshots, records the reviewed candidate SHA and `Accepted` in the manifest,
then commits the review. That acceptance commit is the next phase's base. Phase
8 uses the final acceptance sequence in its plan. On rejection, Codex returns
findings without opening the next phase; the remediation candidate records the
review history and is submitted again.

## Final review inputs

After Phase 8, provide Codex the branch head and these artifacts:

- the approved design specification;
- all eight implementation plans;
- all eight Codex-accepted handoff manifests;
- `docs/ui-audit/redesign-final-review.md` and its named local screenshot
  directory;
- the Phase 8 verification output, bundle evidence, and clean-worktree status.

Codex reviews the result against the specification and plan set, not only the
visual screenshots. Any unresolved publication blocker reopens the owning
phase. After Codex accepts Phase 8, the user reviews the final local screenshots
and gives the final visual sign-off before the redesign is marked complete.
