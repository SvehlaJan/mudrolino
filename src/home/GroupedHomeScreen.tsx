/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { GAME_CATEGORIES, GAME_DEFINITIONS, GameDefinition } from '../shared/gameCatalog';
import { getUiCopy } from '../shared/uiCopy';
import { AppScreen } from '../shared/ui/AppScreen';
import { IconButton } from '../shared/ui/IconButton';
import { PwaHomeControl } from '../pwa/PwaHomeControl';
import { AVATAR_POC_ENABLED } from '../avatar/avatarConstants';
import { HomeAvatarOverlay } from '../avatar/HomeAvatarOverlay';
import { GameCard } from './GameCard';

export interface GroupedHomeScreenProps {
  onOpenSettings: () => void;
  onSelectGame?: (game: GameDefinition) => void;
  locale?: string;
}

export function GroupedHomeScreen({
  onOpenSettings,
  onSelectGame,
  locale = 'sk',
}: GroupedHomeScreenProps) {
  const groupedGames = GAME_CATEGORIES.map(category => ({
    category,
    games: GAME_DEFINITIONS
      .filter(game => game.categoryId === category.id)
      .sort((a, b) => a.order - b.order),
  }));

  return (
    <AppScreen
      maxWidth="wide"
      height="content"
      scroll="vertical"
      className="min-h-[100svh] p-3 pb-24 sm:p-6 sm:pb-32 lg:p-8"
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6 sm:mb-8 lg:mb-10 shrink-0">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2">
          <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] font-black text-text-main tracking-tight leading-none">
            {getUiCopy(locale, 'home.title')}
          </h1>
          <p className="text-[clamp(1rem,2vw,1.4rem)] font-medium text-text-muted leading-tight">
            {getUiCopy(locale, 'home.subtitle')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <IconButton
            label="Nastavenia"
            onClick={onOpenSettings}
            size="child"
            tone="neutral"
            className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
          >
            <Settings size={28} className="text-text-main" />
          </IconButton>
        </div>
      </div>

      <PwaHomeControl />

      {/* Grouped Category Sections */}
      <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
        {groupedGames.map(({ category, games }) => (
          <section
            key={category.id}
            aria-labelledby={`category-heading-${category.id}`}
            className="flex flex-col gap-3 sm:gap-4"
          >
            <h2
              id={`category-heading-${category.id}`}
              className="text-xl sm:text-2xl lg:text-3xl font-black text-text-main tracking-tight"
            >
              {getUiCopy(locale, category.titleKey)}
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {games.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  locale={locale}
                  onClick={() => onSelectGame?.(game)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Background Decorations */}
      <div
        aria-hidden="true"
        className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none"
      />
      {AVATAR_POC_ENABLED && <HomeAvatarOverlay />}
    </AppScreen>
  );
}
