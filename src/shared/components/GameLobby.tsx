/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Settings } from 'lucide-react';
import type { GameId } from '../types';
import { GAME_DEFINITIONS_BY_ID } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';
import { AppScreen, BackButton, Button, IconButton, TopBar } from '../ui';
import { useAppScreenLayout } from '../ui/appScreenLayout';

export interface GameLobbyProps {
  gameId: GameId;
  onPlay(): void;
  onBack(): void;
  onOpenSettings?: () => void;
  availabilityMessage?: string;
  as?: 'main' | 'div';
}

function LobbyBody({
  title,
  instruction,
  playLabel,
  locale,
  availabilityMessage,
  onPlay,
}: {
  title: string;
  instruction: string;
  playLabel: string;
  locale: string;
  availabilityMessage?: string;
  onPlay(): void;
}) {
  const { layout } = useAppScreenLayout();
  const isShort = layout === 'short';

  if (isShort) {
    return (
      /* Short landscape (e.g. 667x375) horizontal composition */
      <div data-testid="lobby-body" data-locale={locale} className="flex-1 min-h-0 flex flex-row items-center justify-between gap-6 px-4 py-1 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight leading-tight select-none truncate">
            {title}
          </h1>
          <p
            data-testid="lobby-instruction"
            className="text-xs sm:text-sm font-medium text-text-muted leading-snug line-clamp-2"
          >
            {instruction}
          </p>
          {availabilityMessage && (
            <p role="status" className="text-xs font-bold text-action-danger">
              {availabilityMessage}
            </p>
          )}
        </div>

        <div className="shrink-0">
          <Button
            size="child"
            tone="primary"
            onClick={onPlay}
            disabled={Boolean(availabilityMessage)}
            aria-label={playLabel}
            className="h-20 w-20 rounded-full"
          >
            <Play size={36} className="ml-1" fill="currentColor" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    /* Portrait and desktop centered layout */
    <div data-testid="lobby-body" data-locale={locale} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 sm:gap-8 md:gap-10 px-4 py-4 sm:py-6 text-center max-w-2xl mx-auto w-full">
      <div className="flex flex-col gap-2 sm:gap-3 min-w-0 max-w-xl">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-text-main tracking-tight leading-tight select-none">
          {title}
        </h1>
        <p
          data-testid="lobby-instruction"
          className="text-sm sm:text-base md:text-lg font-medium text-text-muted max-w-md mx-auto leading-normal"
        >
          {instruction}
        </p>
        {availabilityMessage && (
          <p role="status" className="text-xs sm:text-sm font-bold text-action-danger mt-1">
            {availabilityMessage}
          </p>
        )}
      </div>

      <Button
        size="play"
        tone="primary"
        onClick={onPlay}
        disabled={Boolean(availabilityMessage)}
        aria-label={playLabel}
        className="shrink-0 mt-1 sm:mt-2"
      >
        <Play size={44} className="sm:w-16 sm:h-16 md:w-20 md:h-20 ml-1.5 sm:ml-2.5" fill="currentColor" />
      </Button>
    </div>
  );
}

export function GameLobby({
  gameId,
  onPlay,
  onBack,
  onOpenSettings,
  availabilityMessage,
  as = 'main',
}: GameLobbyProps) {
  const locale = useContentLocale();
  const definition = GAME_DEFINITIONS_BY_ID[gameId];
  const title = getUiCopy(locale, definition.titleKey);
  const instruction = getUiCopy(locale, definition.instructionKey);
  const playLabel = getUiCopy(locale, 'lobby.play');
  const location = useLocation();
  const settingsButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if ((location.state as { returnFocus?: unknown } | null)?.returnFocus === 'settings') {
      settingsButtonRef.current?.focus();
    }
  }, [location.state]);

  const settingsButton = onOpenSettings ? (
    <IconButton
      ref={settingsButtonRef}
      onClick={onOpenSettings}
      label="Nastavenia"
      tone="neutral"
      size="child"
    >
      <Settings size={24} className="sm:w-7 sm:h-7" />
    </IconButton>
  ) : undefined;

  return (
    <AppScreen as={as} maxWidth="game" height="viewport" scroll="locked">
      <TopBar
        left={<BackButton onClick={onBack} />}
        right={settingsButton}
      />
      <LobbyBody
        title={title}
        instruction={instruction}
        playLabel={playLabel}
        locale={locale}
        availabilityMessage={availabilityMessage}
        onPlay={onPlay}
      />
    </AppScreen>
  );
}
