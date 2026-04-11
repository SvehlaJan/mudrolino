/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createNumbersDescriptor } from './numbersDescriptor';

interface NumbersGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function NumbersGame({ onExit, onOpenSettings, range }: NumbersGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createNumbersDescriptor(range), [range]);
  const lobby = GAME_DEFINITIONS_BY_ID.NUMBERS.lobby;

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
