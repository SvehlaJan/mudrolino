# Productization Roadmap — Design Spec
**Date:** 2026-04-05

## Overview

"Hravé Učenie" started as a personal Slovak-language preschool learning app. This document is a high-level product roadmap for turning it into a publicly available, multi-language educational platform. The roadmap is structured in six phases, each building on the previous. Every phase beyond Phase 0 will require its own detailed spec and implementation plan before work begins.

---

## Current State

- React + TypeScript + Vite, statically hosted (no backend)
- 4 mini-games: Alphabet, Syllables, Numbers, Counting
- Content registry in `contentRegistry.ts` — Slovak only
- Audio: pre-recorded `.mp3` files + Web Speech API (TTS) fallback
- Settings persisted to `localStorage` (music toggle, number/counting ranges)
- No user accounts, no analytics, no backend

---

## Phase 0 — Finish It

**Goal:** Feature-complete for personal use. No new architecture — purely content, games, and bug fixes.

### Deliverables

1. **Syllables success echo update** — success screen should show the source word with hyphens between syllables (e.g. "ja-ho-da") instead of the plain word. Small change to `SuccessOverlay.tsx`.

2. **Words game** — new mini-game where a picture of a word is shown and announced, and the child picks the correct written (syllabified) word from 3 card options. Needs its own spec. Key design questions to resolve:
   - Card display: syllabified word only, or word + emoji?
   - Audio prompt: word name only, or "find the word [X]"?
   - Does it reuse `WORD_ITEMS` from the syllables dictionary, or needs its own content set?

3. **Backlog bug fixes and polish** — from `docs/BACKLOG.md`:
   - B1: Music toggle has no effect
   - B3: Confetti animates infinitely in background
   - B4: `startNewRound` infinite loop edge case
   - H2: No error boundaries
   - H3: Alphabet game too few distractors guard
   - H5: Missing diacritical letters in syllables (ň, š, ž, etc.)
   - F1: No progress/round counter
   - F3: No difficulty setting for Alphabet/Syllables
   - F4: Counting game shows options before child counts
   - F7: Mobile safe-area padding missing

---

## Phase 1 — Pre-launch

**Goal:** App is polished, discoverable, and instrumented enough to share publicly with other families.

### 1.1 Mascot and Redesign

A visual character (mascot) that children can relate to. Hard requirement before public launch.

**Open questions / needs design:**
- Who creates the mascot art? (Commissioned illustrator, AI-generated, or user does it themselves?)
- Art style: flat vector, hand-drawn, pixel? Should match the playful, preschool tone.
- How prominent is the mascot? Home screen only, or present throughout all games (e.g. reacting to correct/wrong answers)?
- What is the scope of the redesign beyond the mascot? Full visual overhaul (colors, typography, layout) or targeted polish?
- Does the redesign include a new app name or branding?

**Needs its own spec.**

### 1.2 Content Configurability

Parents should be able to customize what content appears in games, stored in `localStorage` (no accounts yet).

**Scope:**
- **Alphabet game**: enable/disable individual letters (e.g. turn off all accent letters for younger children)
- **Word dictionary**: add/remove words (with syllable breakdown and emoji) used in syllables and words games
- **Settings screen** needs to be expanded and modularized to support these controls

**Open questions / needs design:**
- What is the UX for adding a custom word? (Text input for word + syllable breakdown + emoji picker?)
- Validation: how do we guide parents to enter correct syllable breakdowns?
- Are number/counting range sliders (already implemented) considered part of configurability? (Yes — they exist and should be included in the same redesigned settings section.)
- When accounts are added in Phase 3, these local preferences will need to migrate to the cloud. Design the localStorage schema with that migration in mind.

**Needs its own spec.**

### 1.3 Placeholder UI for Future Features

Before features exist, add visible (but disabled/teaser) UI entry points in the app with click tracking to measure demand.

**Features to placeholder:**
- Custom audio recording (in Settings)
- Language selection (in Settings or onboarding)
- User account / sign in (in Settings or home screen)

**Implementation:**
- Tapping a placeholder shows a brief "coming soon" message or a simple interest-capture screen ("Notify me when this is ready" — email or just a counter)
- Every tap on a placeholder fires an analytics event (see 1.4)

**Open questions:**
- "Notify me" email capture: yes or no? Simple and high value, but requires a lightweight backend (can be a simple form service like Tally or Typeform posting to a spreadsheet — no need for full backend).
- Exact placement and labeling of placeholders (needs design decisions during redesign).

### 1.4 Analytics

Integrate analytics before launch so baseline data exists from day one.

**What to track (minimum):**
- Page/screen views (HOME, GAME, SETTINGS, PARENTS_GATE)
- Game started / game completed / wrong answer / correct answer (per game type)
- Placeholder feature button taps (custom audio, language, account)
- Settings changed (music toggle, range changes, letter enable/disable)
- Session duration

