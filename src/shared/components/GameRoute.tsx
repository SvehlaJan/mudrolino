/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameId, GameSettings } from '../types';
import { GAME_DEFINITIONS_BY_ID } from '../gameCatalog';
import { GAME_MODULES } from '../gameModuleRegistry';
import { ErrorBoundary } from './ErrorBoundary';

interface GameRouteProps {
  gameId: GameId;
  settings: GameSettings;
}

/**
 * Resolves a game's catalog definition and lazy module, and supplies the
 * runtime callbacks every game needs: exit-to-home and (only when the game has
 * settings) open-settings navigation. Replaces the per-game static imports and
 * ad hoc onExit/onOpenSettings wiring that used to live in App.tsx.
 */
export function GameRoute({ gameId, settings }: GameRouteProps) {
  const navigate = useNavigate();
  const definition = GAME_DEFINITIONS_BY_ID[gameId];
  const Component = GAME_MODULES[gameId];

  const onExit = () => navigate('/');
  const onOpenSettings = definition.settings.length
    ? () =>
        navigate(`/settings/games/${gameId}`, {
          state: { returnTo: definition.path, returnFocus: 'settings' },
        })
    : undefined;

  return (
    <ErrorBoundary>
      <React.Suspense fallback={null}>
        <Component settings={settings} onExit={onExit} onOpenSettings={onOpenSettings} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
