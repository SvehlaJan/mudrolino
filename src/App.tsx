/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { loadAppSettings, saveAppSettings, AppSettings } from './shared/services/appSettingsStore';
import { GameSettings, GameId, SettingsTarget } from './shared/types';
import { ParentsGate } from './shared/components/ParentsGate';
import { SettingsOverlay } from './shared/components/SettingsOverlay';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AlphabetGame } from './games/alphabet/AlphabetGame';
import { SyllablesGame } from './games/syllables/SyllablesGame';
import { NumbersGame } from './games/numbers/NumbersGame';
import { CountingItemsGame } from './games/counting/CountingItemsGame';
import { WordsGame } from './games/words/WordsGame';
import { AssemblyGame } from './games/assembly/AssemblyGame';
import { AudioRecordingScreen } from './recordings/AudioRecordingScreen';
import { SettingsScreen } from './shared/components/SettingsScreen';
import { GAME_METADATA, GAME_PATH } from './shared/gameCatalog';
import { AppScreen, IconButton, UiKitScreen } from './shared/ui';

type SettingsFlowState = 'none' | 'gate' | 'settings';

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
    <AppScreen maxWidth="wide" className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-4 sm:mb-6 lg:mb-8 shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-[clamp(2.6rem,6vw,5.25rem)] font-black text-text-main tracking-tight leading-none">Hravé Učenie</h1>
            <p className="text-[clamp(1.05rem,2.2vw,1.7rem)] font-medium opacity-60 leading-tight">Vyber si hru a poďme na to!</p>
          </div>

          <IconButton
            label="Nastavenia"
            onClick={onOpenSettings}
            className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 !bg-shadow/20 !shadow-none hover:scale-105 active:scale-95 shrink-0 relative"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-full blur-sm absolute" />
            <Settings size={28} className="sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-text-main opacity-80" />
          </IconButton>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 flex-1 min-h-0 auto-rows-fr content-stretch">
          {GAME_METADATA.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className="group relative flex min-h-0 flex-col"
            >
              <div className="absolute inset-0 bg-shadow/10 rounded-[28px] sm:rounded-[36px] -m-1.5 sm:-m-2 transition-colors group-hover:bg-shadow/20" />
              <div className="relative h-full bg-white rounded-[24px] sm:rounded-[30px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between gap-3 shadow-sm text-left overflow-hidden">
                <div className={`w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 rounded-[18px] sm:rounded-[24px] ${game.color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105`}>
                  {game.icon}
                </div>
                <div className="min-h-0">
                  <h3 className="text-[clamp(1.45rem,3.1vw,2.4rem)] font-black mb-1 sm:mb-2 text-text-main leading-[0.95]">{game.title}</h3>
                  <p className="text-[clamp(0.92rem,1.65vw,1.2rem)] font-medium opacity-60 leading-snug">{game.description}</p>
                </div>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-20 h-20 sm:w-24 sm:h-24 ${game.color} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
            </button>
          ))}
        </div>
      {/* Background Decorations */}
      <div aria-hidden="true" className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
    </AppScreen>
  );
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [appSettings, _setAppSettings] = useState<AppSettings>(loadAppSettings);
  const locale = appSettings.locale;
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget>('home');
  const [settingsScreen, setSettingsScreen] = useState<SettingsFlowState>('none');
  const [awaitingHomeSettingsReveal, setAwaitingHomeSettingsReveal] = useState(false);
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

  // Sync app settings
  useEffect(() => {
    saveAppSettings(appSettings);
  }, [appSettings]);

  // Sync locale with AudioManager
  useEffect(() => {
    audioManager.updateLocale(appSettings.locale);
  }, [appSettings.locale]);

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

  const handleOpenSettings = useCallback((target: SettingsTarget = 'home') => {
    setSettingsTarget(target);
    setSettingsScreen('gate');
  }, []);

  const handleGateSuccess = useCallback(() => {
    if (settingsTarget === 'home') {
      setAwaitingHomeSettingsReveal(true);
      navigate('/settings');
    } else {
      setSettingsScreen('settings');
    }
  }, [settingsTarget, navigate]);

  const handleHomeSettingsReady = useCallback(() => {
    if (!awaitingHomeSettingsReveal) return;
    setSettingsScreen('none');
    setAwaitingHomeSettingsReveal(false);
  }, [awaitingHomeSettingsReveal]);

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
                <AlphabetGame locale={locale} settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ALPHABET')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/syllables"
            element={
              <ErrorBoundary>
                <SyllablesGame locale={locale} settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('SYLLABLES')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/numbers"
            element={
              <ErrorBoundary>
                <NumbersGame locale={locale} range={settings.numbersRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('NUMBERS')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/counting"
            element={
              <ErrorBoundary>
                <CountingItemsGame locale={locale} range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COUNTING_ITEMS')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/words"
            element={
              <ErrorBoundary>
                <WordsGame locale={locale} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('WORDS')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/assembly"
            element={
              <ErrorBoundary>
                <AssemblyGame locale={locale} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ASSEMBLY')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/recordings"
            element={
              <ErrorBoundary>
                <AudioRecordingScreen locale={appSettings.locale} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsScreen
                settings={settings}
                onUpdate={setSettings}
                onReady={awaitingHomeSettingsReveal ? handleHomeSettingsReady : undefined}
              />
            }
          />
          <Route
            path="/ui-kit"
            element={
              <ErrorBoundary>
                <UiKitScreen />
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

      {settingsScreen === 'settings' && settingsTarget !== 'home' && (
        <SettingsOverlay
          gameId={settingsTarget}
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
