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
- [x] Words game content entries in `contentRegistry.ts`
- [x] Add words game to `App.tsx` game registry and home screen grid

### Syllable assembly game (new)
> Drag-and-drop mechanic: child sees shuffled syllable tiles and drags them into the correct order to form the word. Needs its own spec before implementation.

- [ ] Spec for syllable assembly game (`docs/superpowers/specs/`)
- [ ] Syllable assembly game component (`src/games/assembly/AssemblyGame.tsx`)
- [ ] Add assembly game to `App.tsx` game registry and home screen grid

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

---

## Phase 1 — Pre-launch

**Goal:** App is polished, instrumented, and ready to share publicly with other families. Slovak only, no accounts.

### 1.1 Mascot and Redesign
> Needs its own spec. Hard requirement before public launch.
> Open decisions: mascot artist (commissioned / AI-generated / self), art style (flat vector / hand-drawn / pixel), mascot prominence (home only vs. in-game reactions), redesign scope (full overhaul vs. targeted polish), new app name/branding?

- [ ] Decide on mascot art source and style
- [ ] Mascot design spec (`docs/superpowers/specs/`)
- [ ] Create / commission mascot assets
- [ ] Redesign home screen with mascot
- [ ] Redesign game screens (typography, colors, layout)
- [ ] Redesign Settings and ParentsGate screens
- [ ] Accessibility pass (BACKLOG AC1–AC3): keyboard nav, ARIA labels, emoji alt text

### 1.2 Content Configurability
> Needs its own spec. Stored in `localStorage` for now; must be designed for easy cloud migration in Phase 3.
> Open decisions: UX for adding a custom word (text input + syllable breakdown + emoji picker?), validation/guidance for syllable entry.

- [ ] Spec for content configurability (`docs/superpowers/specs/`)
- [ ] Modularize and expand `SettingsOverlay` into sections
- [ ] Alphabet game: letter enable/disable per-letter toggle (all 46, including accented)
- [ ] Word dictionary management: add/remove words with syllable breakdown and emoji
- [ ] Ensure `localStorage` schema is migration-ready for Phase 3 cloud sync
- [ ] Number/counting range sliders already implemented — integrate into new settings layout

### 1.3 Placeholder UI for Future Features
> Every placeholder tap fires an analytics event (requires 1.4 to be in place first).
> Open decision: "Notify me" email capture — yes/no? (Could use Tally/Typeform, no backend needed.)

- [ ] Design placeholder entry points (placement + copy) during redesign (1.1)
- [ ] Placeholder: Custom audio recording (in Settings, behind ParentsGate)
- [ ] Placeholder: Language selection (in Settings or onboarding)
- [ ] Placeholder: User account / sign in (in Settings or home screen)
- [ ] Each placeholder shows a "coming soon" or interest-capture screen on tap
- [ ] Each placeholder tap fires a named analytics event

### 1.4 Analytics
> Needs its own spec: platform choice + event taxonomy.
> Platform candidates: PostHog (self-hosted, strong product analytics), Plausible (privacy-first, no cookie banner, paid), Umami (self-hosted, simple), GA4 (free but GDPR overhead + cookie consent required).
> Recommendation: PostHog self-hosted on VPS, or Plausible — both GDPR-friendly without a cookie banner.
> GDPR note: app targets EU families with children — avoid platforms requiring cookie consent if possible.

- [ ] Spec: analytics platform decision + event taxonomy (`docs/superpowers/specs/`)
- [ ] Decide and set up analytics platform (PostHog / Plausible / Umami)
- [ ] Instrument screen views: HOME, GAME, SETTINGS, PARENTS_GATE
- [ ] Instrument game events: game_started, game_completed, answer_correct, answer_wrong (per game type)
- [ ] Instrument placeholder taps: feature_interest_tapped (custom_audio / language / account)
- [ ] Instrument settings events: music_toggled, range_changed, letter_toggled
- [ ] Verify event stream working in staging before launch

---

## Phase 2 — Public Launch

**Goal:** App live and accessible to other Slovak-speaking families. No accounts, localStorage settings only.

> Open decisions: domain (existing or new?), PWA (add-to-home-screen + offline — high value for tablet use), landing page vs. app-at-root, app store submission (out of scope for initial launch but worth noting).
> GDPR: privacy policy required before launch. Needs legal/compliance review — not purely an engineering task.

