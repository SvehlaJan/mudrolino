# Hravé Učenie — Product Roadmap

> **Living document.** Update this file whenever a task is completed, a decision is made, or scope changes. See `docs/superpowers/specs/2026-04-05-productization-roadmap-design.md` for the full design rationale behind this roadmap.

---

## Legend

- `[ ]` Not started
- `[x]` Done
- `[~]` In progress
- `[?]` Blocked / needs decision

---

## Phase 0 — Finish It

**Goal:** Feature-complete for personal (family) use. No new architecture — content, games, and bug fixes only.

### Syllables game polish
- [x] Success echo shows source word with hyphens between syllables (e.g. "ja-ho-da 🍓") instead of plain word — small change to `SuccessOverlay.tsx`

### Words game (new)

- [x] Spec for words game (`docs/superpowers/specs/`)
- [x] Words game component (`src/games/words/WordsGame.tsx`)
- [x] Words game content entries in Slovak locale content
- [x] Add words game to `App.tsx` game registry and home screen grid

### Syllable assembly game (new)
> Tap-to-place mechanic with optional drag-and-drop: child sees shuffled syllable tiles and places them in the correct order to form the word.

- [x] Spec for syllable assembly game (`docs/superpowers/specs/`)
- [x] Syllable assembly game component (`src/games/assembly/AssemblyGame.tsx`)
- [x] Add assembly game to `App.tsx` game registry and home screen grid

### Bug fixes (from `docs/BACKLOG.md`)
- [x] **B1** — Music toggle has no effect (`audioManager.ts:58`, `App.tsx:73`)
- [x] **B3** — Confetti animates infinitely after SuccessOverlay hides (`SuccessOverlay.tsx:47-55`)
- [x] **B4** — `startNewRound` infinite loop edge case when pool size = 1 (all game files)
- [x] **H2** — No error boundaries — any JS error crashes the whole app
- [x] **H3** — Alphabet game distractors guard: `slice(0, 7)` returns fewer than 7 if pool is small (`AlphabetGame.tsx:37`)
- [x] **H5** — Missing diacritical syllables: ň, š, ž, etc. not in syllables game (`contentRegistry.ts:73`)

### UX polish (from `docs/BACKLOG.md`)
- [x] **F1** — Progress/round counter visible to child and parent during a session
- [x] **F3** — Difficulty setting for Alphabet and Syllables games (grid size)
- [x] **F4** — Counting game: short delay before answer options appear (let child count first)
- [x] **F7** — Mobile safe-area padding (notch/home-indicator overlap on phones)
- [x] Shared `GameLobby` component extracted for all game pre-screens
- [x] Shared game catalog now drives home-screen cards and per-game lobby metadata

---

## Phase 1 — Friends-first Share

**Goal:** Share a useful, local-first Slovak app with trusted friends quickly. No accounts, no payments, no public marketing launch.

### 1.1 Release Readiness
> Focus on confidence for a small private audience, not full public-launch polish.

- [x] Run a full smoke test on phone and desktop/tablet: home, all games, settings, custom content, recording, feedback, avatar flag on/off
- [ ] Verify production build and deploy target
- [x] Configure `VITE_WEB3FORMS_KEY` for private feedback collection
- [x] Add browser favicon links so page loads stop requesting a missing `/favicon.ico` (this 404 turned every e2e console-error assertion red)
- [x] Pre-launch UI audit across 7 viewports — see `docs/ui-audit/`
- [x] Approve full-app pre-publication redesign specification (`docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`)
- [x] Write eight self-contained sequential implementation plans and Antigravity handoff index (`docs/superpowers/plans/2026-09-14-ui-redesign-implementation-index.md`)
- [ ] Complete full-app UI redesign before publication (all eight sequential phases below)
  - [x] Phase 1 — baseline, protected-route safety, test-only parent-gate adapter, and regression scaffolding (Codex accepted `a894532`)
  - [x] Phase 2 — Radix-backed component-library, token, responsive, motion, and accessibility foundation (Codex accepted candidate `ac4a40b`; see `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-02.md`)
  - [x] Phase 3 — scalable game catalog, grouped home, and all game lobbies (Codex accepted candidate `481f3e8`; see `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-03.md`)
  - [x] Phase 4 — parent dashboard, settings registry, custom content, recordings, and feedback (Codex accepted candidate `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`; see `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-04.md`)
  - [x] Phase 5 — shared game shell and Abeceda/Slabiky/Čísla/Slová migration (Codex accepted candidate `c6e8b557f872e39dca9f5fc39429cfd42225eb40`; `4d9afd1261daa0823c793c05049a2b50063b93bc` is superseded; see `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md`)
  - [~] Phase 6 — Prvé písmenko/Skladaj/Doplň slabiku/Doplň písmeno migration (implementation complete and remediated after the final whole-phase review, current candidate `d6f32d9bf758e0e498c4cadf17a1df09170a46d1`, **pending Codex acceptance** — `99b144863b298aa980e74f576b1363a36f690ab6` is superseded; see `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-06.md`)
  - [ ] Phase 7 — Spočítaj/Viac alebo menej/Sčítaj migration
  - [ ] Phase 8 — release hardening, Codex review, and user visual sign-off
- [ ] Fix audit ship blockers through redesign phases: parent-gate bypass, landscape `/settings`, unlabelled parent inputs, answer-tile overflow, missing compare prompt
- [ ] Fix audit accessibility findings through redesign phases: `text-muted` token, `prefers-reduced-motion`, modal focus behaviour, 44px touch targets, `<h1>`/`<main>` landmarks
- [ ] Share private URL with first friend group
- [ ] Collect and triage first feedback before public launch planning

### 1.2 Content and Custom Audio
> Local-first MVP is implemented. This is no longer a future premium-only feature; it is part of the friend-share build.

- [x] Spec for user-customisable content (`docs/superpowers/specs/2026-04-25-user-customisable-content-design.md`)
- [x] Local content repository with locale-partitioned words and praise
- [x] `/content` management screen replaces `/recordings`
- [x] Add/delete custom words with syllable breakdown and emoji
- [x] Add/delete custom praise entries
- [x] Record local audio overrides for letters, numbers, phrases, words, and praise
- [x] `audioManager` plays custom audio before bundled MP3/TTS fallback
- [x] Harden custom content validation, draft states, default restore, and empty states for Words/Syllables/Assembly
- [ ] Decide whether friend-share build needs export/import or reset-to-defaults controls

### 1.3 Settings and Locale Foundation

- [x] Modularize and expand settings content into sections
- [x] Alphabet game: accent-letter enable/disable toggle
- [x] Number/counting range controls in settings
- [x] Locale-aware content/audio path architecture
- [x] Slovak content moved into locale module
- [x] Czech locale stub exists
- [ ] Add language selection UX only after Czech content is actually populated

### 1.4 Feedback
> Web3Forms feedback is enough for friends-first. A larger feedback platform can wait until public launch.

