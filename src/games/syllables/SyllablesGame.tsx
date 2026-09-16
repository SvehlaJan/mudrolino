/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { useContent } from '../../shared/contexts/ContentContext';
import { createSyllablesDescriptor } from './syllablesDescriptor';

export function SyllablesGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { syllableItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = createSyllablesDescriptor(settings.syllablesGridSize, syllableItems, locale);

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      gameId="SYLLABLES"
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
