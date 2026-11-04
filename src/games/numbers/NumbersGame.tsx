/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { FindItGame } from '../../shared/components/FindItGame';
import { useContent } from '../../shared/contexts/ContentContext';
import { createNumbersDescriptor } from './numbersDescriptor';

export function NumbersGame({ settings, onExit }: GameRuntimeProps) {
  const { numberItems, locale } = useContent();
  const range = settings.numbersRange;
  const filteredNumbers = useMemo(
    () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
    [numberItems, range],
  );
  const descriptor = useMemo(
    () => createNumbersDescriptor(range, filteredNumbers, locale),
    [range, filteredNumbers, locale],
  );

  return <FindItGame gameId="NUMBERS" descriptor={descriptor} onExit={onExit} />;
}
