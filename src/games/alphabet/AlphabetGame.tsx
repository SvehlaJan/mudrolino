/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { createAlphabetDescriptor } from './alphabetDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

export function AlphabetGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const filteredLetterItems = settings.alphabetAccents
    ? letterItems
    : letterItems.filter((l) => l.symbol.normalize('NFD') === l.symbol);

  const descriptor = createAlphabetDescriptor(settings.alphabetGridSize, filteredLetterItems, locale);

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      gameId="ALPHABET"
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
