/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { GameId, GameSettings } from '../shared/types';
import { GAME_DEFINITIONS_BY_ID } from '../shared/gameCatalog';
import { getUiCopy } from '../shared/uiCopy';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { sanitizeChildReturnPath } from '../shared/services/parentAccessLogic';
import { getSettingsSubtitle } from '../shared/settings/settingsRegistry';
import { AppScreen, BackButton, PageHeader, TopBar, cn, uiTokens } from '../shared/ui';
import { SettingsRenderer } from './SettingsRenderer';
import { useParentZone } from './ParentZoneContext';

interface GameSettingsScreenProps {
  settings: GameSettings;
  onUpdate(next: GameSettings): void;
}

/**
 * Route component for /settings/games/:gameId. Renders the same
 * SettingsRenderer content whether reached from a lobby's settings trigger or
 * from the dashboard's games overview — only the back destination differs:
 * a lobby entry closes the whole parent zone back to that lobby, an
 * in-dashboard entry steps back to the games overview.
 */
export function GameSettingsScreen({ settings, onUpdate }: GameSettingsScreenProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { closeToChild } = useParentZone();
  const locale = useContentLocale();
  const [notice, setNotice] = useState<string | null>(null);

  const definition = gameId ? GAME_DEFINITIONS_BY_ID[gameId as GameId] : undefined;

  const state = location.state as { returnTo?: unknown } | null;
  const returnTo = sanitizeChildReturnPath(state?.returnTo);
  const cameFromLobby = returnTo !== '/';

  const handleBack = () => {
    if (cameFromLobby) {
      closeToChild({ state: { returnFocus: 'settings' }, replace: true });
      return;
    }
    navigate('/settings/games', { replace: true });
  };

  if (!definition) {
    return (
      <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="wide">
        <TopBar left={<BackButton onClick={handleBack} />} />
        <div data-testid="game-settings-not-found">
          <PageHeader title="Rodičovská zóna" description="Nastavenia hry sa nenašli" />
          <div className="mt-6 rounded-[28px] border-2 border-dashed border-border-subtle p-6 text-center text-text-muted">
            <p className="text-base font-medium">
              Požadovaná hra neexistuje alebo nemá žiadne nastaviteľné parametre.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/settings/games"
                replace
                className={cn(
                  uiTokens.pressable,
                  'inline-flex items-center justify-center rounded-[20px] bg-accent-blue px-6 py-3 text-base font-bold text-text-main shadow-block hover:scale-[1.02] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
                )}
              >
                Prehľad nastavení hier
              </Link>
              <Link
                to="/settings"
                replace
                className={cn(
                  uiTokens.pressable,
                  'inline-flex items-center justify-center rounded-[20px] bg-white px-6 py-3 text-base font-bold text-text-main shadow-block hover:scale-[1.02] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
                )}
              >
                Rodičovská zóna
              </Link>
            </div>
          </div>
        </div>
      </AppScreen>
    );
  }

  if (definition.settings.length === 0) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={handleBack} />} />
      <div data-testid="game-settings-detail">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Nastavenia hry</p>
        <PageHeader title={getUiCopy(locale, definition.titleKey)} description={getSettingsSubtitle(definition.id)} />
        {notice && (
          <p
            role="status"
            aria-live="polite"
            data-testid="setting-dependency-notice"
            className="mt-3 rounded-2xl bg-accent-blue/15 px-4 py-3 text-sm font-bold text-text-main"
          >
            {notice}
          </p>
        )}
        <div className="mt-5 sm:mt-6">
          <SettingsRenderer
            gameId={definition.id}
            settings={settings}
            onUpdate={(next, noticeText) => {
              onUpdate(next);
              setNotice(noticeText ?? null);
            }}
          />
        </div>
      </div>
    </AppScreen>
  );
}
