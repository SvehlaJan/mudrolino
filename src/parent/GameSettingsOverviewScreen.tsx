/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { GameId, GameSettings } from '../shared/types';
import { GAME_DEFINITIONS } from '../shared/gameCatalog';
import { SETTINGS_BY_ID } from '../shared/settings/settingsRegistry';
import { getUiCopy } from '../shared/uiCopy';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { AppScreen, BackButton, PageHeader, TopBar, cn, uiTokens } from '../shared/ui';

const GAMES_WITH_SETTINGS = GAME_DEFINITIONS.filter(game => game.settings.length > 0);

interface GameSettingsListProps {
  settings: GameSettings;
  selectedId?: GameId;
}

/** Shared list of catalogued games with settings, reused by the overview (list only) and the detail screen (list + detail on wide layouts). */
export function GameSettingsList({ settings, selectedId }: GameSettingsListProps) {
  const locale = useContentLocale();

  return (
    <nav aria-label="Nastavenia hier" className="space-y-2.5">
      {GAMES_WITH_SETTINGS.map(game => {
        const summary = game.settings
          .map(id => `${SETTINGS_BY_ID[id].label}: ${SETTINGS_BY_ID[id].summarize(settings)}`)
          .join(' · ');
        const selected = game.id === selectedId;

        return (
          <Link
            key={game.id}
            to={`/settings/games/${game.id}`}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              uiTokens.card,
              'flex items-center justify-between gap-3 text-text-main transition-all hover:scale-[1.01] active:translate-y-1 active:shadow-block-pressed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
              selected && 'ring-4 ring-accent-blue/40',
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
      <PageHeader title="Rodičovská zóna" description="Nastavenia hier" />
      <div className="mt-5 sm:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <GameSettingsList settings={settings} />
        <div className="mt-5 hidden rounded-[28px] border-2 border-dashed border-border-subtle p-6 text-center text-text-muted lg:mt-0 lg:flex lg:min-h-[220px] lg:items-center lg:justify-center">
          <p className="text-base font-medium">Vyberte hru zo zoznamu a upravte jej nastavenia.</p>
        </div>
      </div>
    </AppScreen>
  );
}
