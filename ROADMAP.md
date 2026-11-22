# Mudrolíno — Product Roadmap

Updated 2026-11-11. Update current tasks and the Decisions Log when scope changes. `[ ]` is pending, `[~]` is in progress, and `[x]` is complete. The [complete earlier roadmap](docs/history/roadmap-through-2026-11-11.md) retains all completed phases, intermediate candidates and historical decisions; its unchecked status can be superseded by this file.

Mudrolíno is a local-first Slovak/Czech educational PWA with eleven games, parent-recorded content, backups, printable worksheets and an optional published bear companion. Accounts, wardrobe customization and monetization remain future work. The [documentation map](docs/README.md) routes current guidance and evidence.

## Current priorities

- [ ] Review Czech draft UI/content and record the pending clips. The [inventory](tools/audio/pending-recordings.json) is authoritative; 41 Slovak and 199 Czech recordings remained on 2026-11-11. Strict audio/release verification remains red. Previous user-approved TTS exceptions apply only to their named releases.
- [ ] Complete physical-device checks on iPhone Safari and installed PWA, Android Chrome and a tablet; explicitly verify one Game card tap starts the first recorded prompt on iPhone. Include Czech speech fallback, custom content/audio across language switches, microphone, backups and offline use. See the [release checklist](docs/ff-launch.md).
- [~] Confirm production Sentry configuration and received error/source-map metadata. Code and the EU project/DSN exist; deployment configuration and human verification remain open until checked.
- [~] Confirm Vercel Web Analytics is enabled if still desired. Production-only page views are implemented; gameplay-event collection is a separate future decision.
- [ ] Collect and triage feedback from the existing small friend group before additional invitations and public-launch planning. [Invitation/survey templates](docs/ff-launch.md#message-to-send-with-the-link) remain available.
- [x] Complete the approved [repository cleanup plan](docs/plans/2026-11-11-repository-cleanup.md): small removals, current/history documentation, shared logic and a verified MacBook-only evidence archive. The tracked tree drops from 240.6 MB to about 10.8 MB; [outcome and verification](docs/audits/2026-11-11-repository-cleanup.md).

## Phase 2 — Public Launch

Public launch follows friend feedback and privacy review. The existing production domain and hosting are established; a future domain change must include a family-data transfer plan.

- [ ] Synthesize feedback into launch blockers and later improvements; run a public production smoke test before broader announcement.
- [ ] Publish a privacy policy covering children, local microphone/audio storage, feedback and optional production monitoring; assess consent requirements for any future analytics changes.
- [ ] Decide whether a landing page or app-at-root is appropriate and improve public discoverability/SEO. Existing Open Graph/PWA metadata is implemented.
- [x] Design a proper Mudrolíno logo/app icon and regenerate icons/link previews with `npm run pwa:icons`; consider the accepted bear as a branding direction. (2026-11-22: 3D rendered Bear portrait icon via `tools/pwa/render_bear_icon.py` -> `tools/pwa/bear-icon-render.png` and regenerated `public/pwa/` assets via `npm run pwa:icons`.)

## Phase 3 — Cloud and Accounts

Accounts remain deferred. Decide from family feedback whether multi-device recording use warrants account-free sync or accounts. Current backups already merge settings, words, praise and recordings with change stamps and deletion markers.

- [ ] Choose a cross-device strategy only after feedback: encrypted family-code sync, one-time transfer or an account-backed service are candidates. The [historical research](docs/history/roadmap-through-2026-11-11.md#12-content-and-custom-audio) records alternatives, not a current vendor recommendation.
- [ ] If needed, specify backend/auth, profiles, the local-to-cloud migration model and deletion of all associated data. Include future avatar state without blocking current local-first use.
- [ ] Implement the chosen infrastructure and migrations after that decision; provide parent consent and account/data deletion where applicable.

## Phase 4 — Multi-language

Slovak/Czech UI switching, locale-aware content/audio and language-partitioned local content are implemented. Czech review and recordings remain in current priorities.

- [ ] Review Czech alphabet, words, syllabification, phrases, praise and UI with the user; validate content/audio across switches on physical devices.
- [ ] For English and French later: define each language's syllabification, curate alphabet/words/numbers/UI, record or generate default audio and obtain native-speaker validation.
- [ ] Review market-specific child/privacy requirements before a broader English-language launch.

## Phase 5 — Avatar Expansion

Bear Guide Phase A is accepted and published; [current assets and proof](docs/avatar-workflow.md) and [closeout](docs/superpowers/handoffs/2026-11-11-bear-guide-phase-a.md) identify the delivered revision. Home welcome/taps, round celebrations, empathetic failure, session completion and inactivity nudges already use the bear. The older tasks to add those states/screens are superseded.

- [x] Bear Guide Phase B: persistent in-round prompt companion (`PromptCompanion` in `GamePrompt`) and one cross-route WebGL stage (`CompanionStageContext` + `PersistentCompanionStage`), with tap-to-replay, live listening/retry reactions, and absorbed 12s inactivity nudges.
- [ ] Optional Slovak/Czech caregiver voice pack and bespoke pedagogical clips (`talk_explain`, `point_down`, `gentle_try_again`, `count_one_two_three`, `sleepy_yawn`). Recordings require their own inventory and release scope.
- [~] Complete human catalog acceptance against [construction targets](docs/avatar-construction-targets.md), per-piece retrospectives and source-bound animated-fit/export/runtime/style/budget proof. Use the [workflow](docs/avatar-workflow.md) for current candidate status rather than the superseded intermediate repair summaries in the old roadmap.
- [ ] Finish pending body/head/hair choices, reference-based garments/footwear and separate female fitted variants. Keep both bases' acceptance independent; use reviewed recipes and proof before product integration.
- [ ] Integrate accepted catalog assets into top/bottom/shoes/hair/accessory slots, per-base compatibility metadata, verified coverage masks, supported animation/retargeting and animation-ready footwear. Publish accepted runtime exports when ready.
- [ ] Add parent customization and versioned persistence for base, clothing and future generated face metadata. Human base/wardrobe product integration is not yet delivered.
- [ ] Explore parent-face customization through a backend transform to a canonical texture-ready head, preview/accept/reset/delete controls and explicit raw-selfie retention. Keep provider secrets server-side. Expressions and body-shape customization follow neutral likeness and fit proof.
- [ ] Audit mobile runtime memory/frame rate/decode and preloading as assets grow; rerun gallery/runtime verification for model changes.

## Future games and worksheets

- [ ] Consider subtraction/further arithmetic and persistent achievements, stickers or progression after usage feedback.
- [ ] Extend worksheets with word-picture matching, syllable cut-and-glue, find-and-circle letter/syllable/number grids, parent-called bingo and line-art colouring. Six-game A4/PDF worksheets already ship.

## Phase 6 — Monetization

- [ ] Decide whether paid features are appropriate from actual usage; research pricing only when needed.
- [ ] If pursued, specify pricing/family plans and candidate cloud/customization/language features. Current local content/audio stays available; payment integration follows backend/account decisions.

## Maintenance

- [x] Extract shared session/timer orchestration: `useGameSession`, `useGameSessionAudio` and the injectable session controller now serve all four games named by the old unchecked task. Local answer/animation locks remain game-specific.
- [x] Audit repository cleanup opportunities and separate current guidance from retained historical requirements/experiments.
- [x] Execute the approved cleanup and local archive migration: 678 unit tests, 581 integration browser cases, 2 development cases, 24 archive contracts and 8 production/offline cases passed. The immutable snapshot and retained 3D inventory were verified; archive-free unit/build/production checks passed too.
- [ ] Audit image/emoji optimization and extend preloading when content growth justifies it. Keep physical-device performance review separate from bundle-size checks.

## Decisions Log

Older decisions, exact candidates and superseded experiments remain in the [complete historical log](docs/history/roadmap-through-2026-11-11.md#decisions-log).

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-22 | Release Bear Guide Phase B and the 3D-rendered Bear PWA icon set with a release-specific TTS exception and accepted focused verification. | The user explicitly approved shipping with the 240 pre-existing pending SK/CZ recordings (0 new pending recordings) and the passed focused checks (lint, pure, 689 unit tests, bundle/dev/offline/production-guards, and 58 companion E2E cases); strict audio and full release verification remain required for future releases. |
| 2026-11-21 | Deliver Bear Guide Phase B (single cross-route WebGL stage + in-round `PromptCompanion`) and adopt the Bear mascot for the Mudrolíno PWA app icon / OG preview. | Eliminates per-event WebGL context churn, removes the corner floating nudge in favor of a live prompt companion, and unifies app branding with the accepted bear. |
| 2026-11-11 | Consolidate current guidance and archive superseded documents; retain original evidence and links. | The cleanup is authorized, while earlier plans, failed experiments and acceptance receipts remain useful provenance. |
| 2026-11-11 | Keep historical avatar evidence only in the local MacBook archive during cleanup. | The user approved local-only storage; preserve exact bytes, manifests, replay and restoration rather than uploading this evidence elsewhere. |
| 2026-11-11 | Present product ownership, agent implementation, shared UI, MVP scope and verification explicitly. | Describe delivered behavior and future hypotheses separately; [case study](docs/engineering-decisions.md). |
| 2026-11-11 | Release accepted Bear Guide Phase A/v7 with the specifically approved TTS exception. | 240 recordings remain pending; this exception does not waive strict audio for future releases. [Closeout](docs/superpowers/handoffs/2026-11-11-bear-guide-phase-a.md). |
| 2026-11-11 | Use passive-effect WebGL initialization and a real development-server browser check; keep optional offline companion requests out of the game path. | StrictMode development lifecycle and offline fallback need evidence beyond production bundle checks. |
| 2026-11-10 | Defer persistent prompt companion, voice pack and extra pedagogical clips beyond Bear Guide Phase A. | Keep the initial guide within reviewed geometry, performance and recording scope. |
| 2026-11-04 | Start a Session directly from a Game card; put Game settings in the Parent area. | Remove lobby friction and guard direct route/session entry. |
| 2026-10-14 | Ship production by fast-forwarding `release` to a reviewed `main` commit when asked. | Feature/main pushes create previews; production is an explicit action. |
| 2026-10-14 | Use Slovak-keyed translation beside game/home copy; merge backups per item. | Keep translation definitions local and avoid overwriting newer family data. |
| 2026-10-13 | Keep friends-first local, with backups, Czech drafts and the Mudrolíno domain. | Accounts/sync follow demonstrated need; later bear delivery supersedes the earlier no-avatar launch scope. |
| 2026-10-02 | Select editing, integration and release verification by risk; retain explicit audio omissions and bounded evidence. | Improve feedback cost without presenting reused or failing proof as a fresh pass. |