- [x] Feedback form spec (`docs/superpowers/specs/2026-04-23-feedback-form-design.md`)
- [x] Parent-facing feedback form in settings
- [x] Submit feedback through Web3Forms when `VITE_WEB3FORMS_KEY` is configured
- [x] Verify feedback submissions from deployed private build

### 1.5 Avatar Companion and Customization
> Specs exist in `docs/superpowers/specs/2026-04-19-avatar-companion-design.md` and `docs/superpowers/specs/2026-04-21-avatar-staged-poc-design.md`. The historical Meshy character and cleaned animations proved the React Three Fiber runtime and Blender cleanup path, but the app-facing runtime now uses the plain male base at `public/avatar/modular/male-base-plain.glb` plus separate garment GLBs under `public/avatar/garments/`. Old `public/avatar/meshy` POC GLBs are no longer current published assets; related source/provenance remains under `meshy_output/`.
>
> Remaining avatar work is outside the 2026-09 pre-publication UI redesign. The future product direction is a robust friendly buddy that cheers children, after the 3D models and runtime are improved in a dedicated phase.

- [x] Avatar companion design spec (`docs/superpowers/specs/`)
- [x] Local avatar runtime under `src/avatar/`
- [x] `/avatar-preview` route for asset inspection
- [x] Home overlay behind `VITE_AVATAR_POC_ENABLED`
- [x] Historical Meshy POC character and animation provenance captured under `meshy_output/`
- [x] Historical cleaned success and failure/reaction animation candidates evaluated and replaced as current app-facing preview choices
- [x] Spec: male-coded avatar base, modular clothing, and face-decal readiness (`docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md`)
- [x] Generate a new male-coded base avatar from scratch as a modest underlayer/mannequin, not an anatomically nude model and not the current clothed Meshy character
- [x] Keep or retarget to a stable armature with reusable named bones so idle/success/failure animations can drive the base and clothing meshes
- [x] Export one MVP modular GLB for the male base containing the base body plus named top-slot mesh variants
- [x] Publish the current app-facing avatar base at `public/avatar/modular/male-base-plain.glb`
- [ ] Map idle/success/failure avatar states into runtime-facing names
- [ ] Add avatar to session-complete/reward screens first
- [ ] Decide whether per-round success/failure overlays should use the avatar or keep the current lightweight treatment
- [x] Define the slot-ready avatar state/catalog with multiple future slots but implement only `top` for the MVP
- [x] Create 2 top variants in the male modular GLB, with stable mesh names suitable for visibility toggles
- [x] Persist selected top locally in versioned avatar state, migrating from the current `outfitId: "default"` shape
- [x] Add a simple parent-facing customization screen or section
- [x] Prepare the new head asset for future selfie-based face customization with a named face patch/anchor such as `face_anchor`
- [x] Complete `/avatar-preview` as the modular avatar workbench for base, top slot, future slots, face state, body shape, diagnostics, persistence, and reset
- [x] Verify customized avatar on desktop and mobile with Playwright screenshots

### 1.6 Analytics
> Not required for friends-first sharing. Revisit before public launch if usage telemetry is still desired.

- [?] Decide whether private friend testing needs analytics at all
- [ ] Spec: analytics platform decision + event taxonomy (`docs/superpowers/specs/`)
- [ ] Decide and set up analytics platform if needed
- [ ] Instrument screen views and game events if analytics is adopted

### 1.7 Future Game Backlog
> Candidate games that fit the current learning model.

- [x] **Prvé písmenko** — sound-first word-to-starting-letter game using ready words and active alphabet settings.
- [x] **Doplň slabiku** — show a word with one missing syllable and let the child choose the missing tile.
- [x] **Doplň písmeno** — show a word with one or more missing Slovak letter units and let the child fill them in guided order.
- [x] **Viac alebo Menej** — quantity comparison game (two object piles, tap the one with more; numeral-comparison mode as a setting). Spec: `docs/superpowers/specs/2026-09-02-compare-quantities-game-design.md`.
- [x] **Sčítaj** — simple addition game (two object/numeral groups combined, tap the matching sum; sum range and representation mode as settings). Spec: `docs/superpowers/specs/2026-09-04-addition-game-design.md`.
- [ ] Further arithmetic games (e.g. subtraction) anticipated as follow-ups once addition ships and is validated.
- [ ] Persistent child gamification (achievements, stickers, toy shelf, streaks, or progression) only after the full-app redesign ships and receives real usage feedback.

---

## Phase 2 — Public Launch

**Goal:** Move from trusted-friend sharing to a public Slovak web launch after feedback and privacy basics are handled. Still no accounts or payments.

> Open decisions: domain, landing page vs. app-at-root, and analytics. Installable PWA support is implemented for the current app.

- [ ] Synthesize friend feedback into launch blockers vs. later improvements
- [ ] Decide on domain and configure DNS
- [ ] Configure production static hosting if the friends-first deployment is not the final host
- [ ] Write and publish privacy policy (GDPR-compliant, covers children and local microphone/audio storage)
- [ ] Decide whether to use analytics for public launch
- [ ] If analytics is adopted, choose privacy-friendly platform and verify no cookie banner is needed
- [x] Evaluate and implement PWA: manifest, installability, and offline caching for the app shell/core games
- [x] Add installable PWA support for mobile with offline core games
- [ ] SEO: meta tags, Open Graph, page title/description for discoverability
- [ ] Landing page or app-at-root decision
- [ ] Public smoke test on production URL
- [ ] Announce/share beyond the first friend group

---

## Phase 3 — Cloud and Accounts

**Goal:** Add optional accounts only after local-first usage proves there is value in sync, backup, or multi-device use.

> Needs its own spec. Firebase remains a candidate, but backend work should not block friends-first or public Slovak launch.

- [ ] Decide whether accounts are needed based on friend/public feedback
- [ ] Spec: backend platform choice, auth providers, data model, and cloud migration (`docs/superpowers/specs/`)
- [ ] Define migration model for local settings, custom words, custom praise, custom audio, and avatar clothing state
- [ ] Set up Firebase/Supabase/PocketBase or chosen alternative
- [ ] Implement authentication if needed
- [ ] Implement user profile document/schema
- [ ] Migrate local data to cloud on first sign-in
- [ ] Data deletion: users can delete account and all associated data

---

## Phase 4 — Multi-language

**Goal:** Add real additional language support after the Slovak friend/public release is stable. Czech first, then English, French later.

> Architecture is partially done: locale-aware content modules, locale-aware audio paths, app locale storage, Slovak content, and a Czech stub exist. The missing work is content, UI language, validation, and language selection UX.

### Architecture
- [x] i18n preparation spec (`docs/superpowers/specs/2026-04-15-i18n-prep-design.md`)
- [x] Locale-aware `contentRegistry.ts`
- [x] Slovak locale module
- [x] Czech locale stub
- [x] Locale-prefixed audio paths
- [x] Locale-aware app settings storage
- [ ] UI string translation architecture
- [ ] Language selection UX in Settings or onboarding
- [ ] Validate custom content/audio storage across language switches

### Czech (`cs`)
- [ ] Curate Czech alphabet, word dictionary, syllables, praise, and number labels
- [ ] Record or generate default Czech audio files
- [ ] Validate content with a native Czech speaker

