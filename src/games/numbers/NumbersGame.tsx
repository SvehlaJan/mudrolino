/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_LOBBY_LEGACY } from '../../shared/gameCatalog';
import { useContent } from '../../shared/contexts/ContentContext';
import { createNumbersDescriptor } from './numbersDescriptor';

export function NumbersGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { numberItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const range = settings.numbersRange;
  const filteredNumbers = useMemo(
    () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
    [numberItems, range],
  );
  const descriptor = useMemo(
    () => createNumbersDescriptor(range, filteredNumbers, locale),
    [range, filteredNumbers, locale],
  );
  const lobby = GAME_LOBBY_LEGACY.NUMBERS;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={<>Rozsah: {range.start} - {range.end}</>}
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
