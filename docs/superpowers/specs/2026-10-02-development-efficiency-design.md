# Development feedback and verification

Approved by the user after the grilling interview: faster feedback and lower agent cost are the priorities; substantial refactoring is acceptable. Missing recordings will be made before sharing the release with friends and colleagues.

## Contracts

- Keep meaningful behavioral coverage. Functional browser contracts run once; representative geometry uses narrow phone, short landscape and desktop. The release profile retains the full viewport matrix, WebKit, parent data, real media, offline and production guards. Tests with explicit viewport loops have one project owner.
- Ordinary game tests use deterministic media and speech; held promises preserve sequencing assertions. Real playback has dedicated coverage. Test builds remain silent on the MacBook.
- Extract a plain TypeScript session controller with injected audio and clock. Preserve answer ordering, attempts, completion, replay, pause/resume and stale-operation cancellation. The React hook subscribes and binds lifecycle. Games retain their boards, animations and pre-answer locks. Centralize repeated opening/completion audio where semantics permit.
- Add Vitest for new session/audio tests, with controlled promises and clocks, including the 999/1000 ms boundary. Retain legacy verifiers; migrate brittle source assertions only when behavior can be tested better.
- Editing selects tests automatically from an explicit source-to-suite map, including uncommitted/untracked changes. Shared runtime changes select integration; unknown code changes conservatively fall back to integration. Manual profile/files/base overrides remain available. Documentation-only changes need no browser run.
- Build test and production artifacts separately; never reuse an unrelated preview server. Record build identity and results. Build each mode once per release run. Aggregate independent release checks even when inventory fails, retaining a failing exit status.
- Record the 40 known missing files explicitly. Development accepts only those pending recordings, rejects unexpected missing/orphan/stale/duplicate entries. Shipping requires an empty pending list and all expected files present.
- Reproducible screenshots use a seed and create 320 px review copies plus a manifest with commit, build identity, scene, viewport and failures. Inspect only review copies.
- Update agent guidance and ROADMAP to describe the actual profiles. Measure before/after honestly; one-minute editing and three-minute integration targets are advisory.

No UI redesign, deployment, PR or recording generation is included.
