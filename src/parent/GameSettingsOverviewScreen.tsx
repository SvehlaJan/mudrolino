/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { GameSettings } from '../shared/types';
import { GAME_DEFINITIONS } from '../shared/gameCatalog';
import { SETTINGS_BY_ID } from '../shared/settings/settingsRegistry';
import { getUiCopy } from '../shared/uiCopy';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { AppScreen, BackButton, PageHeader, TopBar, cn, uiTokens } from '../shared/ui';

const GAMES_WITH_SETTINGS = GAME_DEFINITIONS.filter(game => game.settings.length > 0);

interface GameSettingsListProps {
  settings: GameSettings;
}

/** Shared list of catalogued games with settings, used by the overview page. */
export function GameSettingsList({ settings }: GameSettingsListProps) {
  const locale = useContentLocale();

  return (
    <nav aria-label="Nastavenia hier" className="space-y-2.5">
      {GAMES_WITH_SETTINGS.map(game => {
        const summary = game.settings
          .map(id => `${SETTINGS_BY_ID[id].label}: ${SETTINGS_BY_ID[id].summarize(settings)}`)
          .join(' · ');
        return (
          <Link
            key={game.id}
            to={`/settings/games/${game.id}`}
            className={cn(
              uiTokens.card,
              'flex items-center justify-between gap-3 text-text-main transition-all hover:scale-[1.01] active:translate-y-1 active:shadow-block-pressed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
            )}
          >
            <div className="min-w-0">
              <span className="block text-lg font-bold leading-tight sm:text-xl">
                {getUiCopy(locale, game.titleKey)}
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium text-text-muted">{summary}</span>
            </div>
            <ChevronRight size={22} className="shrink-0 text-text-muted" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

interface GameSettingsOverviewScreenProps {
  settings: GameSettings;
}

export function GameSettingsOverviewScreen({ settings }: GameSettingsOverviewScreenProps) {
  const navigate = useNavigate();

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="wide">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title="Nastavenia hier" />
      <div className="mt-5 sm:mt-6">
        <GameSettingsList settings={settings} />
      </div>
    </AppScreen>
  );
}