### English (`en`)
- [ ] Define English syllabification strategy
- [ ] Curate English alphabet, word dictionary, number labels, and UI strings
- [ ] Record or generate default English audio files
- [ ] Validate content with a native English speaker

### French (`fr`)
- [ ] Define French syllabification strategy
- [ ] Curate French alphabet, word dictionary, number labels, and UI strings
- [ ] Record or generate default French audio files
- [ ] Validate content with a native French speaker

---

## Phase 5 — Avatar Expansion

**Goal:** Turn the MVP avatar into a small customizable companion system without taking a dependency on accounts or cloud storage.

- [ ] Expand the MVP top-slot model into practical slots: `top`, `bottom`, `shoes`, `hair`, and `accessory`
- [ ] Add a female-coded underlayer base as a separate `baseVariant`, not as a clothing preset
- [ ] Decide whether male and female bases can share one animation set directly or need per-base Blender retarget/export steps
- [x] Move from baked combined preview GLBs to runtime-loading separate garment GLBs for static slots
- [x] Populate the external-GLB `top` slot with first garments (`top_blue_tshirt_v1`, `top_orange_hoodie_v1`) generated via Meshy text-to-3d
- [x] Skin both tops to the shared 24-bone armature so they deform with idle/walk/run (Blender data-transfer weights + runtime `rebindGarmentToBaseSkeleton`); both verified in `/avatar-preview`
- [ ] Add body-masking (hide body faces under a worn top) to remove the thin-tee collar/shoulder seam without conforming the garment
- [ ] Make footwear animation-ready without foot poke-through or unacceptable deformation
- [ ] Design clothing catalog items so one item ID can map to per-base fitted assets, e.g. male and female GLBs for the same shirt
- [ ] Add compatibility metadata for clothing assets by `baseVariant`, slot, and supported body-shape range
- [ ] Add parent-facing customization UI for base variant and all unlocked slots
- [ ] Persist avatar base, slot selections, generated face metadata, and future body-shape settings with versioned migrations
- [ ] Implement the easy face-customization path: user selfie behind parent gate, backend Gemini image transform, generated stylized face PNG, and runtime face decal applied to the prepared face anchor
- [ ] Do not expose Gemini API keys in the browser; route selfie processing through a backend/serverless endpoint
- [ ] Do not store raw selfies by default; store only the generated stylized face asset unless a parent explicitly opts into cloud/account sync later
- [ ] Provide reset/delete controls for generated face customization
- [ ] Evaluate a higher-quality UV-based head texture workflow after the decal approach is proven
- [ ] Explore body-shape customization with explicit levels: uniform scale first, then optional morph targets for slim/sturdy/tall/short variants
- [ ] Re-run desktop/mobile avatar preview verification after each base, clothing, face, or body-shape runtime change

---

## Phase 6 — Monetization

**Goal:** Decide whether monetization is needed after real usage data and feedback exist.

> Do not gate current local-first custom content/audio or friends-first sharing behind premium. Revisit subscriptions only after public launch feedback clarifies demand.

- [ ] Research comparable children's education app pricing
- [ ] Decide whether paid features are appropriate
- [ ] Spec: subscription model, pricing, family plan, and gating if monetization proceeds (`docs/superpowers/specs/`)
- [ ] Decide whether premium should focus on cloud backup, multi-language packs, advanced avatar customization, or future content packs
- [ ] Evaluate Stripe only after backend/account decisions are made

---

## Cross-cutting Concerns

### Privacy and GDPR
> Legal/compliance review needed — not purely engineering. Must be resolved before Phase 2 (public launch).

