# 🌈 Hravá Abeceda (Playful Alphabet)

Hravá Abeceda is a vibrant, interactive educational application designed for preschoolers to learn the Slovak alphabet through play. Built with a focus on accessibility, safety, and engaging feedback, it provides a delightful learning environment for children while offering robust controls for parents.

## 🚀 Features

### 🎮 Interactive Learning
- **Alphabet Game**: A core game loop where children identify letters.
- **Audio Feedback**: Every letter is voiced, providing auditory reinforcement.
- **Positive Reinforcement**: Celebratory success screens with dynamic animations and praise audio.
- **Tactile UI**: Oversized, bouncy buttons designed for small fingers and touch devices.

### 🛡️ Safety & Parental Controls
- **Parents' Gate**: A secure "hold-to-enter" mechanism (3-second hold) prevents children from accidentally accessing settings.
- **Settings Zone**: Granular control over audio channels:
  - **Voice**: Toggle letter pronunciations and praise.
  - **SFX**: Toggle interface sounds and feedback effects.
  - **Music**: Toggle background ambiance.

### 🎨 Visual Design
- **Kid-Friendly Typography**: Uses the "Fredoka" font for maximum legibility and a friendly feel.
- **Vibrant Palette**: A carefully selected set of high-contrast, playful colors.
- **Dynamic Animations**: Powered by `motion/react` for smooth transitions and "juicy" interactive feedback.

## 🛠️ Technical Implementation

### Core Stack
- **Framework**: [React 18+](https://reactjs.org/) with [Vite](https://vitejs.dev/) for lightning-fast development and optimized builds.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety and robust component interfaces.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, responsive design system.
- **Animations**: [motion/react](https://www.framer.com/motion/) (Framer Motion) for complex layout animations and physics-based interactions.
- **Icons**: [Lucide React](https://lucide.dev/) for consistent, scalable iconography.

### Architecture
- **State Management**: Uses React's `useState` and `useCallback` for efficient local state handling and stabilized event handlers.
- **Audio System**: A custom `audioManager` service that handles:
  - Pre-loading of assets.
  - Independent volume/toggle control for different audio categories.
  - Dynamic path resolution for letter sounds.
- **Responsive Layout**: Mobile-first approach ensuring the app looks great on tablets and phones.

### Key Components
- `App.tsx`: The main orchestrator handling screen transitions and global settings.
- `AlphabetGame.tsx`: Implements the game logic, grid generation, and success states.
- `ParentsGate.tsx`: A specialized security component using `setInterval` and `useEffect` for precise hold-timing.
- `SettingsOverlay.tsx`: A modal-based UI for parental configurations.

## 📦 Installation & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Lint the project**:
   ```bash
   npm run lint
   ```

## 🌍 Localization
The application is currently localized in **Slovak (SK)**, including all UI text and audio assets.

---
*Built with ❤️ for the next generation of learners.*
