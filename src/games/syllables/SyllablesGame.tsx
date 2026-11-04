/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { useContent } from '../../shared/contexts/ContentContext';
import { createSyllablesDescriptor } from './syllablesDescriptor';

export function SyllablesGame({ settings, onExit }: GameRuntimeProps) {
  const { syllableItems, locale } = useContent();
  const descriptor = createSyllablesDescriptor(settings.syllablesGridSize, syllableItems, locale);

  return <FindItGame gameId="SYLLABLES" descriptor={descriptor} onExit={onExit} />;
}
