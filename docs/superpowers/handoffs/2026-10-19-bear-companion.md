# Bear companion implementation handoff

Updated: 2026-10-19

Status: approved design and implementation plan prepared. Asset authoring and
game integration have **not** started. Read the
[plan](../plans/2026-10-19-bear-companion.md) from its Start here section; it links
the approved design, source/model workflow and separate asset/runtime tasks.

## Checkout and ownership

- Primary checkout: `/Users/svehla/playground/teo-learn` (or its equivalent on
  another machine); feature branch: `feature/bear-companion-design`.
- Design commit: `0cc7fe4`; locate the later plan commit using
  `git log -1 -- docs/superpowers/plans/2026-10-19-bear-companion.md`.
- The existing untracked B04/F02/other avatar fitting reports predate this lane.
  Preserve them; no ownership or cleanup is implied by the bear plan.
- Use one author and the shared queue for coupled Blender work. A new worktree,
  PR, merge or production deployment needs the repository's explicit authorization.

## Ready-to-resume task state

| Task | Status | Resume |
| --- | --- | --- |
| 1: frozen starting sources | Not started | Asset work package, Step 1.1 |
| 2: bear B and fixed outfit | Not started | After Task 1's source inventory |
| 3: dance, LOD and proof | Not started | After reproducible bear source |
| 4: policy/resources | Not started | Can run independently of art review |
| 5: renderer/view | Not started | After Task 4's contract |
| 6: shared game wiring | Not started | Needs Task 3 bytes and Tasks 4–5 |
| 7: public model publication | Not started | Exact candidate proof and art review |
| 8: full verification | Not started | Stable integrated candidate |
| 9: implementation close-out | Not started | Record real remaining limitations |

There is no bear `.blend`, GLB, dance, runtime still or publication URL yet. The
saved comparison is concept art; the selected character is the middle bear B.
The first implementation action is:

```bash
git status --short --branch
git log -1 --oneline
npm run avatar:blender -- --version
```

Then follow source recovery in the asset work package. Private R2 credentials
and local Blender are execution prerequisites; no generation spend or new service
provisioning was performed while planning. If sources/tooling are unavailable,
report the exact dependency and continue independent pure policy work.

## Acceptance boundaries

The approved product has one fixed T01/B01/F01-style outfit, a gentle caregiver
personality and success-only feedback appearances. The dance never delays game
progress. Last correct answers count; intermediate assembly progress and failed
last rounds do not trigger it. Reduced motion uses the still. Dressing UI,
additional outfits, selfie generation and app-icon changes remain outside this
first version. Technical verification and actual-model art review are separate.

Append a task record using the plan's resume template after each completed task.
Keep source hashes, proof reports, asset-storage availability, public publication
and user review status explicit so another agent can resume without this chat.

## Planning validation (2026-10-19)

- Local links in the plan/work packages/spec/handoff resolve. No unfinished
  instruction markers were found.
- The two TypeScript blocks in `celebration-seed.md` were extracted unchanged
  into an isolated temporary project and type-checked against the current
  `GameState`. All 14 example behavioral tests passed there. They have not been
  installed into application source; these are plan-seed checks, not implemented
  game behavior.
- `npm run lint`: passed with zero errors and the known `ContentContext.tsx`
  react-refresh warning.
- `npm run test:unit`: 367/367 passed in 67 files. It ran with local-server
  permissions for the catalog HTTP test.
- `verify:edit` was run with the explicit seven changed documentation paths and
  `--dry-run`: profile `none`, no changed code. No browser integration/release
  profile, Blender build, asset upload or application deployment was run.
- Vercel Blob `put` options were checked against the official `vercel/storage`
  reference for the future publication task. No SDK was added while planning.