- [ ] Privacy policy written and published (GDPR-compliant, covers children's data, microphone permission, local custom audio, and feedback form submissions)
- [ ] Determine if analytics platform requires cookie consent banner (Plausible/Umami: no; GA4: yes)
- [ ] Parental consent mechanism for account creation on behalf of a child (Phase 3)
- [ ] GDPR data deletion: account + all associated data removable on request (Phase 3)
- [ ] COPPA compliance review if English-speaking market is targeted (Phase 4)

### Performance and PWA
- [x] Evaluate and implement PWA: service worker, offline caching, web app manifest, and mobile install prompt
- [ ] Audio/avatar preloading strategy as content library and 3D assets grow
- [x] Avatar bundle-size audit: the avatar renderer is lazy-loaded, so three.js/R3F/drei left the main chunk (1,075 kB → 452 kB; 306 kB → 141 kB gzipped) and no longer inflate the PWA precache (3,944 KiB → 3,348 KiB)
- [ ] Mobile performance audit of the avatar runtime itself (frame rate, memory, GLB decode) now that its bundle cost is isolated
- [ ] Image/emoji asset optimization audit

### Accessibility
- [ ] **AC1** — Keyboard navigation (arrow keys, Enter, Space on all child answer patterns) — required by full-app redesign Phases 5–8 before publication
- [x] **AC2** — ARIA labels on icon-only/game buttons
- [x] **AC3** — Emoji text alternatives in SuccessOverlay/session feedback
> Touch remains the primary child input, but AC1 is no longer deferred: the universal UI contract requires keyboard access before publication.

### Tech Debt
- [ ] Extract a shared session/timer-guard hook (`sessionTokenRef` + timer cleanup + `MAX_ROUNDS`/`finishRound` handoff) — `CompleteSyllableGame`, `CompareQuantitiesGame`, `CountingItemsGame`, and `AdditionGame` each hand-roll near-identical versions of this. Flagged during the addition game's design (`docs/superpowers/specs/2026-09-04-addition-game-design.md`) rather than folded into that work, since it means refactoring already-shipped games as a side effect of adding a new one.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-16 | UI redesign phases 2–8 use Claude Code Sonnet with Extra effort first, falling back to Antigravity Gemini 3.8 Flash High only when Claude's five-hour quota is exhausted; Codex remains reviewer/orchestrator. | This uses the preferred implementation agent while preserving sequential phase gates, avoiding concurrent edits, and keeping progress moving across provider quota windows. |
| 2026-04-05 | Option B roadmap: MVP launch first, then platform | Get real users before investing in backend; freemium upsell works better after free-tier discovery |
| 2026-04-05 | Content configurability moved to pre-launch (Phase 1) | App feels incomplete without it even at launch |
| 2026-04-05 | Analytics before public launch | Superseded by 2026-05-01 friends-first decision; analytics is optional before public launch. |
| 2026-04-05 | Feedback platform post-launch (Phase 3) | Superseded by Web3Forms parent feedback form for friends-first testing. |
| 2026-04-05 | French is last language | Lower priority vs. Czech and English |
| 2026-04-05 | Freemium model | Superseded for now; do not gate local-first custom content/audio before real usage feedback. |
| 2026-04-05 | Placeholder UI for unbuilt features in Phase 1 | Superseded for friends-first sharing; avoid placeholder clutter until analytics/product launch decisions are made. |
| 2026-04-07 | GameDescriptor<T> pattern replaces ContentItem god object | ContentItem accumulated optional cross-game fields; descriptor pattern makes each game self-contained |
| 2026-04-07 | Words game mechanic: see syllabified word, tap emoji | Reading-focused; distinct from syllables game which shows the syllable and has child recognize it |
| 2026-04-11 | Shared phrase audio metadata lives in `contentRegistry.ts` under English keys | Makes phrase clips manageable from one place and prepares the app for future translation/i18n work |
| 2026-05-01 | Next release target is friends-first sharing, not public launch. | The app is useful enough for trusted testers, while UX review, avatar polish, privacy, and launch packaging continue in parallel. |
| 2026-05-01 | Custom content and custom audio are part of the local-first MVP, not a premium-only future feature. | The code already supports local recording and content editing; charging decisions should wait for real feedback. |
| 2026-05-01 | Avatar customization should move to a scratch-built male-coded underlayer base before clothing work. | The current clothed Meshy character proved the runtime and animation cleanup path, but it is one fused mesh with one material, so real clothing slots need a new modular base asset. |
| 2026-05-01 | Avatar MVP will use one modular GLB per base and implement only the `top` slot first. | This keeps the renderer simpler while preserving a slot-ready state/catalog design; separate clothing GLBs remain a backlog goal after the first base works. |
| 2026-05-01 | Face customization starts with an easier generated face decal, not full head replacement. | A selfie can be transformed server-side into a stylized face PNG and applied to a prepared face anchor; UV-based head texture replacement can wait until the decal approach is validated. |
| 2026-06-02 | Garment tops are generated with Meshy text-to-3d (lowpoly, Meshy 6), not multi-image. | Text-to-3d produced clean hollow t-shirt and hoodie shells with no reference-image dependency; multi-image stays the fallback for pieces text-to-3d handles poorly. |
| 2026-06-02 | Avatar garments skip `hd_texture` and are post-processed with `gltf-transform optimize` (webp/1024). | 4K maps bloated a t-shirt to 17 MB for no visible gain at avatar scale; optimization lands garments under ~1 MB. |
| 2026-06-02 | Garments are skinned to the body's shared armature (Blender data-transfer weights) and rebound at runtime by bone name; meshopt geometry compression is used. | Static single-bone attach can't deform a torso/sleeve garment. Correction to the earlier note: drei `useGLTF` DOES decode meshopt (the body GLB itself is meshopt-compressed), so garments are meshopt-compressed too. |
| 2026-06-02 | Thin garments (tee) need clean object-scale fit + OUTSIDE shrinkwrap + flat-matte maps; per-vertex normal inflation is avoided (it self-intersects into slivers). Bulky garments (hoodie) need neither shrinkwrap nor inflation. | A natural-shaped thin garment clips at the neck/shoulders on a visible body; OUTSIDE shrinkwrap lifts only the clipping verts. The true fix for a clip-free thin tee is body-masking (backlog). |
| 2026-07-06 | Friends-first feedback uses Web3Forms on the deployed build. | Feedback submissions have been verified in production, so a heavier feedback platform remains deferred. |
| 2026-09-01 | The UX review is no longer tracked on this roadmap. | It is done by hand, outside the repo, whenever it is worth doing; a permanently `[~]` task with no findings document was only adding noise to Phase 1.1 and Phase 2's open decisions. |
| 2026-09-01 | Phase 1.7's unbuilt games ("Doplň slovo", "Ktoré chýba?") are dropped rather than deferred. | Nine games already cover the learning model, and the friends-first blockers are sharing and feedback. Either idea can be re-added from this log if real feedback asks for it. |
| 2026-09-01 | The avatar renderer is a lazy chunk and is excluded from the PWA precache. | three.js/R3F/drei were more than half the main bundle for a feature behind `VITE_AVATAR_POC_ENABLED`. The avatar GLBs were already excluded from precache, so precaching the renderer bought nothing offline; a failed chunk load is caught by the existing `AvatarRuntimeBoundary` and just hides the avatar. |
| 2026-09-02 | Nunito adopted as default typography with Shantell Sans alternative in Parent Settings | Fredoka had defective Slovak diacritics (rendering accents as acute/tilde); Nunito provides authentic Slovak diacritics with variable 400..900 weights; Shantell Sans provides an optional comic-book style. |
| 2026-09-03 | Comprehensive UI/UX Enhancements: AuditoryPromptBadge, Zero-collision CSS Grid in Counting, PromptBadge standardization, Assembly mobile thumb layout, and Avatar garment localization | Solves tactile toddler interaction in counting via procedural Web Audio, provides visual audio feedback in auditory games, standardizes prompt replay UX, anchors mobile interaction in thumb zone, and localizes all avatar clothes in SK and CS. |
| 2026-09-03 | Viac alebo Menej quantity comparison mini-game added with self-correcting 2-choice mechanic | Bespoke game state machine rather than FindItGame engine because every round ends in success with wrong side disabled; supports numerals and object emoji piles, settings range, and TTS fallback. |
| 2026-09-04 | Sčítaj addition mini-game added with bespoke 4-choice numeral tap mechanic | Bespoke game component rather than FindItGame engine (two-addend problem target + plain numeral options have different shapes); supports object clusters and numerals, near-miss distractor band, 3-attempt failure overlay, and TTS fallback. |
| 2026-09-12 | Settings UI & responsive pre-publishing overhaul | Stripped game & avatar settings from main /settings (keeping only music, font, custom content, feedback); adapted in-game overlay for mobile landscape; 2-column layout for Parents Gate in landscape; eliminated action button collisions in custom content. |
| 2026-09-12 | Delete background music; make feedback unconditionally visible on main settings | Background music feature removed from types, audioManager, and settings UI as games do not use it; feedback card made unconditionally visible on home settings screen with dev-mode fallback. |
| 2026-09-12 | Settings UI consistency, WCAG AA contrast, and landscape overhaul | Replaced low-contrast white-on-pastel active choices with brand text-text-main (5.2:1+ contrast); converted /settings cards into pressable nav cards with chevron; added 2-column landscape grid in game settings overlays to eliminate scrolling; switched modal action to quiet "Hotovo" with dialog a11y. |
| 2026-09-12 | Frameless settings presentation, adaptive dialog sizing, and dismiss ergonomics | Eliminated nested card-in-a-box framing in in-game settings overlays; sized single-setting dialogs to compact max-w-md; added top-right X close button and centered Hotovo action; harmonized setting titles to avoid echoing game names. |
| 2026-09-12 | Contextual hierarchy shadow system (Option 1) | Replaced heavy, flat 8px block shadows on floating modals with soft diffused elevation (.shadow-modal); refined buttons to tactile 5px block shadows with 4px press travel; added 3px micro-chip lift for active segment choices. |


| 2026-09-13 | Screenshot sweep is a tool, not a test (`npm run shots`) | UI review needs broad viewport coverage without the brittleness of visual-diff assertions; `tools/screenshots/capture.mjs` captures 39 scenes × 7 viewports and asserts nothing, so it never fails a build on a rendering difference. It answers the parents gate by reading its own arithmetic rather than adding a skip-the-gate flag, keeping the production bundle free of test backdoors. |
| 2026-09-13 | Pre-launch UI audit findings recorded in `docs/ui-audit/` | Audit found 5 ship blockers (chief among them: the parents gate is bypassable by a single Back press), WCAG failures on every `opacity-55` description at 2.66:1, no `prefers-reduced-motion` guard anywhere, and a styling layer where over 100 `!important` uses fight the app's own primitives. The 2026-09-12 contrast pass fixed active choice tiles but not muted description text or game chips; the landscape fix landed on the in-game overlay but not the `/settings` route. |
| 2026-09-14 | The complete foundation-first UI redesign is required before publication. | The approved design pairs a Living Toybox child experience with a calm parent dashboard, preserves the shared palette and light game cards, uses Radix behind repo-owned components, and requires universal functionality across desktop, tablet, portrait phone, and landscape phone. |
| 2026-09-14 | The redesign excludes the avatar and persistent gamification. | The future avatar should be a robust friendly buddy that cheers children after its 3D models and runtime improve; achievements and deeper gamification remain backlog work rather than expanding the publication-critical redesign. |
| 2026-09-14 | Redesign phases will be implemented sequentially by fresh Antigravity Gemini 3.8 Flash agents using subagent-driven development, with Codex approval after every phase and user visual sign-off after Phase 8. | Self-contained phase plans, blocking reviews, and clean handoffs prevent hidden conversational dependencies; rejected work stays with its owning phase instead of leaking into later phases. |
| 2026-09-14 | Test-mode builds expose a parent-gate automation adapter; production builds do not. | This supersedes the 2026-09-13 tooling choice only for `mode=test`: gate-specific tests still exercise the real keypad, while unrelated E2E and screenshot scenes can quick-pass deterministically and a production assertion prevents the adapter from shipping. |
| 2026-09-15 | Redesign screenshots are local manual-review evidence, not visual-regression tests. | The shared script preserves each run under ignored `artifacts/ui/<full-git-sha>/<unique-run-id>/`; Chromium captures the full viewport matrix, a small WebKit suite smoke-tests compatibility, Codex reviews phase screenshots, and the user approves the final visual result without adding brittle pixel baselines or generated contact-sheet tooling. |
| 2026-09-16 | `AppScreen`'s short-layout detection reads `window.innerHeight`, not the screen's own rendered box. | Superseded later the same day: a scrollable (`height="content"`) screen's content can be far taller than the viewport, and even `document.documentElement`'s box grows with overflowing content, so `window.innerHeight` was the only signal immune to that — but it can't tell a screen's box apart from the true viewport once an ancestor changes what the screen is actually laid out inside. |
| 2026-09-16 | `AppScreen`'s safe-area inset for `position="fixed"` screens is additive margin, not padding. | The existing `screenPadding` already owns the element's padding box; a same-axis padding utility for the inset would let Tailwind's conflict resolution silently replace the base padding on non-notch devices. Margin stacks with padding on the same box, so the fixed parent-gate overlay gets `env(safe-area-inset-*)` on top of its normal padding instead of losing it. |
| 2026-09-16 | Task 5 review-fix: `AppScreen` measures short-layout from a dedicated `position: fixed; inset: 0` sizer node via `ResizeObserver`, falling back to the prior `window.innerHeight` + resize-listener behavior only when `ResizeObserver` is unavailable. | Keeps immunity to content-driven box growth (the sizer never grows with children) while also tracking the real available box when an ancestor redefines the fixed containing block via `transform` (standard CSS, not a hack) — something `window.innerHeight` can never see. Content-mode height also dropped the `min-h-screen` floor so it is genuinely content-sized rather than always at least one viewport tall. |
| 2026-09-16 | Task 5 review-fix: `AppScreen` takes a typed `as="main" \| "div"` prop (default `"main"`) so an overlay/modal screen stacked on top of a route that already owns the page's `<main>` can opt into a non-landmark element. | `ParentsGate` (opened as a sibling overlay over the current route, e.g. from a game's lobby settings icon) and `FeedbackModal` (opened from the already-mounted `/settings` screen) were both rendering a second simultaneous `<main>`, a live semantic regression introduced by Task 5's default-`<main>` change. Both now pass `as="div"`; the fuller `ParentsGate` → shared-dialog migration with real `role="dialog"` semantics stays Task 6's job. |
| 2026-09-16 | Phase 2 (design-system foundation) implementation is complete at candidate `debc513b8102dbef72ebed83301be9d98dfab0f9`, pending Codex acceptance. | All required checks passed (variants verifier, lint, 148/148 e2e, production build with avatar/three.js confirmed still lazy-chunked, full-phase `git diff --check`); `/ui-kit`, `parents-gate`, and `settings` were swept across the 10-viewport canonical matrix and manually reviewed at 320×568, 667×375, and desktop with no clipping or overlap. Two non-blocking gaps were found and documented rather than fixed, since Task 7's scope is verification/handoff only: the screenshot tool has no `ui-kit` scene yet (a temporary local one was used, then reverted to keep the commit docs/roadmap-only), and `/ui-kit`'s static `focusOnShow` demo auto-scrolls the page away from its own top on load. WebKit smoke coverage was attempted twice (`npx playwright install webkit`) but the post-download extraction step hung indefinitely in this sandboxed environment both times; it needs a non-sandboxed environment before Phase 8 closes. Full detail in `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-02.md`. |
| 2026-09-16 | Task 6 review-fix: `ParentsGate`'s shake now checks `useReducedMotion()` instead of relying on the global `animation-duration: 0.01ms` reduced-motion rule; the global keydown handler calls `preventDefault()` on the digit/Backspace/Enter keys it owns; `handleConfirm` clears any pending error timer before scheduling another; the error text is the spec's exact `"Skús to ešte raz"`; and `accessibility-foundation.spec.ts` no longer excludes the `color-contrast` rule wholesale. | The global 0.01ms rule still ran the shake keyframe, which doesn't meet an explicit "truly disabled" contract, and a stray native default action on a focused button/Backspace could double-submit or navigate. For contrast, `/ui-kit` and the gate (this task's own files) now pass with real fixes — ad hoc `opacity-*` muted text became the existing `text-text-muted` token, and the syllable-tile demo swapped `text-white` for `text-text-main` on its pale `bg-accent-blue` — while the legacy `Button` swatch, the embedded real `RecordingListItem`, and the `/settings` dashboard (`SettingsScreen.tsx`/`SettingsContent.tsx`, owned by Phase 4) are excluded by name with a comment rather than fixed, since recoloring them is out of Task 6's file scope. |
| 2026-09-16 | Task 7 remediation: `tools/screenshots/capture.mjs` permanently registers a `'ui-kit'` scene (`SCENES`/`parseArgs`/new `printHelp` exported behind a main-module guard, covered by new `capture.verify.ts`), and `UiKitScreen.tsx`'s static completion-overlay demo moved behind an explicit trigger button instead of rendering `OverlayFrame show focusOnShow` pre-shown. New candidate SHA `ac4a40b`, pending Codex acceptance in place of the earlier, never-accepted `debc513` candidate. | The prior handoff (`debc513`) documented both as non-blocking gaps rather than fixing them, since Task 7's own file scope was verification/handoff only: the `ui-kit` scene had been added locally and reverted before commit, and the static demo's unconditional `focusOnShow` scrolled every fresh `/ui-kit` load ~4800px away from its own top before a reviewer saw it. Both are fixed TDD-first (e2e RED confirmed before each fix); 149/149 e2e passed on rerun (one `parent-access.spec.ts` timer test flaked once under full-suite worker contention, unrelated to these files, clean on isolated and full-suite reruns); the `/ui-kit`, `parents-gate`, and `settings` sweep was recaptured and manually reviewed again at 320×568, 667×375, and desktop with no clipping or overlap. WebKit smoke was re-attempted a third time and reproduced the same post-download extraction failure as before — treated as a stable sandbox constraint, still pending a non-sandboxed environment before Phase 8. |
| 2026-09-16 | Codex accepted UI redesign Phase 2 candidate `ac4a40be0380e7bfc15a3e42c99eee902593661c` after independent specification, quality, and visual-evidence review. | The final focused re-review confirmed the permanent `/ui-kit` screenshot scene, no page-load auto-scroll, refreshed canonical viewport evidence, 149/149 Chromium E2E, clean lint/build/diff checks, and the preserved lazy avatar boundary. WebKit smoke remains explicitly deferred to the Phase 8 release gate because installation/extraction is unavailable in this sandbox. |
| 2026-09-16 | Phase 3 (catalog, home, and lobbies) implementation is complete at candidate `74d545b332703d1449fe59141460ae038527a2c8`, pending Codex acceptance. | All required checks passed (uiCopy fallback verifier, gameCatalog invariants verifier, capture.verify.ts, lint, 166/166 e2e tests, production build with 11 lazy game chunks and separate AvatarScene chunk, full git diff --check). Grouped home screen (2-column grid, stable card baselines, shared-palette icon tiles) and unified GameLobby (tactile Living Toybox presets, accessible h1 title, child-size play action, responsive short-landscape layout) were implemented and verified. When canceling the settings gate over a game route, keyboard focus is smoothly restored to the settings trigger button. Full screenshot matrix (10 canonical viewports across home and all 11 game lobbies = 120 screenshots) was captured under artifacts/ui/74d545b332703d1449fe59141460ae038527a2c8/2026-09-16T14-15-52-811Z-71633/ and visually inspected. |
| 2026-09-16 | Phase 3 remediation: candidate `481f3e8c0a82f8d50195976e672a7b4f0f367091` resolves P1 (lobby settings flow regression), P2 (GameLobby locale sourcing with Czech fallback), and P3 (focus restoration assertions). | Mounted `GameSettingsRoute` at `/settings/games/:gameId` within `ProtectedParentRoute`, rendering the selected game's actual `SettingsOverlay` after parent unlock and returning to the originating lobby (`returnTo`/`definition.path`) with `{ returnFocus: 'settings' }`; `GameLobby` sources locale from `ContentContext` via `useContentLocale` preserving Czech fallback without prop threading; added explicit `toBeFocused()` assertions after gate cancel and settings close. Full 167/167 E2E suite, pure verifiers, lint, and build passed. No visual changes were introduced to the 12 registered screenshot scenes, so existing 120-image artifact `artifacts/ui/74d545b332703d1449fe59141460ae038527a2c8/2026-09-16T14-15-52-811Z-71633/` remains valid without recapture. |
| 2026-09-16 | Codex accepted UI redesign Phase 3 candidate `481f3e8c0a82f8d50195976e672a7b4f0f367091`. | Independent re-review verified the protected selected-game settings route, locale-aware lobby copy, cancel/close focus restoration, 167/167 Chromium E2E tests, and the unchanged 120-image responsive evidence. The acceptance-record commit is the sole Phase 4 base. |
| 2026-09-17 | Phase 4 custom-content editing uses one capability-equivalent composition rather than separate mobile and desktop screens. | A vertical category rail shares the list/editor grid at spacious widths; medium widths keep the rail/list and focus editing in a dialog; compact and short layouts retain every action in stacked tabs with a full-screen editor. This keeps validation, disabled-default restoration, deletion confirmation, Undo, and recording behavior consistent across form factors. |
| 2026-09-18 | UI redesign Phase 4 implementation is complete at candidate `8a070889e33869062b6ccbfdc04b608a464816e1`, pending Codex acceptance. | All required verifications passed (11 pure-logic verifiers including settingsRegistry, settingsService, appSettingsStore, customContentValidation, contentState, localContentRepository, recordingState; `npm run lint` clean; 216/216 Chromium E2E tests; production build with isolated `AvatarScene` lazy chunk; git diff whitespace check; Phase 1 persistence backward compatibility). Completed Task 6 recording recoverable state machine (explicit Stop-save, Cancel-discard, permission-denied recovery, processing-failure handling, polite live status regions, 44px minimum touch targets) and Task 7 feedback dialog (DialogShell, RadioGroupControl, Field, Button, retry support, focus restoration, no auto-dismiss, honest no-reply copy, selectable mailto: support link). Complete parent screenshot sweep (14 scenes × 10 canonical viewports = 140 screenshots) captured under `artifacts/ui/8a070889e33869062b6ccbfdc04b608a464816e1/2026-09-18T01-58-36-661Z-78681/` and visually verified. |
| 2026-09-18 | Phase 4 remediation: candidate `98a662c505fe64d80d0e5467a0b7f14db03e5cd1` resolves Codex review findings for safe not-found state, unseeded migration fallback, and complete screenshot evidence. | Unknown `/settings/games/:gameId` routes render an accessible in-parent not-found state with back routing to overview and dashboard, keeping zero-settings games safe; `migrateWords`/`migratePraises` recover the first ready default with deterministic IDs when unseeded/empty without writing during load; pure verifier coverage added for both; 217/217 E2E tests passing; clean lint/build/diff; fresh 210-image parent screenshot matrix (21 scenes across 10 canonical viewports) captured under `artifacts/ui/98a662c505fe64d80d0e5467a0b7f14db03e5cd1/2026-09-18T02-21-58-046Z-84679/`. |
| 2026-09-18 | Phase 4 row layout remediation: candidate `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc` resolves Codex review visual blocker for phone recording row layouts. | Recording rows in `RecordingListItem.tsx` move status badge and action cluster to a deliberate second row on compact phone viewports while keeping indicator + label on the first row; wider screens preserve compact inline layout; 218/218 E2E tests passing including new focused responsive phone tests; clean lint/build/diff; fresh 210-image parent screenshot matrix (21 scenes × 10 viewports) captured under `artifacts/ui/8840128b53fefdd0e96c7f1b34f2b4cc246e64dc/2026-09-18T02-38-40-236Z-87821/`. |
| 2026-09-18 | Codex accepted UI redesign Phase 4 candidate `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`. | Independent whole-phase review confirmed the protected parent hierarchy, catalog-driven settings, automatic-save feedback, versioned enabled-state migration, universal custom-content editor, recoverable recording state machine, accessible feedback flow, safe unknown-game state, storage-unavailable playable fallback, and readable phone rows. Fresh verification passed 218/218 Chromium E2E tests, lint with 0 errors, affected pure verifiers, production build with the avatar lazy boundary intact, and `git diff --check`; the 210-image responsive evidence matrix was manually inspected. The acceptance-record commit is the sole valid Phase 5 base. |
| 2026-09-18 | UI redesign Phase 5 (shared game shell) implementation is complete at candidate `9f452f494c95f6467bc50265f506093a85780514`, pending Codex acceptance. | All required checks passed (6 pure-logic verifiers including the new `gameState`/`audioManager` cancellation contracts, `capture.verify.ts`; lint clean; 120/120 targeted e2e plus 302/302 full suite after fixing one stale pre-existing test; production build with `FindItGame` shrinking from 5.89 kB to 3.40 kB gzipped and the avatar lazy boundary intact; `git diff --check`). `FindItGame` now runs Abeceda/Slabiky/Čísla/Slová through the shared `useGameSession`/`GameShell`/`AnswerGroup`/`TactilePiece` framework, replacing per-game overlay/timer state while preserving all round, audio-order, and content contracts (verified end to end, including the exhausted-round explanation-audio ordering). Fixed two pre-existing, out-of-scope issues surfaced by this phase's own verification: a stale e2e test still asserting the removed `AuditoryPromptBadge`, and a screenshot-capture timing gap that screenshotted the success/failure/completion panels mid-fade-in. 63-image screenshot matrix (9 scenes × 7 canonical viewports) captured under `artifacts/ui/9f452f494c95f6467bc50265f506093a85780514/2026-09-18T11-09-00-687Z-39624/` and visually reviewed. Full detail in `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md`. |
| 2026-09-18 | Codex rejected the Phase 5 candidate `9f452f494c95f6467bc50265f506093a85780514`; a remediation agent fixed all 8 findings and replaced it with candidate `4d9afd1261daa0823c793c05049a2b50063b93bc`, pending Codex acceptance. | Findings: (1) `FindItGame` crashed to the app ErrorBoundary on an empty content pool instead of rendering `GameShell`'s recoverable-error state; (2) completion actions (Play again/Home) rendered as soon as the final round resolved instead of waiting for `session-complete`, so a child could tap past terminal audio that hadn't finished; (3) `pause`/`resume` were dropped entirely by `FindItGame`, so only the `/ui-kit` demo could ever pause — `GameShell` now reuses the existing `ParentsGate` directly as an in-shell dialog (no second settings/dialog system, no route navigation, so the round stays mounted) and `useGameSession` gained a fix for a real bug this exposed (pausing mid-retry-countdown lost its timer, stranding the round); (4) the random `PraiseEntry` picked for verdict audio never matched the generic visible success title — now chosen once per success transition and shared by both; (5) `TactilePiece` never received a `state` prop, and fixing that surfaced a second bug where the primitive collapsed any explicit retry/settled/pressed state back to generic 'disabled' whenever the tile was also HTML-disabled; (6) `AudioManager.stop()` bumped its cancellation token but never made a pending `playSingleClip`/`speakAsync` promise settle, so an in-flight await could hang past `pause()`; (7) `find-it-games.spec.ts` was missing Task 7's keyboard-only completion actions, the real parent-dialog pause path, reduced motion on retry/failure/completion, axe on all four games plus completion, 200% zoom reachability of completion actions, rotation preserving focus, and a no-scroll-to-reveal-answer check — all added, along with two narrow-timing-window flakes this surfaced (`expect.poll`'s growing interval skipping a 500ms-wide transient phase) and a mid-fade axe contrast flake on `OverlayFrame` (fixed with an observable-opacity wait, closing a previously-documented residual risk instead of carrying it forward); (8) hygiene — a trailing blank line in `find-it-games.spec.ts`, and this handoff's own Base SHA field misattributing the Codex acceptance-record commit for Phase 4 (`d431e07f4b90810a634176a3507dec8306294348`) to an earlier candidate commit on the same lineage (`8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`). Fresh verification: 7 pure-logic verifiers, `npm run lint` clean, 160/160 targeted e2e (game-shell + find-it-games + catalog-home-lobbies) across 3 consecutive full runs, 342/342 full `test:e2e` suite across 2 consecutive full runs, production build with the avatar lazy boundary intact, `git diff --check` clean against the Phase 4 base. `npm run test:audio` still fails on the same pre-existing, out-of-scope inherited gap (13 words/syllables + 2 phrases predating the redesign branch) — recorded, not claimed as passing. 63-image screenshot matrix recaptured under `artifacts/ui/4d9afd1261daa0823c793c05049a2b50063b93bc/2026-09-18T13-36-56-049Z-62615/` and visually reviewed. Full detail in `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md`. |
| 2026-09-18 | Phase 5 round 2 remediation: a follow-up review on candidate `4d9afd1261daa0823c793c05049a2b50063b93bc` found 3 further findings plus a minor doc correction and an optional cleanup; fixed and replaced by candidate `c6e8b557f872e39dca9f5fc39429cfd42225eb40`, pending review/acceptance — `4d9afd1` is superseded. | Findings: (1) blocking — a final round's terminal verdict (`answered-correctly`, or exhausted `answered-incorrectly`) left the parent-pause lock button available for the whole window before `SHOW_SESSION_COMPLETE` dispatched; pausing there `invalidate()`d the in-flight `resolveAnswer()` before it could dispatch completion, permanently stranding the round input-locked with no way to reach `session-complete`. `canPause` now also requires `!isFinalRound`; two new e2e tests (final success and final exhausted-failure) read the lock button's live element count rather than through the auto-retrying `toHaveCount(0)`, which would have masked the bug. (2) important — opening the in-shell parent gate pauses the round and unmounts the lock button in the same commit, so both `GameShell`'s and `ParentsGate`'s "restore focus to whatever was active before pause" captured a `document.activeElement` snapshot of that same soon-detached button; `.focus()` on it later was a no-op, stranding focus after both cancel and successful unlock. `GameShell` now holds refs directly on the live lock/unlock buttons and focuses through them when a real pause contract is wired, falling back to the original capture-and-restore behavior for the `/ui-kit` demo's contract-free pause (verified against a real regression the first fix attempt caused there). (3) important — the "active rounds never require scrolling" e2e check measured `document.documentElement`, which never overflows regardless of `GameShell`'s actual `main` scroll container; rewritten to measure `main` itself and every answer's position within it, verified sensitive to real overflow at an artificially short viewport before confirming it passes at the required canonical sizes. (4) minor — this handoff's File Change Scope section had wrongly listed the reporting document and `ROADMAP.md` as part of the `9f452f4..4d9afd1` product range, contradicting its own Metadata section; corrected. Optional cleanup: consolidated `useGameSession`'s duplicated retry-timer scheduling (`resolveAnswer`'s retry branch and `resume`'s pending-retry recovery) into one `scheduleRetryReady` helper, no behavior change. Fresh verification: 4 pure-logic verifiers, `npm run lint` clean, 164/164 targeted e2e (game-shell + find-it-games + catalog-home-lobbies) re-run after every commit, 346/346 full `test:e2e`, production build clean, `git diff --check` clean against the Phase 4 base. `npm run test:audio` still fails on the same pre-existing, out-of-scope inherited gap — recorded, not claimed as passing. No visual/presentation change, so no new screenshot capture. Full detail in `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md`. |
| 2026-09-18 | Codex accepted UI redesign Phase 5 candidate `c6e8b557f872e39dca9f5fc39429cfd42225eb40`. | Independent review found no remaining actionable issues after both remediation rounds. Fresh acceptance checks passed lint, four relevant verifiers, focused terminal-verdict and parent-pause/focus regressions, the actual-scroll-container block (8/8 serially), and `git diff --check`; Claude's final evidence also records 164/164 targeted E2E, 346/346 full E2E, and a clean production build. Per the user's direction, the final acceptance pass did not inspect or regenerate screenshots. The inherited missing-audio inventory remains out of scope. The acceptance-record commit containing this row is the sole valid Phase 6 base. |
| 2026-09-20 | Phase 6 (bespoke literacy: Prvé písmenko/Skladaj/Doplň slabiku/Doplň písmeno) implementation is complete at candidate `99b144863b298aa980e74f576b1363a36f690ab6`, pending Codex acceptance. | All 6 affected pure verifiers and lint passed clean; full `test:e2e` passed 439/439 including a standalone rerun of the Phase 1 persistence-compat suite against the `alphabetAccents`/`completeLetterMissingCount` fixture; production build confirmed four separate lazy game chunks and an intact isolated `AvatarScene` chunk; `git diff --check` clean against the Phase 5 base; the two `rg` legacy-overlay/shared-framework searches confirmed only the three Phase 7 numeracy games still import `SuccessOverlay`/`FailureOverlay`/`SessionCompleteOverlay` (the four literacy games' `getSuccessOverlayAudioSpec` matches are an unrelated shared audio helper) and all four literacy directories import the canonical shared game framework. The 10-viewport screenshot matrix could only be captured for 4 of 10 canonical viewports (narrowPhone/smallPhone/phonePortrait/shortLandscape; 94 images) — the capture tool hit reproducible timing races (non-deterministic click interception and, separately, a TTS/audio-await hang with no timeout guard in `audioManager.speakAsync`) against the six larger viewports; retries were not fully exhausted before verification time was reprioritized toward a defect the partial matrix had already surfaced. That defect: the shared `GameShell.tsx` inline retry-status banner (`bg-accent-blue/20`, fixed ~72px band) geometrically overlaps the bottom 14-26px of the answer-tile tray in all four Phase 6 games at the shortLandscape (667x375) viewport, confirmed by direct `getBoundingClientRect()` measurement live in-browser — the already-accepted Phase 5 "Slabiky" FindIt game has 8.5px of clearance at the identical viewport with the identical banner, so this is not a framework-wide break, but a Phase-6-specific consequence of the taller PictureCard+WordRail prompt area leaving the answer tray sitting lower on screen. `GameShell.tsx` itself is unmodified by Phase 6. See the handoff's Residual Risks item 15 for full detail; this finding was not fixed in this verification-only task per the task's own no-fix-budget rule. |
| 2026-09-21 | Phase 6 final whole-phase review fix wave: one remediation round on the cross-cutting review of the full Phase 6 diff (`443fa48` → `499fae2`), replacing candidate `99b144863b298aa980e74f576b1363a36f690ab6` with `d6f32d9bf758e0e498c4cadf17a1df09170a46d1`, still **pending Codex acceptance** — `99b1448` is superseded. | Five fixes. (1) `GameShell.tsx`'s inline retry-status banner no longer collides with the answer tray. Re-measuring the retry state across the full 10-viewport matrix showed the defect is wider than the handoff's Residual Risk item 15 described: it also occurs at `narrowPhone` (320×568, not a short-height layout at all) and `phoneLandscape`, and Phase 5's already-accepted `words` FindIt game reproduces it with 200-209px of spill, so it is a shared-framework defect Phase 6's taller prompt made obvious rather than one Phase 6 introduced. Root cause: the banner's ~72px band comes out of the tray's flex space, the tray falls under `AnswerGroup`'s 48px minimum tile size, `calculateGridGeometry` returns an unbounded one-column-per-tile fallback, and `PlayTray` dropped its `overflow-hidden` exactly when its content box hit zero height. Fixed entirely in shared framework code (no game file touched): the banner became a `RetryStatusBanner` reading the existing measured `useAppScreenLayout().layout === 'short'` signal instead of a third raw `max-height:480px` query, compacting to one line at short/narrow sizes with the detail line kept in the live region as `sr-only`; the interactive column's prompt/tray gap, `PlayTray`'s padding and `GamePrompt`'s reserved replaying line give ground at the same two existing breakpoints; `PlayTray` now always clips; and `AnswerGroup`'s degenerate fallback derives its column count from the measured width so residual overflow is minimal. Re-measured across 8 games × 5 constrained viewports × 5 repetitions: zero overlap, zero tray content overflow, every control ≥48px. (2) The viewport matrix never entered a feedback state — which is why this shipped invisibly — so `e2e/bespoke-literacy.spec.ts` gained 40 tests driving all four games into retry at all 10 canonical viewports, reusing `expectNoPairwiseOverlap`; they fail on the pre-fix build. (3) `tools/screenshots/capture.mjs` now waits for tile geometry to settle before every click instead of only in `round` scenes, the likely cause of the Task 8 capture run's click-interception failure. (4) The full 24-scene × 10-viewport screenshot matrix was recaptured **complete — 240/240 images in one clean pass**, including the six viewports Task 8 never reached, under `artifacts/ui/d6f32d9bf758e0e498c4cadf17a1df09170a46d1/2026-09-21T00-20-35-805Z-59854/`; the four `shortLandscape` retry scenes were read directly as images to confirm the overlap is visually gone, not just test-green. (5) `FirstLetterGame.tsx` and `CompleteSyllableGame.tsx` gained the `answerLockRef` re-entrancy guard `CompleteLetterGame.tsx`/`AssemblyGame.tsx` already carry, closing the same-tick double-tap race that could show one praise while speaking another; its regression test is made deterministic with two seeded praises and an alternating `Math.random`, and fails without the guard. Verification: lint clean, all 7 pure verifiers pass, full `npm run test:e2e` **482/482** confirming no Phase 5 regression from the shared-framework changes. Deliberately left open by the controller's ruling: the 5-way `pickPraise`/`FALLBACK_PRAISE`/`getAnswerPieceState` glue duplication (architectural refactor crossing the Phase 5 acceptance boundary — recommended as a dedicated follow-up task), the short-landscape playfield reflow (explicit Phase 7/8 item), and all 7 Minor findings. Also still open and newly shown to cause suite flakes: `audioManager.speakAsync` has no TTS timeout guard. Full detail in `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-06.md`. |