- [ ] Decide on domain and configure DNS
- [ ] Configure production static hosting (Vercel / Netlify — no backend needed yet)
- [ ] Write and publish privacy policy (GDPR-compliant, covers children's data)
- [ ] Evaluate and optionally implement PWA (service worker, offline caching, web app manifest)
- [ ] SEO: meta tags, Open Graph, page title/description for discoverability
- [ ] Landing page or app-at-root decision
- [ ] Smoke-test analytics in production
- [ ] Announce / share with first families

---

## Phase 3 — Post-launch Engagement

**Goal:** Hear from real users and build the account layer that unlocks cloud features.

### 3.1 Feedback Platform
> Needs research. Candidates: Canny (feature voting), Tally/Typeform (simple forms), Hotjar (session replay + surveys), Intercom (in-app messaging).
> Placement: behind ParentsGate only — feedback is for parents, not children.

- [ ] Evaluate and choose feedback platform
- [ ] Integrate feedback entry point in Settings (behind ParentsGate)
- [ ] Instrument feedback_opened event in analytics

### 3.2 Backend and Auth
> Needs its own spec. Firebase is leading candidate (Auth + Firestore + Storage + Functions, generous free tier). Alternatives: Supabase (open-source, Postgres), PocketBase (self-hosted), AWS Amplify.
> Auth providers: Google Sign-In (minimum), email+password; Apple Sign-In needed if iOS App Store ever targeted; anonymous/guest accounts TBD.
> Freemium gating mechanism: Firestore field + Firebase Functions server-side enforcement (client-side check alone is insufficient).
> Data model must account for: selected language, enabled letters, custom word dictionary, custom audio file refs, subscription status, (future) child profiles.

- [ ] Spec: backend platform choice, auth providers, data model, freemium gating (`docs/superpowers/specs/`)
- [ ] Set up Firebase project (or chosen alternative)
- [ ] Implement authentication (Google Sign-In + email/password as minimum)
- [ ] Implement user profile document in Firestore
- [ ] Migrate `localStorage` settings to cloud on first sign-in
- [ ] Implement freemium gating infrastructure (server-side subscription status check)
- [ ] Settings screen: sign in / sign out / account management UI (behind ParentsGate)
- [ ] Data deletion: users can delete account and all associated data (GDPR requirement)

---

## Phase 4 — Custom Audio (Premium Feature)

**Goal:** Parents record their own voice for any audio in the app — alphabet, syllables, words, phrases, praise.

> Needs its own spec (significant research required).
> Key research items:
> - Browser recording: Web Audio API + `MediaRecorder` — validate UX on iOS Safari (historically quirky)
> - Auto-trim: silence detection at start/end. Candidates: `Recorder.js`, `WebAudioRecorder`, custom `AnalyserNode`
> - File format: `.webm` (native) vs. `.mp3` (requires in-browser encoding via `lamejs` or server transcode)
> - Storage estimate: ~50–150 recordings × ~50 KB = 5–7 MB per user (well within Firebase free tier)
> - Premium boundary: recording custom audio = premium; basic configurability = free

- [ ] Spike: validate `MediaRecorder` + auto-trim on iOS Safari and Android Chrome
- [ ] Spec: custom audio recording UX, file format, storage, premium gating (`docs/superpowers/specs/`)
- [ ] Expand Settings into audio management sections (letters, syllables, words, phrases, praise)
- [ ] Per-entry UI: play current (custom or default), record new, delete custom
- [ ] Implement in-browser recording with auto-trim
- [ ] Upload to Firebase Storage; reference in user Firestore profile
- [ ] Update `audioManager` to check for custom recording first, then default file, then TTS
- [ ] Custom word audio: allow recording for user-added dictionary words
- [ ] Gate entire feature behind premium subscription check

---

## Phase 5 — Multi-language

**Goal:** Parents select a language for game content. Czech first, then English, French last.

> Needs its own spec: shared i18n architecture + per-language spec.
> Content curation is a significant non-engineering effort — needs a plan for who creates/validates Czech, English, and French content.
> English syllabification is more complex than Slovak CV-patterns — language-specific syllable strategy needed.
> UI language (game instructions, settings labels) should also be translated, not just game content.
> Default audio per language: TTS covers development; production quality requires recording or generation per language.
> Per-language custom audio must be accounted for in Phase 4 data model.

### Architecture
- [ ] Spec: i18n content architecture (`docs/superpowers/specs/`)
- [ ] Refactor `contentRegistry.ts` into per-language modules under `src/shared/content/sk/`, `cs/`, `en/`, `fr/`
- [ ] Define shared typed interface all language libraries must implement
- [ ] Implement `useLanguage()` context/hook for runtime language selection
- [ ] Restructure audio paths: `public/audio/{lang}/letters/`, `syllables/`, etc.
- [ ] Language selection UX: Settings screen or first-run onboarding flow (needs design decision)

### Czech (`cs`)
- [ ] Curate Czech alphabet, syllable word dictionary, number labels
- [ ] Record or generate default Czech audio files
- [ ] Validate content with a native Czech speaker

### English (`en`)
- [ ] Define English syllabification strategy (more complex than Slovak)
- [ ] Curate English alphabet, word dictionary, number labels
- [ ] Record or generate default English audio files
- [ ] Validate content with a native English speaker

### French (`fr`)
- [ ] Define French syllabification strategy
- [ ] Curate French alphabet, word dictionary, number labels
- [ ] Record or generate default French audio files
- [ ] Validate content with a native French speaker

---

## Phase 6 — Monetization

**Goal:** Sustainable revenue to fund continued development. Freemium model.

> Needs its own spec (begin when Phase 4 is underway).
> Payment provider: Stripe (leading candidate — strong SDK, EU subscriptions, handles VAT).
> Subscription model: monthly / annual / lifetime — annual + lifetime are common in children's education apps.
> App store consideration: iOS App Store / Google Play require in-app purchase (30% cut) — web-only avoids this.
> Pricing research needed: compare Duolingo for Kids, Lingokids, Khan Academy Kids.

**Proposed free tier:**
- All 5 games (alphabet, syllables, numbers, counting, words)
- Slovak language
- Basic configurability (letter enable/disable, number ranges)
- Default audio (files + TTS fallback)

**Proposed premium tier** (validate demand via Phase 1 placeholder analytics before finalizing):
- Custom audio recording
- Additional languages (Czech, English, French)
- Advanced word dictionary (add custom words + optional custom audio)
- Potentially: additional games, difficulty levels

### Deliverables
- [ ] Spec: subscription model, pricing, family plan, gating (`docs/superpowers/specs/`)
- [ ] Research pricing: comparable children's education app benchmarks
- [ ] Decide subscription tiers (monthly / annual / lifetime)
- [ ] Decide family plan structure (one sub per family vs. per-child)
- [ ] Set up Stripe account and products
- [ ] Implement checkout flow (web-based, avoids app store cut)
- [ ] Implement free trial if decided
- [ ] Store subscription status in Firestore, enforce server-side via Firebase Functions
- [ ] Graceful degradation: premium features locked but visible/discoverable when unsubscribed

---

## Cross-cutting Concerns

### Privacy and GDPR
> Legal/compliance review needed — not purely engineering. Must be resolved before Phase 2 (public launch).

- [ ] Privacy policy written and published (GDPR-compliant, covers children's data under 13)
- [ ] Determine if analytics platform requires cookie consent banner (Plausible/Umami: no; GA4: yes)
- [ ] Parental consent mechanism for account creation on behalf of a child (Phase 3)
- [ ] GDPR data deletion: account + all associated data removable on request (Phase 3)
- [ ] COPPA compliance review if English-speaking market is targeted (Phase 5)

### Performance and PWA
- [ ] Evaluate PWA: service worker, offline caching, web app manifest (Phase 2 decision)
- [ ] Audio preloading strategy as content library grows with multiple languages (Phase 5)
- [ ] Image/emoji asset optimization audit

### Accessibility
- [ ] **AC1** — Keyboard navigation (arrow keys, Enter, Space on game grids)
- [ ] **AC2** — ARIA labels on all game buttons
- [ ] **AC3** — Emoji text alternatives in SuccessOverlay
> Address during Phase 1 redesign.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | Option B roadmap: MVP launch first, then platform | Get real users before investing in backend; freemium upsell works better after free-tier discovery |
| 2026-04-05 | Content configurability moved to pre-launch (Phase 1) | App feels incomplete without it even at launch |
| 2026-04-05 | Analytics before public launch | Need baseline data from day one |
| 2026-04-05 | Feedback platform post-launch (Phase 3) | Needs real users to be meaningful |
| 2026-04-05 | French is last language | Lower priority vs. Czech and English |
| 2026-04-05 | Freemium model | Custom audio and multi-language as natural premium upsell |
| 2026-04-05 | Placeholder UI for unbuilt features in Phase 1 | Validate demand before building; track clicks via analytics |
| 2026-04-07 | GameDescriptor<T> pattern replaces ContentItem god object | ContentItem accumulated optional cross-game fields; descriptor pattern makes each game self-contained |
| 2026-04-07 | Words game mechanic: see syllabified word, tap emoji | Reading-focused; distinct from syllables game which shows the syllable and has child recognize it |
