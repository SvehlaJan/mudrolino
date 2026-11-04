/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameId, GameSettings } from '../types';
import { GAME_MODULES } from '../gameModuleRegistry';
import { ErrorBoundary } from './ErrorBoundary';

interface GameRouteProps {
  gameId: GameId;
  settings: GameSettings;
}

/**
 * Resolves a game's lazy module and supplies the runtime callback every game
 * needs: exit-to-home. Replaces the per-game static imports and ad hoc onExit
 * wiring that used to live in App.tsx. Game settings are reached only through
 * the Parent area, so a game receives no way to open them.
 */
export function GameRoute({ gameId, settings }: GameRouteProps) {
  const navigate = useNavigate();
  const Component = GAME_MODULES[gameId];

  const onExit = () => navigate('/');

  return (
    <ErrorBoundary>
      <React.Suspense fallback={null}>
        <Component settings={settings} onExit={onExit} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
