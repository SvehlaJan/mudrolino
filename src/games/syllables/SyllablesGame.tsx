/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameSettings } from '../../shared/types';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createSyllablesDescriptor } from './syllablesDescriptor';

interface SyllablesGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function SyllablesGame({ settings, onExit, onOpenSettings }: SyllablesGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = createSyllablesDescriptor(settings.syllablesGridSize);
  const lobby = GAME_DEFINITIONS_BY_ID.SYLLABLES.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
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
