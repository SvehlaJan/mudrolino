/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { useContent } from '../../shared/contexts/ContentContext';
import { createWordsDescriptor } from './wordsDescriptor';

export function WordsGame({ onExit }: GameRuntimeProps) {
  const { wordItems, locale } = useContent();
  const descriptor = useMemo(() => createWordsDescriptor(wordItems, locale), [wordItems, locale]);

  return <FindItGame gameId="WORDS" descriptor={descriptor} onExit={onExit} />;
}
