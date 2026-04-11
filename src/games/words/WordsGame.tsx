/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { wordsDescriptor } from './wordsDescriptor';

interface WordsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function WordsGame({ onExit, onOpenSettings }: WordsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.WORDS.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={wordsDescriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
