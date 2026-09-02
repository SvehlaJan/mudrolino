# UI & UX Enhancements Design Specification

## Overview & Background

Following an exhaustive visual and runtime audit across all screens and mini-games in "Hravé Učenie" (desktop 1280×900 and mobile 390×844), several usability, ergonomic, and aesthetic opportunities were identified beyond the primary typography upgrade. 

This document defines the technical architecture and specifications for these remaining improvements:
1. **Counting Game Collision Avoidance & Interactive Taps** (`/counting`)
2. **Auditory Games Visual Audio Cue & Replay Affordance** (`/alphabet`, `/syllables`, `/numbers`)
3. **Mobile Vertical Ergonomics & Target Slot Contrast** (`/assembly`, `/first-letter`)
4. **Standardized `PromptBadge` & Word Tile Emoji Scaling** (`/first-letter`, `/complete-syllable`, `/words`)
5. **Parent Settings Slovak Localization Polish** (`/settings`)

---

## 1. Counting Game Collision Avoidance & Interactive Taps

### Problem
In `src/games/counting/CountingItemsGame.tsx`, items are randomly placed into a static 4×4 percentage grid. On wide/landscape viewports, the game container is broad but shallow (e.g. 2:1 aspect ratio), causing vertical row spacing to shrink to ~50–70px while emojis scale up to `text-8xl` (96px). Combined with random jitter, items frequently overlap directly on top of each other, impeding a child's ability to point and count.

### Design & Architecture
1. **Aspect-Aware Grid Calculation**:
   - Determine grid columns and rows based on container aspect ratio:
     - **Landscape / Desktop (ratio > 1.2)**: 5 columns × 2 or 3 rows.
     - **Portrait / Mobile (ratio <= 1.2)**: 3 columns × 4 rows.
   - Slot coordinates are computed with cell margins, and random jitter is bounded to `< 20%` of cell width/height, mathematically guaranteeing that bounding boxes never collide.
2. **Preschool Interactive Count-Tap Micro-interaction**:
   - Tapping an item triggers a brief playful pop (`scale-110 rotate-6` with quick spring return) and a soft tactile pop sound.
   - This supports preschool counting behavior (tapping objects one by one with a finger while counting aloud) without submitting an answer until the child selects a number tile at the bottom.

---

## 2. Auditory Games Visual Audio Cue & Replay Affordance

### Problem
In `src/shared/components/FindItGame.tsx`, games like **Abeceda**, **Slabiky**, and **Čísla** provide only an auditory prompt (`renderPrompt` returns null). If the initial sound is missed or device volume is low, the child sees only a static letter/number grid with no visual indication that a prompt was spoken or what task is expected.

### Design & Architecture
1. **`AuditoryPromptBadge` Component**:
   - In `FindItGame.tsx`, when `!descriptor.renderPrompt`, render a friendly `AuditoryPromptBadge` in the prompt area:
     - Displays an ear/speaker icon paired with animated soundwave bars.
     - While audio is playing, the bars actively pulse (`animate-pulse` or CSS equalizer animation).
     - Tapping the badge repeats the audio prompt.
2. **Replay Button Affordance**:
   - If the user has not interacted for > 4 seconds, the top-bar `Volume2` replay button initiates a gentle, non-intrusive wiggle/glow animation to remind the child that they can listen again.

---

## 3. Mobile Vertical Ergonomics & Target Slot Contrast

### Problem
1. On phone viewports (390×844) in `src/games/assembly/AssemblyGame.tsx`, the stimulus card and interactive tile containers are clumped in the top 45% of the screen, leaving ~380px of unused blank space at the bottom. Small children holding a phone cannot easily reach the tiles.
2. In `AssemblyGame.tsx`, empty target slots use `border-shadow/15` and `text-shadow/25`. Against the warm beige background, this renders faint taupe dashed lines and nearly invisible `?` marks.

### Design & Architecture
1. **Thumb-Reach Layout Distribution**:
   - Use `justify-between` with flexible vertical spacers on mobile:
     - The target prompt badge is positioned in the upper half.
     - The answer slot card and the tray tile card are anchored in the lower half (natural thumb-reach zone).
2. **High-Contrast Target Slots**:
   - Restyle empty answer slots with `border-primary/40` (dashed 3px) on a soft translucent card background (`bg-white/70`), with a crisp, readable placeholder mark (`text-text-main/40 font-black text-2xl`).

---

## 4. Standardized `PromptBadge` & Word Tile Emoji Scaling

### Problem
1. Visual inconsistency: in **Skladaj**, the prompt emoji is enclosed in an elevated rounded card (`min-w-[180px] !rounded-[32px] !shadow-block`). In **Prvé písmenko** and **Doplň slabiku**, the emoji floats bare directly on the page background without a container card.
2. In `src/games/words/wordsDescriptor.tsx`, tile emojis are scaled to `text-[clamp(2.25rem,7vw,5rem)]`. On mobile screens, `7vw` is only ~27px inside a 160px card, resulting in tiny icons surrounded by excessive empty whitespace.

### Design & Architecture
1. **Shared `PromptBadge` Primitive**:
   - Create `src/shared/ui/PromptBadge.tsx`:
     ```tsx
     interface PromptBadgeProps {
       children: React.ReactNode;
       ariaLabel?: string;
       className?: string;
     }
     ```
   - Renders a clean white card with uniform rounded corners (`rounded-[32px] sm:rounded-[44px]`), padding, and tactile block shadow (`shadow-block`).
   - Adopt uniformly across **Skladaj**, **Prvé písmenko**, **Doplň slabiku**, and **Doplň písmeno**.
2. **Word Tile Emoji Resizing**:
   - In `wordsDescriptor.tsx`, update emoji clamp to `text-[clamp(3.75rem,14vw,7rem)]`, nicely filling the card area.

---

## 5. Parent Settings Slovak Localization Polish

### Problem
In `src/avatar/AvatarCustomizationSettings.tsx`, shoes are localized into Slovak (`Bez topánok`, `Modré tenisky`), but top garments fall back to English labels from the 3D developer catalog (`No top`, `Blue t-shirt`, `Orange hoodie`).

### Design & Architecture
- Add a Slovak translation lookup table in `AvatarCustomizationSettings.tsx`:
  ```ts
  const topLabelById: Record<AvatarTopItemId, string> = {
    top_none: 'Bez trička',
    top_blue_tshirt_v1: 'Modré tričko',
    top_orange_hoodie_v1: 'Oranžová mikina',
  };
  ```
- Render `topLabelById[item.id]` so the entire Parent Settings experience is authentically Slovak.

---

## Verification Strategy

1. **Automated Verification**:
   - Run `npm run lint` for strict TypeScript checks.
   - Run `npm run build` to ensure all imports and assets bundle cleanly.
2. **Visual Playwright Testing**:
   - Capture desktop and mobile screenshots of:
     - `/counting`: verify no items overlap across 5 test rounds.
     - `/alphabet`: verify `AuditoryPromptBadge` displays and pulses.
     - `/assembly` (mobile): verify balanced vertical spacing and high-contrast target slots.
     - `/first-letter` & `/words`: verify standardized `PromptBadge` and enlarged word card emojis.
     - `/settings`: verify all avatar garment labels are in Slovak.
