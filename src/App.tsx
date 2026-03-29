/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Play, 
  Gamepad2,
  Type,
  Apple
} from 'lucide-react';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { Screen, GameSettings, GameId, GameMetadata } from './shared/types';
import { COLORS, BG_COLORS } from './shared/contentRegistry';
import { ParentsGate } from './shared/components/ParentsGate';
import { SettingsOverlay } from './shared/components/SettingsOverlay';
import { AlphabetGame } from './games/alphabet/AlphabetGame';
import { SyllablesGame } from './games/syllables/SyllablesGame';
import { NumbersGame } from './games/numbers/NumbersGame';
import { CountingItemsGame } from './games/counting/CountingItemsGame';

const GAMES: GameMetadata[] = [
  {
    id: 'ALPHABET',
    title: 'Abeceda',
    description: 'Spoznávaj písmenká hravou formou',
    icon: 'Type',
    color: 'bg-primary'
  },
  {
    id: 'SYLLABLES',
    title: 'Slabiky',
    description: 'Spájaj písmenká do slabík',
    icon: 'Gamepad2',
    color: 'bg-success'
  },
  {
    id: 'NUMBERS',
    title: 'Čísla',
    description: 'Počítaj s kamarátmi',
    icon: 'Play',
    color: 'bg-accent-blue'
  },
  {
    id: 'COUNTING_ITEMS',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: 'Apple',
    color: 'bg-soft-watermelon'
  }
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

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

  const handleOpenSettings = useCallback(() => {
    setScreen('PARENTS_GATE');
  }, []);

  const handleExitGame = useCallback(() => {
    setScreen('HOME');
  }, []);

  const handleGateSuccess = useCallback(() => {
    setScreen('SETTINGS');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setScreen('HOME');
  }, []);

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
            onClick={handleOpenSettings}
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
              {/* Card Background / Border */}
              <div className="absolute inset-0 bg-shadow/10 rounded-[48px] sm:rounded-[60px] -m-2 sm:-m-4 transition-colors group-hover:bg-shadow/20" />
              
              {/* Main Card Content */}
              <div className="relative bg-white rounded-[40px] sm:rounded-[48px] p-8 sm:p-12 flex flex-col gap-8 shadow-sm">
                {/* Icon Container */}
                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] ${game.color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                  {game.id === 'ALPHABET' && <Type size={48} className="sm:w-16 sm:h-16" />}
                  {game.id === 'SYLLABLES' && <Gamepad2 size={48} className="sm:w-16 sm:h-16" />}
                  {game.id === 'NUMBERS' && <Play size={48} className="sm:w-16 sm:h-16 ml-2" fill="currentColor" />}
                  {game.id === 'COUNTING_ITEMS' && <Apple size={48} className="sm:w-16 sm:h-16" />}
                </div>
                
                <div className="text-left">
                  <h3 className="text-4xl sm:text-5xl font-black mb-3 text-text-main">{game.title}</h3>
                  <p className="text-xl sm:text-2xl font-medium opacity-50 leading-tight">{game.description}</p>
                </div>
              </div>

              {/* Decorative Blob */}
              <div className={`absolute -bottom-2 -right-2 w-32 h-32 ${game.color} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Background Decorations */}
      <div className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
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
        
        {screen === 'GAME' && activeGame === 'ALPHABET' && (
          <motion.div 
            key="alphabet" 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="w-full min-h-screen"
          >
            <AlphabetGame 
              onExit={handleExitGame} 
              onOpenSettings={handleOpenSettings}
            />
          </motion.div>
        )}

        {screen === 'GAME' && activeGame === 'SYLLABLES' && (
          <motion.div 
            key="syllables" 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="w-full min-h-screen"
          >
            <SyllablesGame 
              onExit={handleExitGame} 
              onOpenSettings={handleOpenSettings}
            />
          </motion.div>
        )}

        {screen === 'GAME' && activeGame === 'NUMBERS' && (
          <motion.div 
            key="numbers" 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="w-full min-h-screen"
          >
            <NumbersGame 
              onExit={handleExitGame} 
              onOpenSettings={handleOpenSettings}
              range={settings.numbersRange}
            />
          </motion.div>
        )}

        {screen === 'GAME' && activeGame === 'COUNTING_ITEMS' && (
          <motion.div 
            key="counting" 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="w-full min-h-screen"
          >
            <CountingItemsGame 
              onExit={handleExitGame} 
              onOpenSettings={handleOpenSettings}
              range={settings.countingRange}
            />
          </motion.div>
        )}

        {screen === 'GAME' && !['ALPHABET', 'SYLLABLES', 'NUMBERS', 'COUNTING_ITEMS'].includes(activeGame as string) && (
          <motion.div 
            key="coming-soon" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 1.1 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-32 h-32 bg-shadow/20 rounded-full flex items-center justify-center mb-8">
              <Gamepad2 size={64} className="opacity-40" />
            </div>
            <h2 className="text-5xl font-black mb-4">Pripravujeme...</h2>
            <p className="text-2xl font-medium opacity-60 mb-12">Táto hra bude čoskoro dostupná!</p>
            <button 
              onClick={() => setScreen('HOME')}
              className="px-12 py-6 bg-primary text-white text-2xl font-bold rounded-full shadow-block active:translate-y-2 active:shadow-block-pressed"
            >
              Späť do menu
            </button>
          </motion.div>
        )}

        {screen === 'PARENTS_GATE' && (
          <ParentsGate 
            onSuccess={handleGateSuccess} 
            onCancel={handleExitGame} 
          />
        )}

        {screen === 'SETTINGS' && (
          <SettingsOverlay 
            settings={settings} 
            onUpdate={setSettings} 
            onClose={handleCloseSettings} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
