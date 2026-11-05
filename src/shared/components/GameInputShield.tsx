/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

/** How long the shield lasts: long enough to absorb the second half of a child's double tap on a Home card. */
export const GAME_INPUT_SHIELD_MS = 500;

const swallow = (event: React.SyntheticEvent) => event.stopPropagation();

/**
 * An invisible full-screen layer that takes every tap for a moment after a game opens. The game
 * replaces the Home screen within about a frame, so a double tap on a card would otherwise land its
 * second half on an answer tile and spend the first Round. Mount it beside the game so the timer
 * starts when the game appears, not when the route does.
 */
export function GameInputShield() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setActive(false), GAME_INPUT_SHIELD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="game-input-shield"
      className="fixed inset-0 z-[100]"
      onPointerDown={swallow}
      onPointerUp={swallow}
      onMouseDown={swallow}
      onMouseUp={swallow}
      onTouchStart={swallow}
      onTouchEnd={swallow}
      onClick={swallow}
    />
  );
}
