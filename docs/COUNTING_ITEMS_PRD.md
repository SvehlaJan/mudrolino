# Product Requirements Document: Spočítaj Predmety (Counting Items Game)

## 1. Project Overview
**Spočítaj Predmety** is an interactive educational game designed to bridge the gap between visual quantity and abstract digits. Instead of hearing a number, children see a collection of objects (emojis) and must count them to identify the correct numerical representation.

## 2. Target Audience
- **Primary Users**: Preschoolers (3-6 years old) developing one-to-one correspondence skills.
- **Secondary Users**: Parents/Guardians who configure the counting range.

## 3. User Stories
- **As a child**, I want to see fun pictures like apples or stars and count them one by one.
- **As a child**, I want to find the number that matches how many things I see.
- **As a parent**, I want to start with small groups (1-5 items) so my child doesn't get overwhelmed.
- **As a parent**, I want to ensure the items are clearly separated so they are easy to count.

## 4. Functional Requirements

### 4.1 Core Gameplay
- **Visual Challenge**: The game displays a central "counting area" containing $N$ items.
- **Item Types**: Use a variety of child-friendly emojis (🍎, ⭐️, 🚗, 🐶, 🍦).
- **Layout Algorithm**: Items must be placed randomly within the counting area but **must not overlap**. This ensures each item is distinct and countable.
- **Objective**: The child counts the items and selects the matching digit from a grid of 4 options.
- **Interaction**:
  - Tapping the **correct** number triggers a success animation, celebratory audio, and a transition to the next round.
  - Tapping an **incorrect** number triggers a "try again" audio cue and visual feedback.
- **Auditory Reinforcement**: Upon a correct selection, the game should announce the number (e.g., "Tri!") to reinforce the link between the quantity and the name.

### 4.2 Counting Items Settings
- **Range Selection**: Shared or dedicated settings for the counting range:
  - **Presets**: 1-5, 1-10.
- **Item Variety**: Option to toggle between single item types (e.g., only apples) or mixed items.
- **Access Control**: Protected by the "Parents' Gate".

## 5. UI/UX Requirements
- **Clarity**: The counting area should have a clean background to make emojis pop.
- **Spacing**: Minimum distance between items to prevent counting errors.
- **Animation**: Items can have a subtle "float" animation to feel alive, but should stay in place while being counted.

## 6. Technical Requirements
- **Collision Detection**: A simple circle-based or grid-based collision check to ensure emojis don't overlap during generation.
- **Responsive Scaling**: The counting area and emoji size should scale based on the screen size (tablet vs. phone).
- **State Management**: Reuse the `numbersRange` setting or create a specific `countingRange`.

## 7. Safety & Privacy
- **Ad-Free**: No external links or advertisements.
- **Privacy**: No tracking of performance data.

## 8. Future Enhancements
- **Touch-to-Count**: Tapping an item marks it (e.g., with a checkmark) and plays the incremental count ("Jeden", "Dva"...) to help the child keep track.
- **Themed Levels**: Jungle theme (animals), Space theme (planets), etc.
