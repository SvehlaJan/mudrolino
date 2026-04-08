/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Play,
  Gamepad2,
  Type,
  Apple,
  BookOpen
} from 'lucide-react';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { Screen, GameSettings, GameId, GameMetadata } from './shared/types';
import { ParentsGate } from './shared/components/ParentsGate';
import { SettingsOverlay } from './shared/components/SettingsOverlay';
import { AlphabetSettingsOverlay } from './games/alphabet/AlphabetSettingsOverlay';
import { SyllablesSettingsOverlay } from './games/syllables/SyllablesSettingsOverlay';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AlphabetGame } from './games/alphabet/AlphabetGame';
import { SyllablesGame } from './games/syllables/SyllablesGame';
import { NumbersGame } from './games/numbers/NumbersGame';
import { CountingItemsGame } from './games/counting/CountingItemsGame';
import { WordsGame } from './games/words/WordsGame';

type SettingsSource = 'home' | 'alphabet' | 'syllables';

type GameRenderProps = {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: (source?: SettingsSource) => void;
};

const GAME_RENDERERS: Record<GameId, (props: GameRenderProps) => ReactNode> = {
  ALPHABET: ({ settings, onExit, onOpenSettings }) => (
    <AlphabetGame settings={settings} onExit={onExit} onOpenSettings={() => onOpenSettings('alphabet')} />
  ),
  SYLLABLES: ({ settings, onExit, onOpenSettings }) => (
    <SyllablesGame settings={settings} onExit={onExit} onOpenSettings={() => onOpenSettings('syllables')} />
  ),
  NUMBERS: ({ settings, onExit, onOpenSettings }) => (
    <NumbersGame range={settings.numbersRange} onExit={onExit} onOpenSettings={onOpenSettings} />
  ),
  COUNTING_ITEMS: ({ settings, onExit, onOpenSettings }) => (
    <CountingItemsGame range={settings.countingRange} onExit={onExit} onOpenSettings={onOpenSettings} />
  ),
  WORDS: ({ onExit, onOpenSettings }) => (
    <WordsGame onExit={onExit} onOpenSettings={onOpenSettings} />
  ),
};

const GAMES: GameMetadata[] = [
  {
    id: 'ALPHABET',
    title: 'Abeceda',
    description: 'Spoznávaj písmenká hravou formou',
    icon: <Type size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-primary',
  },
  {
    id: 'SYLLABLES',
    title: 'Slabiky',
    description: 'Spájaj písmenká do slabík',
    icon: <Gamepad2 size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-success',
  },
  {
    id: 'NUMBERS',
    title: 'Čísla',
    description: 'Počítaj s kamarátmi',
    icon: <Play size={48} className="sm:w-16 sm:h-16 ml-2" fill="currentColor" />,
    color: 'bg-accent-blue',
  },
  {
    id: 'COUNTING_ITEMS',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: <Apple size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
  },
  {
    id: 'WORDS',
    title: 'Slová',
    description: 'Prečítaj slovo a nájdi obrázok',
    icon: <BookOpen size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
  },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [settingsSource, setSettingsSource] = useState<SettingsSource>('home');

  // Sync settings with AudioManager
  useEffect(() => {
    audioManager.updateSettings(settings);
    saveSettings(settings);
  }, [settings]);

  // Audio unlocker for browsers that require a user gesture
  useEffect(() => {
    const unlockAudio = () => {
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const handleGameSelect = useCallback((gameId: GameId) => {
    setActiveGame(gameId);
    setScreen('GAME');
  }, []);

  const handleOpenSettings = useCallback((source: SettingsSource = 'home') => {
    setSettingsSource(source);
    setScreen('PARENTS_GATE');
  }, []);

  const handleExitGame = useCallback(() => {
    setScreen('HOME');
  }, []);

  const handleGateSuccess = useCallback(() => {
    setScreen('SETTINGS');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setScreen(settingsSource === 'home' ? 'HOME' : 'GAME');
  }, [settingsSource]);

  const renderLauncher = () => (
    <div className="min-h-screen relative bg-bg-light flex flex-col p-6 sm:p-12">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-16 sm:mb-24">
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl sm:text-7xl font-black text-text-main tracking-tight leading-none">Hravé Učenie</h1>
            <p className="text-xl sm:text-3xl font-medium opacity-50">Vyber si hru a poďme na to!</p>
          </div>

          <button
            onClick={() => handleOpenSettings()}
            className="w-16 h-16 sm:w-24 sm:h-24 bg-shadow/20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full blur-sm absolute" />
            <Settings size={32} className="sm:w-12 sm:h-12 text-text-main opacity-80" />
          </button>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 sm:gap-12">
          {GAMES.map((game) => (
            <motion.button
              key={game.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleGameSelect(game.id)}
              className="group relative flex flex-col"
            >
              <div className="absolute inset-0 bg-shadow/10 rounded-[48px] sm:rounded-[60px] -m-2 sm:-m-4 transition-colors group-hover:bg-shadow/20" />
              <div className="relative bg-white rounded-[40px] sm:rounded-[48px] p-8 sm:p-12 flex flex-col gap-8 shadow-sm">
                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] ${game.color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                  {game.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-4xl sm:text-5xl font-black mb-3 text-text-main">{game.title}</h3>
                  <p className="text-xl sm:text-2xl font-medium opacity-50 leading-tight">{game.description}</p>
                </div>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-32 h-32 ${game.color} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Background Decorations */}
      <div aria-hidden="true" className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-light font-fredoka text-text-main relative">
      <AnimatePresence mode="wait">
        {screen === 'HOME' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen"
          >
            {renderLauncher()}
          </motion.div>
        )}

        {screen === 'GAME' && activeGame && (
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full min-h-screen"
          >
            <ErrorBoundary>
              {GAME_RENDERERS[activeGame]({ settings, onExit: handleExitGame, onOpenSettings: handleOpenSettings })}
            </ErrorBoundary>
          </motion.div>
        )}

        {screen === 'PARENTS_GATE' && (
          <ParentsGate
            onSuccess={handleGateSuccess}
            onCancel={handleExitGame}
          />
        )}

        {screen === 'SETTINGS' && settingsSource === 'home' && (
          <SettingsOverlay
            settings={settings}
            onUpdate={setSettings}
            onClose={handleCloseSettings}
          />
        )}
        {screen === 'SETTINGS' && settingsSource === 'alphabet' && (
          <AlphabetSettingsOverlay
            settings={settings}
            onUpdate={setSettings}
            onClose={handleCloseSettings}
          />
        )}
        {screen === 'SETTINGS' && settingsSource === 'syllables' && (
          <SyllablesSettingsOverlay
            settings={settings}
            onUpdate={setSettings}
            onClose={handleCloseSettings}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
