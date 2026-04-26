/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameSettings } from '../../shared/types';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createAlphabetDescriptor } from './alphabetDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

interface AlphabetGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ settings, onExit, onOpenSettings }: AlphabetGameProps) {
  const { letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const filteredLetterItems = settings.alphabetAccents
    ? letterItems
    : letterItems.filter((l) => l.symbol.normalize('NFD') === l.symbol);

  const descriptor = createAlphabetDescriptor(settings.alphabetGridSize, filteredLetterItems, locale);
  const lobby = GAME_DEFINITIONS_BY_ID.ALPHABET.lobby;

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
