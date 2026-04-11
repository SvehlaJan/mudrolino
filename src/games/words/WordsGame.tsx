/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { wordsDescriptor } from './wordsDescriptor';

interface WordsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function WordsGame({ onExit, onOpenSettings }: WordsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={wordsDescriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title="SLOVÁ"
      playButtonColorClassName="bg-soft-watermelon"
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none"
      bottomDecorationClassName="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none"
    />
  );
}
