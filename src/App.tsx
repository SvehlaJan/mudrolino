/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { loadAppSettings, saveAppSettings, AppSettings, applyFontFamily } from './shared/services/appSettingsStore';
import { GameSettings } from './shared/types';
import { ProtectedParentRoute } from './shared/components/ProtectedParentRoute';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { GameRoute } from './shared/components/GameRoute';
import { ParentLayout } from './parent/ParentLayout';
import { ParentDashboardScreen } from './parent/ParentDashboardScreen';
import { GameSettingsOverviewScreen } from './parent/GameSettingsOverviewScreen';
import { GameSettingsScreen } from './parent/GameSettingsScreen';
import { AppSettingsScreen } from './parent/AppSettingsScreen';
import { HelpFeedbackScreen } from './parent/HelpFeedbackScreen';
import { ContentProvider } from './shared/contexts/ContentContext';
import { GAME_DEFINITIONS } from './shared/gameCatalog';
import { GroupedHomeScreen } from './home/GroupedHomeScreen';
import { AvatarPreviewScreen } from './avatar/AvatarPreviewScreen';
import { AVATAR_POC_ENABLED } from './avatar/avatarConstants';
import { CustomContentScreen } from './content/CustomContentScreen';
import { useAutosaveStatus, type AutosaveStatus } from './shared/hooks/useAutosaveStatus';

// Keep all gallery code and metadata outside the production dependency graph.
const UiKitScreen = import.meta.env.DEV || import.meta.env.MODE === 'test'
  ? React.lazy(() => import('./shared/ui/UiKitScreen').then(module => ({ default: module.UiKitScreen })))
  : null;

// Initialize font attribute immediately on boot
applyFontFamily(loadAppSettings().fontFamily);

function AutosaveNotice({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null;

  const message = status === 'saving'
    ? 'Ukladám nastavenia…'
    : status === 'saved'
      ? 'Nastavenia sú uložené.'
      : 'Nastavenia sa nepodarilo uložiť. Skontrolujte úložisko prehliadača.';

  return (
    <p
      aria-live="polite"
      className={status === 'error'
        ? 'mx-auto mt-3 max-w-md rounded-2xl bg-red-100 px-4 py-3 text-center text-sm font-bold text-red-800'
        : 'mx-auto mt-3 max-w-md text-center text-sm font-bold text-text-muted'}
      data-testid="autosave-status"
      role="status"
    >
      {message}
    </p>
  );
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings);
  const locale = appSettings.locale;
  const location = useLocation();
  const rawNavigate = useNavigate();
  const homeScrollRef = useRef<number>(0);

  const navigate = useCallback((to: string) => {
    rawNavigate(to);
  }, [rawNavigate]);
  const saveGameSettings = useCallback((nextSettings: GameSettings) => saveSettings(nextSettings), []);
  const saveApplicationSettings = useCallback((nextSettings: AppSettings) => saveAppSettings(nextSettings), []);
  const gameSettingsAutosaveStatus = useAutosaveStatus(settings, saveGameSettings);
  const appSettingsAutosaveStatus = useAutosaveStatus(appSettings, saveApplicationSettings);
  const autosaveStatus: AutosaveStatus = gameSettingsAutosaveStatus === 'error' || appSettingsAutosaveStatus === 'error'
    ? 'error'
    : gameSettingsAutosaveStatus === 'saving' || appSettingsAutosaveStatus === 'saving'
      ? 'saving'
      : gameSettingsAutosaveStatus === 'saved' || appSettingsAutosaveStatus === 'saved'
        ? 'saved'
        : 'idle';

  // Apply font family on mount / layout
  useLayoutEffect(() => {
    applyFontFamily(appSettings.fontFamily);
  }, [appSettings.fontFamily]);

  // Restore scroll when returning to home
  useLayoutEffect(() => {
    if (location.pathname === '/') {
      window.scrollTo(0, homeScrollRef.current);
    }
  }, [location.pathname]);

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

  const handleOpenSettings = useCallback(() => {
    homeScrollRef.current = window.scrollY;
    navigate('/settings');
  }, [navigate]);

  return (
    <ContentProvider locale={locale}>
    <div className="min-h-screen bg-bg-light font-app text-text-main relative">
      <div className="w-full min-h-screen">
        <Routes location={location}>
          <Route
            path="/"
            element={
              <GroupedHomeScreen
                onOpenSettings={handleOpenSettings}
                onSelectGame={() => {
                  homeScrollRef.current = window.scrollY;
                }}
                locale={locale}
              />
            }
          />
          {GAME_DEFINITIONS.map(game => (
            <Route
              key={game.id}
              path={game.path}
              element={<GameRoute gameId={game.id} settings={settings} />}
            />
          ))}
          <Route element={<ProtectedParentRoute />}>
            <Route element={<ParentLayout />}>
              <Route path="/settings" element={<ParentDashboardScreen />} />
              <Route path="/settings/games" element={<GameSettingsOverviewScreen settings={settings} />} />
              <Route
                path="/settings/games/:gameId"
                element={<GameSettingsScreen settings={settings} onUpdate={setSettings} />}
              />
              <Route
                path="/settings/app"
                element={<AppSettingsScreen appSettings={appSettings} onUpdate={setAppSettings} />}
              />
              <Route path="/settings/help" element={<HelpFeedbackScreen />} />
              <Route
                path="/content"
                element={
                  <ErrorBoundary>
                    <CustomContentScreen />
                  </ErrorBoundary>
                }
              />
              <Route path="/recordings" element={<Navigate to="/content" replace />} />
            </Route>
          </Route>
          <Route
            path="/avatar-preview"
            element={
              <ErrorBoundary>
                {AVATAR_POC_ENABLED || import.meta.env.DEV ? <AvatarPreviewScreen /> : <Navigate to="/" replace />}
              </ErrorBoundary>
            }
          />
          <Route
            path="/ui-kit"
            element={
              <ErrorBoundary>
                {UiKitScreen ? (
                  <React.Suspense fallback={<p role="status" className="p-6">Načítavam knižnicu komponentov…</p>}>
                    <UiKitScreen />
                  </React.Suspense>
                ) : <Navigate to="/" replace />}
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {location.pathname.startsWith('/settings') && <AutosaveNotice status={autosaveStatus} />}
      </div>
    </div>
    </ContentProvider>
  );
}
