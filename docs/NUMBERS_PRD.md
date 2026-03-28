# Product Requirements Document: Hravé Čísla (Numbers Game)

## 1. Project Overview
**Hravé Čísla** is an interactive educational game designed to help preschool-aged children (3-6 years old) learn to recognize and identify numbers. Following the successful model of the Alphabet game, it uses visual and auditory reinforcement to build early numeracy skills in a safe, engaging environment.

## 2. Target Audience
- **Primary Users**: Preschoolers (3-6 years old) learning to count and recognize digits.
- **Secondary Users**: Parents/Guardians who configure the difficulty level (number range).

## 3. User Stories
- **As a child**, I want to tap on numbers and hear them spoken so I can learn to count.
- **As a child**, I want to play with numbers that I already know, and slowly learn bigger ones.
- **As a parent**, I want to limit the game to numbers 1-5 initially, and then expand to 1-10 or 1-20 as my child progresses.
- **As a parent**, I want a separate settings area for the numbers game to customize the learning experience.

## 4. Functional Requirements

### 4.1 Core Gameplay
- **Number Selection**: The game displays a grid of 4 numbers.
- **Objective**: The child is prompted (via voice and text) to find a specific target number.
- **Interaction**:
  - Tapping the **correct** number triggers a success animation, celebratory audio ("Výborne!"), and a transition to the next round.
  - Tapping an **incorrect** number triggers a subtle "try again" audio cue and visual feedback.
- **Dynamic Range**: The numbers shown in the grid are randomly selected from the range defined in the settings.

### 4.2 Audio System
- **Voiceovers**: High-quality audio files for numbers (initially 0-20, expandable to 100).
- **Praise Audio**: Consistent with the Alphabet game for a unified experience.
- **SFX & Music**: Shared assets with the main application to maintain brand identity.

### 4.3 Numbers Game Settings
- **Range Selection**: A dedicated interface for parents to set the active number range:
  - **Presets**: 1-5, 1-10, 1-20.
  - **Custom Range**: Ability to set a custom "Start" and "End" number (e.g., 10-20 for focusing on teens).
- **Difficulty Scaling**: Option to increase the grid size (e.g., from 4 to 6 numbers) for older children.
- **Access Control**: Protected by the same "Parents' Gate" (3-second hold) as the main settings.

## 5. UI/UX Requirements
- **Consistency**: The visual language (colors, button shapes, animations) must match the Alphabet game.
- **Number Styling**: Use clear, bold, and non-stylized digits to avoid confusion (e.g., a clear '4' and '7').
- **Feedback**: Immediate visual and auditory response to every touch.

## 6. Technical Requirements
- **Asset Management**: Efficient loading of number audio files.
- **State Persistence**: The selected number range should be saved locally so it persists between sessions.
- **Modular Design**: The game logic should be a reusable component similar to `AlphabetGame.tsx`.

## 7. Safety & Privacy
- **Ad-Free**: No external links or advertisements.
- **Privacy**: No tracking of specific number performance data outside the local device.

## 8. Future Enhancements
- **Counting Mode**: Instead of just digits, show a number of objects (e.g., 3 apples) for the child to count.
- **Simple Addition**: Introduction to basic math (1 + 1 = ?).
- **Multi-language**: Support for counting in English, Spanish, etc.
