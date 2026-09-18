/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { useContent } from '../../shared/contexts/ContentContext';
import { createWordsDescriptor } from './wordsDescriptor';

export function WordsGame({ onExit, onOpenSettings }: GameRuntimeProps) {
  const { wordItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createWordsDescriptor(wordItems, locale), [wordItems, locale]);

  if (gameState === 'PLAYING') {
    return <FindItGame gameId="WORDS" descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      gameId="WORDS"
      availabilityMessage={wordItems.length === 0 ? 'Pridajte slová v sekcii Obsah' : undefined}
      onPlay={() => {
        if (wordItems.length === 0) return;
        setGameState('PLAYING');
      }}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
