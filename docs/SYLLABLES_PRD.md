# Product Requirements Document: Hravé Slabiky (Syllables Game)

## 1. Project Overview
**Hravé Slabiky** is an interactive educational game designed to help children (4-7 years old) practice syllable recognition and basic reading skills in Slovak. Building upon the mechanics of the Alphabet Game, it introduces more complex phonetic units (syllables) to bridge the gap between letter recognition and word reading.

## 2. Target Audience
- **Primary Users**: Children (4-7 years old) transitioning from letters to words.
- **Secondary Users**: Parents/Guardians who manage settings and monitor progress.

## 3. User Stories
- **As a child**, I want to hear syllables and find them in a grid so I can learn how to read.
- **As a child**, I want to see friendly animations and hear praise when I pick the right syllable.
- **As a parent**, I want to ensure the game is focused and doesn't have distracting ads or complex menus.
- **As a parent**, I want to be able to exit to the main dashboard easily through the secure Parents' Gate.

## 4. Functional Requirements

### 4.1 Core Gameplay
- **Syllable Selection**: The game displays a grid of **6 syllables** (3x2 or 2x3 layout).
- **Objective**: The child is prompted (via voice and text) to find a specific target syllable (e.g., "Nájdi slabiku MA").
- **Interaction**:
  - Tapping the **correct** syllable triggers a success animation, celebratory audio ("Výborne!", "Skvelé!"), and a transition to the next round.
  - Tapping an **incorrect** letter triggers auditory feedback ("Toto je slabika [X]. Skús to znova.") and a visual shake animation.
- **Infinite Loop**: The game continues indefinitely, randomly selecting from a predefined list of common Slovak syllables (MA, TA, SE, LI, DO, etc.).

### 4.2 Audio System
- **Voiceovers**: High-quality Slovak pronunciations for all included syllables.
- **Praise Audio**: Positive reinforcement sounds for correct answers.
- **Music**: Gentle background music (can be toggled in settings).

### 4.3 Parents' Gate (Security)
- **Access Control**: Access to the settings menu is protected by a 3-second long-press on the settings icon.
- **Visual Feedback**: A progress ring shows the hold progress.

### 4.4 Settings & Configuration
- **Audio Toggles**: Independent control for background music.
- **Exit Game**: A clear way to return to the main menu from within the settings.

## 5. UI/UX Requirements
- **Grid Layout**: A clear 6-item grid (e.g., 2 columns x 3 rows) with large touch targets.
- **Touch Targets**: Minimum 80x80px for easy interaction.
- **Typography**: Large, clear, rounded font for maximum legibility of syllables.
- **Visual Feedback**: Scale and color changes on tap.

## 6. Technical Requirements
- **Responsive Design**: Optimized for both tablets and mobile phones.
- **Performance**: Instant transitions and audio playback.
- **State Management**: Randomization logic to ensure variety in every round.

## 7. Safety & Privacy
- **No Ads**: 100% ad-free environment.
- **No Data Collection**: No personal information is stored or transmitted.

## 8. Future Enhancements (Post-MVP)
- **Word Building**: Combining syllables to form simple words.
- **Difficulty Levels**: Increasing the number of choices or using more complex syllables (e.g., TRN, STR).
- **Custom Syllable Lists**: Allowing parents to select which syllables to practice.
