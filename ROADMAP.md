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

**Goal:** Share a useful, local-first Slovak app with trusted friends quickly. No accounts, no payments, no public marketing launch. UX review continues in parallel and only release-blocks if it finds child-flow or parent-settings problems.

### 1.1 Release Readiness
> Focus on confidence for a small private audience, not full public-launch polish.

- [~] UX review in progress in parallel
- [ ] Apply critical UX findings from review
- [ ] Run a full smoke test on phone and desktop/tablet: home, all games, settings, custom content, recording, feedback, avatar flag on/off
- [ ] Verify production build and deploy target
- [ ] Configure `VITE_WEB3FORMS_KEY` for private feedback collection
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
- [ ] Harden custom content validation and empty states for Words/Syllables/Assembly
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
- [ ] Verify feedback submissions from deployed private build

### 1.5 Avatar Companion and Customization
> Specs exist in `docs/superpowers/specs/2026-04-19-avatar-companion-design.md` and `docs/superpowers/specs/2026-04-21-avatar-staged-poc-design.md`. The historical Meshy character and cleaned animations proved the React Three Fiber runtime and Blender cleanup path, but the app-facing runtime has moved to the modular male base at `public/avatar/modular/male-base-modular.glb`. Old `public/avatar/meshy` POC GLBs are no longer current published assets; related source/provenance remains under `meshy_output/`.

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
- [x] Publish the current app-facing avatar asset at `public/avatar/modular/male-base-modular.glb`
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

---

## Phase 2 — Public Launch

**Goal:** Move from trusted-friend sharing to a public Slovak web launch after feedback and privacy basics are handled. Still no accounts or payments.

> Open decisions: domain, PWA, landing page vs. app-at-root, analytics, and how much of the UX review must be applied before public sharing.

- [ ] Synthesize friend feedback into launch blockers vs. later improvements
- [ ] Decide on domain and configure DNS
- [ ] Configure production static hosting if the friends-first deployment is not the final host
- [ ] Write and publish privacy policy (GDPR-compliant, covers children and local microphone/audio storage)
- [ ] Decide whether to use analytics for public launch
- [ ] If analytics is adopted, choose privacy-friendly platform and verify no cookie banner is needed
- [ ] Evaluate and optionally implement PWA: manifest, installability, offline caching for app shell/audio/avatar assets
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
- [ ] Evaluate PWA: service worker, offline caching, web app manifest (Phase 2 decision)
- [ ] Audio/avatar preloading strategy as content library and 3D assets grow
- [ ] Avatar bundle-size and mobile performance audit
- [ ] Image/emoji asset optimization audit

### Accessibility
- [ ] **AC1** — Keyboard navigation (arrow keys, Enter, Space on game grids)
- [x] **AC2** — ARIA labels on icon-only/game buttons
- [x] **AC3** — Emoji text alternatives in SuccessOverlay/session feedback
> Re-check during UX review; AC1 remains deferred because the primary target is preschool touch use.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
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
