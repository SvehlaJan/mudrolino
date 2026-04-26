/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { useContent } from '../../shared/contexts/ContentContext';
import { createWordsDescriptor } from './wordsDescriptor';

interface WordsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function WordsGame({ onExit, onOpenSettings }: WordsGameProps) {
  const { wordItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createWordsDescriptor(wordItems, locale), [wordItems, locale]);
  const lobby = GAME_DEFINITIONS_BY_ID.WORDS.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={wordItems.length === 0 ? <>Pridajte slová v sekcii Obsah</> : undefined}
      onPlay={() => {
        if (wordItems.length === 0) return;
        setGameState('PLAYING');
      }}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
