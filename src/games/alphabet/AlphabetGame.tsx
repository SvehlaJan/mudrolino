/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { createAlphabetDescriptor } from './alphabetDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

export function AlphabetGame({ settings, onExit }: GameRuntimeProps) {
  const { letterItems, locale } = useContent();

  const filteredLetterItems = settings.alphabetAccents
    ? letterItems
    : letterItems.filter((l) => l.symbol.normalize('NFD') === l.symbol);

  const descriptor = createAlphabetDescriptor(settings.alphabetGridSize, filteredLetterItems, locale);

  return <FindItGame gameId="ALPHABET" descriptor={descriptor} onExit={onExit} />;
}