**Open questions / needs research:**
- **Platform choice**: needs evaluation. Candidates:
  - **PostHog** (open-source, self-hostable on VPS, strong product analytics, free tier)
  - **Plausible** (privacy-first, GDPR-friendly, simple, no cookie consent needed, paid)
  - **Google Analytics 4** (free, powerful, but GDPR overhead and cookie consent banner required for EU users)
  - **Umami** (open-source, self-hostable, simple, privacy-first)
  - Recommendation leans toward **PostHog** (self-hosted) or **Plausible** — GDPR compliance is important for a European children's app targeting families.
- **GDPR / cookie consent**: app targets EU families with children. Privacy regulations apply. Need to determine if chosen analytics platform requires a cookie consent banner (Plausible/Umami do not; GA4 does).
- **Event taxonomy**: define a consistent naming convention for all tracked events before implementation.

**Needs its own spec (analytics platform decision + event taxonomy).**

---

## Phase 2 — Public Launch

**Goal:** App is live and accessible to other families. Slovak only, no accounts.

### Deliverables
- All Phase 0 and Phase 1 items complete
- Production deployment configured (domain, HTTPS, CDN)
- Analytics confirmed working

**Open questions:**
- **Domain/hosting**: what domain? Is there an existing domain? Static hosting on Vercel/Netlify continues to be appropriate — no backend yet.
- **PWA**: should the app be installable as a Progressive Web App (add to home screen, offline support)? High value for a children's app used on tablets. Needs evaluation.
- **SEO/discoverability**: landing page with app description? Or just the app itself at the root?
- **App stores**: Web-only for now, or submit as a PWA to Google Play / App Store? Out of scope for initial launch but worth noting.

---

## Phase 3 — Post-launch Engagement

**Goal:** Hear from real users and add the account layer that enables cloud features.

### 3.1 Feedback Platform

Integrate a user feedback mechanism accessible from within the app.

**Open questions / needs research:**
- **Platform choice**: candidates include Canny (feature voting), Tally/Typeform (simple forms), Hotjar (session replay + surveys), Intercom (in-app messaging). Choice depends on what kind of feedback is most valuable (bug reports vs. feature requests vs. open-ended).
- Where in the UI does the feedback entry point live? (Settings screen, floating button, post-session prompt?)
- Target audience is parents (not children) — feedback UI should only be accessible behind the ParentsGate.

### 3.2 Backend and Auth

Introduce Firebase (or evaluated equivalent) as the platform backend.

**Open questions / needs research:**
- **Platform evaluation**: Firebase is the leading candidate (Auth + Firestore + Storage + Functions in one SDK, generous free tier, battle-tested). Alternatives worth briefly considering: Supabase (open-source, Postgres-based, self-hostable), AWS Amplify, PocketBase (self-hosted). Decision needs a brief spike/research doc.
- **Auth providers**: which login methods? At minimum: Google Sign-In (frictionless for most parents), email+password. Apple Sign-In required if app ever goes to iOS App Store. Anonymous (guest) accounts for users who don't want to sign up?
- **Data model**: user profile needs to store at minimum — selected language, enabled letters, custom word dictionary entries, custom audio file references, subscription status.
- **Settings migration**: on first sign-in, existing `localStorage` settings should be migrated to the user's cloud profile.
- **Freemium gating infrastructure**: needs to be designed before premium features are built. What's the mechanism — Firestore field checked client-side, or Firebase Functions enforcing it server-side?

**Needs its own spec.**

---

## Phase 4 — Custom Audio (Premium Feature)

**Goal:** Parents can record their own voice for any audio in the app — alphabet, syllables, words, phrases, praise.

### Scope
- Expanded Settings section (behind ParentsGate) showing all recordable audio categories
- For each entry: play current recording (custom or default), record a new one, delete custom (revert to default)
- Custom recordings uploaded to Firebase Storage, referenced in user profile
- Audio playback in `audioManager` checks for custom recording first, falls back to default file, then TTS

### Open questions / needs research
- **Browser-based recording**: Web Audio API + `MediaRecorder` — well-supported in modern browsers. Needs a spike to validate UX on mobile (iOS Safari has historically had quirks).
- **Auto-trim**: silence detection at start/end of recording. Libraries to evaluate: `Recorder.js`, `WebAudioRecorder`, or a custom implementation using `AnalyserNode`. Needs research.
- **File format**: `.webm` (native `MediaRecorder` output) vs. `.mp3` (requires encoding in-browser via `lamejs` or server-side transcode). Decision affects storage size and compatibility.
- **Storage costs**: Firebase Storage has a free tier (5 GB). Estimate: a full custom audio set (all letters + syllables + words + phrases + praise) is likely 50–150 recordings × ~50 KB each = ~5–7 MB per user. Very manageable.
- **Scope of recordable content**: should users be able to record custom word names for words they add to the dictionary? Likely yes, but needs UX design.
- **Premium gating**: exactly which features are free vs. premium? Proposed boundary: recording custom audio = premium; basic content configurability (letter enable/disable) = free.

