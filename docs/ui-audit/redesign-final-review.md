# Full-app redesign: final review

## Evidence and status

- Branch: `feature/full-app-ui-redesign`.
- Code candidate: `1e0a2d43bd8065a55641248c90f330f5dbee82c5` (2026-09-28).
- Base: Codex-accepted Phase 7 record `3197af2f6b117eb2cc1d605f09e514cf1746df51`.
- Reviewer: independent lower-cost Codex code/spec review. **Code/spec review: No remaining production correctness blocker found.** The review identified missing editor rotation coverage and recording screenshot evidence; both were added and verified before this candidate.
- **Visual sign-off: Pending user review.** The user asked that the agent not inspect full-resolution screenshots; no screenshots have been visually analyzed by Codex.
- Capture command: `npm run shots -- --matrix=release` against a test-mode preview at `127.0.0.1:4173`.
- Local screenshots: `artifacts/ui/2026-09-28T18-40-27-113Z-95209-1e0a2d4/` (ignored, never committed). Complete: 55 scene directories, ten PNGs each, 550 total. The capture command exited zero and its console/request guards found no errors. Older local capture runs were removed for the UI review.

## Coverage

The capture inventory contains 55 named scenes at ten Chromium viewports: 320×568, 360×640, 390×844, 667×375, 844×390, 768×1024, 1024×768, 1280×900, 1440×900, and 1920×1080. It includes home, both parent-gate outcomes, all eleven game lobbies and active rounds, shared game feedback and completion, parent dashboard and settings details, five content tabs and editors, live recording permission/active/saved states, feedback outcomes, keyboard focus, and `/ui-kit`. A separate WebKit smoke gate passed at 390×844, 667×375, and 1280×900.

| Automated check | Result |
|---|---|
| `npm run verify:pure` | Pass |
| `npm run lint` | Pass; zero errors, one inherited `ContentContext.tsx` Fast Refresh warning |
| `npm run test:e2e` | Pass, 644/644 |
| `npm run test:e2e:release` | Pass, 322/322, including the new parent editor rotation case at all ten viewports and three WebKit smoke cases. |
| `npm run test:e2e:production-guards` | Pass, 2/2 |
| `npm run test:e2e:offline` | Pass, 3/3: all eleven game deep links, representative rounds, protected gate, manifest/icons |
| `npm run verify:bundle` after production build | Pass; no test hook in entry, avatar renderer stays a separate lazy chunk |
| `npx tsx tools/screenshots/capture.verify.ts`, `git diff --check` | Pass |
| `npm run verify:release` | Stops at inherited `test:audio` failure: 25 syllable, 13 word, and two phrase recordings absent. Other commands in the aggregate script were run separately and passed. |

## User visual review

The screenshots are evidence for the user's final decision. These points remain unchecked until the user reviews the capture set:

- [ ] Living Toybox feel across all child games, with light home cards and a consistent palette.
- [ ] Calm, readable parent surfaces and consistent component materials.
- [ ] Visible keyboard focus, readable text contrast, and usable reduced-motion states.
- [ ] Portrait and short-landscape fit, with no clipped or overlapping critical controls.
- [ ] No mixed legacy surface across home, game, parent, recording, and feedback routes.

DOM geometry, touch-target, axe, keyboard, route, persistence, and reduced-motion assertions passed in the automated suites. Those checks support the review but do not replace a visual decision.

## Remaining release decision

The 40 missing bundled audio files predate Phase 8. `AudioManager` falls back per clip to Slovak Web Speech, and no audio key or file changed in this candidate. The inventory check remains red; recorded clips or an explicit release decision about that fallback are required before claiming the aggregate release gate is green. Final user visual sign-off is also pending.

Accepted deviations: None.
