/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { GameSettings, GameId, SettingsSource } from './shared/types';
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
import { GAME_METADATA, GAME_PATH } from './shared/gameCatalog';

type SettingsScreen = 'none' | 'gate' | 'settings';

function HomeLauncher({
  onOpenSettings,
  scrollRef,
  navigate,
}: {
  onOpenSettings: () => void;
  scrollRef: React.RefObject<number>;
  navigate: (to: string) => void;
}) {
  const handleGameSelect = useCallback((gameId: GameId) => {
    scrollRef.current = window.scrollY;
    navigate(GAME_PATH[gameId]);
  }, [navigate, scrollRef]);

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col p-6 sm:p-12">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-16 sm:mb-24">
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl sm:text-7xl font-black text-text-main tracking-tight leading-none">Hravé Učenie</h1>
            <p className="text-xl sm:text-3xl font-medium opacity-50">Vyber si hru a poďme na to!</p>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-16 h-16 sm:w-24 sm:h-24 bg-shadow/20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full blur-sm absolute" />
            <Settings size={32} className="sm:w-12 sm:h-12 text-text-main opacity-80" />
          </button>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 sm:gap-12">
          {GAME_METADATA.map((game) => (
            <button
              key={game.id}
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
            </button>
          ))}
        </div>
      </div>

      {/* Background Decorations */}
      <div aria-hidden="true" className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [settingsSource, setSettingsSource] = useState<SettingsSource>('home');
  const [settingsScreen, setSettingsScreen] = useState<SettingsScreen>('none');
  const location = useLocation();
  const rawNavigate = useNavigate();
  const homeScrollRef = useRef<number>(0);

  const navigate = useCallback((to: string) => {
    rawNavigate(to);
  }, [rawNavigate]);

  // Restore scroll when returning to home
  useLayoutEffect(() => {
    if (location.pathname === '/') {
      window.scrollTo(0, homeScrollRef.current);
    }
  }, [location.pathname]);

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

  const handleOpenSettings = useCallback((source: SettingsSource = 'home') => {
    setSettingsSource(source);
    setSettingsScreen('gate');
  }, []);

  const handleGateSuccess = useCallback(() => {
    setSettingsScreen('settings');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsScreen('none');
  }, []);

  const handleExitGame = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-light font-fredoka text-text-main relative">
      <div className="w-full min-h-screen">
        <Routes location={location}>
          <Route
            path="/"
            element={
              <HomeLauncher
                onOpenSettings={() => handleOpenSettings('home')}
                scrollRef={homeScrollRef}
                navigate={navigate}
              />
            }
          />
          <Route
            path="/alphabet"
            element={
              <ErrorBoundary>
                <AlphabetGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('alphabet')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/syllables"
            element={
              <ErrorBoundary>
                <SyllablesGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('syllables')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/numbers"
            element={
              <ErrorBoundary>
                <NumbersGame range={settings.numbersRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/counting"
            element={
              <ErrorBoundary>
                <CountingItemsGame range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/words"
            element={
              <ErrorBoundary>
                <WordsGame onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {settingsScreen === 'gate' && (
        <ParentsGate
          onSuccess={handleGateSuccess}
          onCancel={() => setSettingsScreen('none')}
        />
      )}

      {settingsScreen === 'settings' && (settingsSource === 'home' || settingsSource === 'game') && (
        <SettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
      {settingsScreen === 'settings' && settingsSource === 'alphabet' && (
        <AlphabetSettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
      {settingsScreen === 'settings' && settingsSource === 'syllables' && (
        <SyllablesSettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
