/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameId } from './types';

/**
 * Browsers play no sound before a tap, so a Session may only start from a tap on a Home-screen Game
 * card. The card arms its game here; GameRoute reads the flag on mount and disarms it. The flag lives
 * in module memory on purpose: history state survives a reload, module state does not.
 */
let armedGameId: GameId | null = null;

export function armSessionEntry(gameId: GameId): void {
  armedGameId = gameId;
}

/** Pure read; safe to call twice (React StrictMode runs state initialisers twice in dev). */
export function isSessionEntryArmed(gameId: GameId): boolean {
  return armedGameId === gameId;
}

export function disarmSessionEntry(): void {
  armedGameId = null;
}