**Needs its own spec (significant research required).**

---

## Phase 5 — Multi-language

**Goal:** Parents can select a language for the app content. Czech first, then English, French last.

### Architecture

The content registry must evolve from a single Slovak source of truth to a per-language content library. The `ContentItem` type and `WORD_ITEMS` dictionary will need a language dimension.

**Proposed structure:**
```
src/shared/content/
  sk/   — Slovak (current contentRegistry.ts, refactored)
  cs/   — Czech
  en/   — English
  fr/   — French
```

Each language library exports the same typed interface. A `useLanguage()` hook (or context) selects the active library at runtime.

**Audio files:**
```
public/audio/sk/letters/a.mp3
public/audio/cs/letters/a.mp3
public/audio/en/letters/a.mp3
```

**Open questions / needs design:**
- **Content curation**: who creates/curates Czech, English, and French content (words, syllable breakdowns, emojis)? This is a significant content production effort, not just an engineering task.
- **UI language vs. content language**: are the UI labels (game instructions, settings labels) also translated, or only the game content? Likely both, but needs decision.
- **Syllable rules differ by language**: Slovak CV-pattern syllables work differently from English. English syllabification is far more complex. Needs a language-specific syllable strategy.
- **Audio production**: default audio files need to be recorded or generated for each language. TTS fallback covers development but may not be acceptable for production quality.
- **Language selection UX**: where does the parent select language? Settings screen, or a first-run onboarding flow?
- **Per-language custom audio**: custom audio recordings (Phase 4) are language-specific. Data model must account for this.

**Needs its own spec per language, plus a shared i18n architecture spec.**

---

## Phase 6 — Monetization

**Goal:** Sustainable revenue to fund continued development.

### Model: Freemium

**Free tier (proposed):**
- All 5 games (including words game)
- Slovak language
- Basic content configurability (letter enable/disable, number ranges)
- Default audio (files + TTS fallback)

**Premium tier (proposed — to be validated by placeholder analytics):**
- Custom audio recording
- Additional languages (Czech, English, French)
- Advanced word dictionary management (add custom words)
- Potentially: additional games, difficulty levels

### Open questions / needs research
- **Payment provider**: Stripe is the natural choice (excellent SDK, supports subscriptions, EU-friendly). Needs evaluation for Slovak/EU tax implications.
- **Subscription model**: monthly vs. annual vs. lifetime one-time purchase? Annual + lifetime are common in children's education apps.
- **Family plan**: single subscription covers multiple child profiles? Or per-child? Needs UX design.
- **Free trial**: offer a trial period for premium to reduce friction?
- **Firebase integration**: subscription status stored in Firestore, validated server-side via Firebase Functions to prevent client-side spoofing.
- **App store payments**: if the app is ever submitted to iOS App Store or Google Play, Apple/Google take 30% and require in-app purchase — significant revenue impact. Web-only avoids this.
- **Pricing research**: what do comparable children's education apps charge? (e.g. Duolingo for Kids, Lingokids, Khan Academy Kids models.)

**Needs its own spec when Phase 4 is underway.**

---

## Cross-cutting Concerns

### Privacy and GDPR
The app targets EU families with children under 13. This triggers GDPR and potentially COPPA (if targeting English-speaking users). Key obligations:
- Privacy policy required before public launch
- Cookie/tracking consent if using analytics that set cookies
- Parental consent mechanism for any account creation on behalf of a child
- Data deletion: users must be able to delete their account and all associated data

**This needs legal/compliance review. Not a purely engineering task.**

### Accessibility
Several open backlog items (AC1–AC3: keyboard navigation, ARIA labels, emoji alternatives). These should be addressed as part of the Phase 1 redesign, not deferred.

### Performance / PWA
A children's tablet app needs to feel snappy. Consider:
- Service worker + offline caching (PWA) — high value for households with unreliable internet
- Audio preloading strategy as the content library grows with multiple languages
- Image/emoji asset optimization

---

## Phase Summary

| Phase | Goal | Key Output | Notable Unknowns |
|-------|------|-----------|-----------------|
| 0 | Feature complete | Words game, bug fixes | Words game spec needed |
| 1 | Pre-launch ready | Redesign, configurability, analytics, placeholders | Mascot artist, analytics platform, GDPR approach |
| 2 | Public launch | Live app, Slovak only | Domain, PWA decision |
| 3 | Engagement + accounts | Firebase backend, feedback platform | Backend platform choice, auth providers |
| 4 | Custom audio (premium) | In-browser recording, Firebase Storage | MediaRecorder mobile quirks, file format, auto-trim |
| 5 | Multi-language | Czech, English, French content libraries | Content curation, syllable strategy per language |
| 6 | Monetization | Stripe subscriptions, premium gating | Pricing, family plan, app store strategy |
