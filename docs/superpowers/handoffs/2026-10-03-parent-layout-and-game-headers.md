# Parent layout and game headers

Implemented all six browser comments on `feature/full-app-ui-redesign`, based on `7715590fcf0b6eb54f790ccd334e073bdb60de7a`.

- Parent-gate arithmetic and entered answer are flat; labels, keypad, keyboard handling and validation remain intact.
- Game settings overview and custom content use the same centered 672px maximum column as feedback. Content keeps its category rail/list at larger widths; editing uses the existing dialog, including full-screen editing on small/short screens and focus restoration on dismissal.
- Feedback message types and textarea use shared flat variants. Selected options and keyboard focus remain visible. The sticky submit button remains reachable; its decorative divider is removed.
- Screenshot guidance links to `mailto:jan.svehla@pm.me` inside the form and after successful submission. The address was recovered from the removed HelpFeedbackScreen copy in commit `4303925`; no message was sent. Feedback retains its honest no-reply copy and existing validation/submission behavior.
- All GameShell titles use centered PageHeader alignment. Wider screens balance the title between equal side tracks; narrow phones put the title below back/progress controls. Parent headers retain their existing alignment.
- `/ui-kit` includes flat radio/textarea and centered header examples; generated inventory remains current at 103 named components.

## Verification

- Red regressions: existing feedback and desktop content tests failed as expected before implementation (missing email and absent desktop editor dialog).
- `npm run verify:integration`: lint, 80 unit tests, all pure verifiers, development audio inventory, test build, production build and production bundle boundaries passed. Browser run passed 452/454. Its two failures were obsolete test expectations: an unscoped gallery radio selector matched the added flat specimen, and the foundation help test still prohibited the requested email link. Report: `artifacts/verification/2026-10-03T21-36-41-958Z-integration.json`. This aggregate report remains marked unsuccessful and is not represented as a green run.
- Corrected only `e2e/ui-foundation.spec.ts` afterward, scoping radio selection to each group and checking keyboard selection in both variants; restored the screenshot contact expectation. `npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts`: **32/32 passed**, including both previously failing cases. Product code and builds were unchanged, so unaffected tests were not repeated. Combined runs verify every one of the 454 integration cases.
- Fresh `npm run lint`: exit 0, zero errors; the existing ContentContext react-refresh warning remains. `git diff --check`: clean.
- Seeded `npm run shots`: **27/27 successful captures**, nine affected/representative scenes at 320×568, 667×375 and 1280×900. All 27 were inspected only as 320px review copies. Zero console/page errors and failed requests. Manifest: `artifacts/ui/2026-10-03-parent-layout-review/manifest.json`.
- Supplemental browser measurements passed at all three sizes: flat equation/textarea/radio controls have zero border and no shadow; parent columns are ≤672px and centered within one pixel; alphabet, comparison and complete-syllable headings are centered within one pixel. Recorded in the capture directory's `style-geometry-checks.json`. Three gallery detail captures and three feedback-guidance captures were also inspected as 320px review copies.

Final input fingerprint: `f714a4ae5eacff3708b0e08d21580ec9ab9611285cb4df754b74bf86f73c7517`. Main capture manifest and original integration run record pre-test-correction fingerprint `500807b99ed65af8ebe0ffa44c0326e9f16b674be52b4ff6123b919eeb779a4c`; test build identity is `9338ce9ac6cff0f11ee0a8677b17852dfaa7f1533aa7098d08a62b827bd3d134`. The only input change after that build was the foundation test correction above.

No deployment or pull request. User-planned missing recordings remain a separate pre-deployment task. The preexisting untracked efficiency audit was preserved.
