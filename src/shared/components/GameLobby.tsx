/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Settings } from 'lucide-react';
import type { GameId } from '../types';
import { GAME_DEFINITIONS_BY_ID, type TactilePreset, type GameIconId } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { AppScreen, BackButton, Button, IconButton, TopBar } from '../ui';
import { useAppScreenLayout } from '../ui/appScreenLayout';
import { cn } from '../ui/utils';
import { GameIcon } from '../../home/GameCard';

export interface GameLobbyProps {
  gameId: GameId;
  onPlay(): void;
  onBack(): void;
  onOpenSettings?: () => void;
  availabilityMessage?: string;
  as?: 'main' | 'div';
}

function TactilePreview({
  preset,
  icon,
  compact = false,
}: {
  preset: TactilePreset;
  icon: GameIconId;
  compact?: boolean;
}) {
  const sizeClasses = compact
    ? 'w-14 h-14 sm:w-16 sm:h-16'
    : 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32';
  const iconSize = compact
    ? 'w-7 h-7 sm:w-8 sm:h-8'
    : 'w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16';

  let presetClasses = '';
  switch (preset) {
    case 'wood':
      presetClasses = 'bg-[#EBDBC9] border-4 border-[#C8B29B] rounded-[24px] shadow-block text-text-main';
      break;
    case 'magnet':
      presetClasses = 'bg-white border-4 border-border-subtle rounded-[24px] shadow-block text-focus';
      break;
    case 'felt':
      presetClasses = 'bg-[#EAE4DF] border-4 border-dashed border-[#B8A8A4] rounded-[24px] shadow-sm text-text-main';
      break;
    case 'picture':
      presetClasses = 'bg-white border-4 border-white rounded-[24px] shadow-block ring-2 ring-border-subtle text-action-primary';
      break;
    case 'counter':
      presetClasses = 'bg-success-surface border-4 border-[#94D4C0] rounded-full shadow-block text-[#1F4E3D]';
      break;
    case 'tray':
      presetClasses = 'bg-[#EFE8DD] border-4 border-[#D5CABD] rounded-[32px] shadow-inner text-text-main';
      break;
    case 'balance':
      presetClasses = 'bg-selected-surface border-4 border-[#BAC2E4] rounded-[24px] shadow-block text-focus';
      break;
  }

  return (
    <div
      data-testid="lobby-tactile-preview"
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center select-none shrink-0 transition-all',
        sizeClasses,
        presetClasses,
      )}
    >
      <GameIcon icon={icon} className={iconSize} />
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
  const definition = GAME_DEFINITIONS_BY_ID[gameId];
  const title = getUiCopy('sk', definition.titleKey);
  const instruction = getUiCopy('sk', definition.instructionKey);
  const { layout } = useAppScreenLayout();
  const isShort = layout === 'short';

  const settingsButton = onOpenSettings ? (
    <IconButton
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

      {isShort ? (
        /* Short landscape (e.g. 667x375) horizontal composition */
        <div className="flex-1 min-h-0 flex flex-row items-center justify-between gap-6 px-4 py-1 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <TactilePreview preset={definition.tactilePreset} icon={definition.icon} compact />
            <div className="flex flex-col gap-1 min-w-0">
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
          </div>

          <div className="shrink-0">
            <Button
              size="child"
              tone="primary"
              onClick={onPlay}
              disabled={Boolean(availabilityMessage)}
              aria-label="Hrať"
              className="h-20 w-20 rounded-full"
            >
              <Play size={36} className="ml-1" fill="currentColor" />
            </Button>
          </div>
        </div>
      ) : (
        /* Portrait and desktop centered layout */
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8 px-4 py-2 sm:py-4 md:py-6 text-center max-w-2xl mx-auto w-full">
          <TactilePreview preset={definition.tactilePreset} icon={definition.icon} />

          <div className="flex flex-col gap-1.5 sm:gap-3 min-w-0 max-w-xl">
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
            aria-label="Hrať"
            className="shrink-0 mt-1 sm:mt-2"
          >
            <Play size={44} className="sm:w-16 sm:h-16 md:w-20 md:h-20 ml-1.5 sm:ml-2.5" fill="currentColor" />
          </Button>
        </div>
      )}
    </AppScreen>
  );
}
