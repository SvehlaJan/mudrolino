/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { useContent } from '../../shared/contexts/ContentContext';
import { getUnplayableReason } from '../../shared/gamePlayability';
import { createWordsDescriptor } from './wordsDescriptor';
import { translate } from '../../shared/i18n';

export function WordsGame({ settings, onExit }: GameRuntimeProps) {
  const { wordItems, letterItems, syllableItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createWordsDescriptor(wordItems, locale), [wordItems, locale]);
  const unplayableReason = useMemo(
    () => getUnplayableReason('WORDS', { wordItems, letterItems, syllableItems, settings }),
    [wordItems, letterItems, syllableItems, settings],
  );

  if (gameState === 'PLAYING') {
    return <FindItGame gameId="WORDS" descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      gameId="WORDS"
      availabilityMessage={unplayableReason ? translate(locale, unplayableReason) : undefined}
      onPlay={() => {
        if (unplayableReason) return;
        setGameState('PLAYING');
      }}
      onBack={onExit}
    />
  );
}
