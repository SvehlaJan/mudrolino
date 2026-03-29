# Product Requirements Document: Hravá Abeceda (Alphabet Game)

## 1. Project Overview
**Hravá Abeceda** is an interactive, touch-first educational game designed to help preschool-aged children (3-6 years old) learn the Slovak alphabet. The game focuses on letter recognition through visual and auditory reinforcement in a safe, distraction-free environment.

## 2. Target Audience
- **Primary Users**: Preschoolers (3-6 years old) learning the alphabet.
- **Secondary Users**: Parents/Guardians who manage settings and monitor progress.

## 3. User Stories
- **As a child**, I want to tap on letters and hear how they sound so I can learn the alphabet.
- **As a child**, I want to be celebrated when I find the right letter so I feel encouraged to keep playing.
- **As a parent**, I want to ensure my child doesn't accidentally change settings or leave the game.
- **As a parent**, I want to be able to mute specific sounds (like background music) while keeping the educational voiceovers active.

## 4. Functional Requirements

### 4.1 Core Gameplay
- **Letter Selection**: The game displays a grid of 4 letters.
- **Objective**: The child is prompted (via voice and text) to find a specific target letter.
- **Interaction**:
  - Tapping the **correct** letter triggers a success animation, celebratory audio ("Výborne!"), and a transition to the next round.
  - Tapping an **incorrect** letter triggers a subtle "try again" audio cue and visual feedback (shake/bounce).
- **Infinite Loop**: The game continues indefinitely, cycling through the alphabet randomly to maintain engagement.

### 4.2 Audio System
- **Voiceovers**: Each letter has a corresponding audio file in `public/audio/letters/`. Files are named by `audioKey` (e.g. `a.mp3`, `s-caron.mp3` for Š). When a file is missing, the Web Speech API (`sk-SK`) is used as fallback.
- **Phrase announcements**: Composed from fragment clips in `public/audio/phrases/` (e.g. `najdi-pismeno.mp3` + letter clip = "Nájdi písmenko A", `toto-je-pismeno.mp3` + letter + `skus-to-znova.mp3` for wrong answers).
- **Praise Audio**: 6 praise variants in `public/audio/praise/` (e.g. `vyborne.mp3`, `skvela-praca.mp3`).
- **SFX**: Removed (not in scope).
- **Music**: Not yet implemented.

### 4.3 Parents' Gate (Security)
- **Access Control**: Access to the settings menu must be protected by a "Parents' Gate."
- **Mechanism**: A 3-second long-press on the settings icon.
- **Visual Feedback**: A progress indicator (ring or bar) must show the hold progress to the parent.

### 4.4 Settings & Configuration
- **Audio Toggles**: Independent controls for:
  - **Voice**: Enable/Disable letter pronunciations and praise.
  - **SFX**: Enable/Disable UI sound effects.
  - **Music**: Enable/Disable background ambiance.
- **Exit Game**: A clear way to return to the main menu from within the settings.

## 5. UI/UX Requirements
- **Touch Targets**: All buttons must be at least 80x80px to accommodate developing motor skills.
- **Visual Feedback**: Every tap must result in a visual change (scale, color shift, or animation).
- **Typography**: Use rounded, friendly fonts (e.g., Fredoka) with high legibility.
- **Color Palette**: Use vibrant, high-contrast colors that are visually stimulating but not overwhelming.
- **No Text-Heavy UI**: Minimize written instructions; rely on icons and audio cues for the child.

## 6. Technical Requirements
- **Responsive Design**: Must work flawlessly on tablets (iPad/Android) and mobile phones in portrait orientation.
- **Performance**: Transitions between letters must be near-instant (<100ms) to maintain a child's attention.
- **Offline Capability**: The app should ideally function without an active internet connection once assets are loaded.

## 7. Safety & Privacy
- **No Ads**: The application must be 100% ad-free.
- **No Data Collection**: No personal information from the child should be collected or transmitted.
- **Walled Garden**: The Parents' Gate ensures the child stays within the educational context.

## 8. Future Enhancements (Post-MVP)
- **Progress Tracking**: A simple dashboard for parents to see which letters the child struggles with.
- **Multiple Game Modes**: Matching uppercase to lowercase, or letters to objects (A for Auto).
- **Multi-language Support**: Expanding the alphabet and audio to other languages (English, German, etc.).
