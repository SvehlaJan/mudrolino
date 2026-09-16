/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameSettings } from './types';

/**
 * One runtime prop contract every game module implements. The registry and every
 * game import this from here so no game module depends back on the registry.
 */
export interface GameRuntimeProps {
  settings: GameSettings;
  onExit(): void;
  onOpenSettings?: () => void;
}
