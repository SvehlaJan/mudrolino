# UI & UX Enhancements Design Specification

## Overview & Background

Following an exhaustive visual and runtime audit across all screens and mini-games in "Hravé Učenie" (desktop 1280×900 and mobile 390×844) and an interactive design interview (/grill-me), several usability, ergonomic, and aesthetic opportunities were refined into concrete technical specifications.

This document defines the technical architecture and specifications for these 5 validated improvements:
1. **Counting Game Collision Avoidance & Interactive Taps** (`/counting`)
2. **Auditory Games Visual Audio Cue & Replay Affordance** (`/alphabet`, `/syllables`, `/numbers`)
3. **Mobile Vertical Ergonomics & Target Slot Contrast** (`/assembly`)
4. **Standardized `PromptBadge` & Word Tile Emoji Scaling** (`/first-letter`, `/complete-syllable`, `/assembly`, `/words`)
5. **Parent Settings Slovak Localization Polish** (`/settings`)

---

## 1. Counting Game Collision Avoidance & Interactive Taps

### Problem
In `src/games/counting/CountingItemsGame.tsx`, items are placed into a static 4×4 percentage grid with random offsets. On wide/landscape viewports, the game container is wide but shallow, shrinking vertical row spacing to ~50–70px while emojis scale up to `text-8xl` (96px). Combined with jitter, items frequently collide or overlap, hindering a child's ability to point and count. Furthermore, items are non-interactive `<div aria-hidden="true">` elements, which does not support natural preschool counting behaviors (touching items one by one while counting aloud).

### Design & Architecture
1. **Responsive CSS Grid Layout with Bounded Organic Jitter**:
   - Replace absolute percentage coordinates with a structured CSS grid inside the counting card:
     - **Portrait / Mobile**: 3 columns × 4 rows (12 total cells).
     - **Landscape / Desktop**: 5 columns × 3 rows (15 total cells).
   - Randomly select `count` occupied slots out of the available cells (leaving the rest empty) to create a natural, scattered distribution without clumping.
   - Inside each occupied cell, apply bounded random CSS transform variations (rotation ±15deg, translation offset ±8px to ±12px).
   - This mathematically guarantees zero collisions across cells via CSS grid gaps while maintaining a playful, organically scattered look.
2. **Interactive Preschool Count-Tap Micro-interaction**:
   - Turn each item into an interactive button.
   - Tapping an item triggers an ephemeral spring bounce (`scale-110 rotate-6` returning smoothly to base).
   - Audio feedback: Procedural Web Audio API bubble pop (a quick sine frequency sweep ~600Hz down to ~150Hz over 60ms with exponential decay). Instantaneous zero-latency feedback, 0 kB bundle size, works 100% offline without asset loading or network overhead.
   - Tapping is purely tactile feedback: it does not submit an answer or stamp numbers, preserving the child's autonomy to count aloud naturally until they choose an answer tile at the bottom.

---

## 2. Auditory Games Visual Audio Cue & Replay Affordance

### Problem
In `src/shared/components/FindItGame.tsx`, auditory games (**Abeceda**, **Slabiky**, **Čísla**) provide only spoken audio (`descriptor.renderPrompt` returns null). If the initial sound is missed or device volume is muted/low, the child sees only a static letter/number grid with no visual indication of what task is expected or that an audio cue was spoken.

### Design & Architecture
1. **Central `AuditoryPromptBadge` Component**:
   - When `!descriptor.renderPrompt`, `FindItGame.tsx` renders `AuditoryPromptBadge` in the central prompt area above the grid.
   - **Visual Presentation**:
     - Elevated card matching the game's playful tactile card style (`bg-white rounded-[28px] sm:rounded-[36px] shadow-block px-6 py-3 sm:px-8 sm:py-4`).
     - Centered speaker icon (`Volume2`) flanked by concentric soundwave ripple rings.
     - While audio is actively playing (tracked via `audioManager.play()` promise lifecycle), the concentric soundwave rings radiate and expand outwards. When playback finishes, they rest quietly.
   - **Interactive Affordance**:
     - Tapping the `AuditoryPromptBadge` replays the target item prompt audio (`descriptor.getReplayAudio(targetItem)` or `descriptor.getPromptAudio(targetItem)`).
     - Places the replay affordance directly in the child's primary line of sight.

---

## 3. Mobile Vertical Ergonomics & Target Slot Contrast

### Problem
1. In `src/games/assembly/AssemblyGame.tsx` on phone viewports (390×844), all cards (prompt card, answer slot card, tray tile card) cluster in the upper half of the screen, leaving ~300px of unused dead space at the bottom. Young children holding a phone cannot easily reach the interactive tiles.
2. In `AssemblyGame.tsx`, empty target slots use `border-shadow/15` and `text-shadow/25`. Against the warm beige background, this renders faint taupe dashed lines and nearly invisible `?` marks.

### Design & Architecture
1. **Mobile-Only Thumb-Reach Ergonomics**:
   - On mobile viewports (`< 640px` / phone viewports), structure the board container with flexible vertical spacing:
     - The target prompt badge sits comfortably in the upper visual zone.
     - A flexible spacer pushes the answer slot card and the syllable tray card down into the lower half of the screen, right in the natural thumb-reach zone.
   - On tablet and desktop viewports (`sm:` / `md:`), retain the balanced, centered vertical stacking.
2. **High-Contrast Target Slots**:
   - Restyle empty answer slots in `AnswerSlot`:
     - Dashed border: `border-primary/40` (dashed 3px).
     - Background: soft translucent white (`bg-white/70`).
     - Placeholder indicator: high-contrast, friendly question mark (`text-text-main/40 font-black text-2xl`).

---

## 4. Standardized `PromptBadge` & Word Tile Emoji Scaling

### Problem
1. Visual inconsistency across prompt-based games:
   - In **Skladaj** (`/assembly`), the prompt emoji is enclosed in an elevated rounded card.
   - In **Prvé písmenko** (`/first-letter`) and **Doplň slabiku** (`/complete-syllable`), the prompt emoji floats bare directly on the page background without a card container.
2. In `src/games/words/wordsDescriptor.tsx`, tile emojis are sized at `text-[clamp(2.25rem,7vw,5rem)]`. On mobile screens (390px viewport, 2 columns), `7vw` evaluates to ~27px inside a ~160px card, resulting in tiny emojis lost in excessive empty whitespace.

### Design & Architecture
1. **Shared `PromptBadge` UI Primitive**:
   - Create `src/shared/ui/PromptBadge.tsx`:
     ```tsx
     interface PromptBadgeProps {
       children: React.ReactNode;
       ariaLabel?: string;
       className?: string;
       onClick?: () => void;
     }
     ```
   - Renders a clean white tactile card with uniform rounded corners (`rounded-[32px] sm:rounded-[44px]`), padding, and tactile block shadow (`shadow-block`).
   - If `onClick` is provided, renders with interactive cursor and subtle press scaling (`active:scale-95 transition-transform`).
   - Export from `src/shared/ui/index.ts` and document in `/ui-kit`.
   - Adopt across **Skladaj** (`AssemblyGame`), **Prvé písmenko** (`FirstLetterGame`), and **Doplň slabiku** (`CompleteSyllableGame`).
   - **Tappable Prompt Replay**: Tapping the `PromptBadge` triggers prompt audio replay, enabling natural tap-to-listen interaction for toddlers.
2. **Word Tile Emoji Scaling**:
   - In `wordsDescriptor.tsx`, update the emoji clamp to `text-[clamp(3.75rem,14vw,7rem)]`, appropriately filling the choice tile.

---

## 5. Parent Settings Slovak Localization Polish

### Problem
In `src/avatar/AvatarCustomizationSettings.tsx`, shoes are localized into Slovak (`Bez topánok`, `Modré tenisky`), but top garments fall back to English labels from the 3D developer catalog (`No top`, `Blue t-shirt`, `Orange hoodie`).

### Design & Architecture
1. **Centralized Locale Dictionaries**:
   - Add avatar garment labels to the central locale definitions in `src/shared/locales/sk.ts`:
     ```ts
     export const AVATAR_TOP_LABELS: Record<string, string> = {
       top_none: 'Bez trička',
       top_blue_tshirt_v1: 'Modré tričko',
       top_orange_hoodie_v1: 'Oranžová mikina',
     };

     export const AVATAR_SHOES_LABELS: Record<string, string> = {
       shoes_none: 'Bez topánok',
       shoes_blue_sneakers_v1: 'Modré tenisky',
     };

     export const AVATAR_ACCESSORY_LABELS: Record<string, string> = {
       accessory_none: 'Bez doplnku',
       hat_red_cap_v1: 'Červená šiltovka',
     };
     ```
   - Add corresponding Czech definitions in `src/shared/locales/cs.ts`:
     - tops: `top_none`: 'Bez trička', `top_blue_tshirt_v1`: 'Modré tričko', `top_orange_hoodie_v1`: 'Oranžová mikina'
     - shoes: `shoes_none`: 'Bez bot', `shoes_blue_sneakers_v1`: 'Modré tenisky'
     - accessories: `accessory_none`: 'Bez doplňku', `hat_red_cap_v1`: 'Červená kšiltovka'
2. **Component Integration**:
   - In `src/avatar/AvatarCustomizationSettings.tsx`, look up labels from the centralized locale definitions for tops and shoes, completely eliminating hardcoded English developer labels in the UI.

---

## Verification Strategy

1. **Automated Verification**:
   - `npm run lint` (TypeScript + ESLint).
   - `npm run build` (production Vite build verification).
2. **Visual & Interaction Verification (Playwright)**:
   - Verify `/counting`: no overlapping items across mobile and desktop; item tap bounce animation and Web Audio pop trigger.
   - Verify `/alphabet` & `/syllables`: `AuditoryPromptBadge` displays, concentric soundwave rings radiate during prompt playback, and replays on tap.
   - Verify `/assembly`: mobile layout anchors interactive cards in lower thumb zone; empty answer slots display with crisp contrast.
   - Verify `/first-letter` & `/complete-syllable`: `PromptBadge` card cleanly wraps the target prompt and replays audio on tap; `/words` displays large emojis.
   - Verify `/settings`: all avatar garments display localized Slovak labels.
