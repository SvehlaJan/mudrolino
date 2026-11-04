/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GameId, GameSettings } from '../types';
import { GAME_MODULES } from '../gameModuleRegistry';
import { useContent } from '../contexts/ContentContext';
import { disarmSessionEntry, isSessionEntryArmed } from '../sessionEntry';
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
 *
 * A Session starts only from a tap on a Home-screen card, because browsers play no sound before
 * one. Any other way in (reload, typed URL, history Forward) is sent home; nothing is lost, since a
 * reload already discards the Session.
 */
export function GameRoute({ gameId, settings }: GameRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useContent();
  // The read is pure because StrictMode runs this initialiser twice in development; the disarm
  // waits for the mount effect, so only a real mount consumes the card's tap.
  const [entered] = useState(() => isSessionEntryArmed(gameId));
  useEffect(() => {
    disarmSessionEntry();
  }, []);

  const Component = GAME_MODULES[gameId];

  if (!entered) return <Navigate to="/" replace />;
  if (isLoading) return null;

  // Entered by a card tap: Home is the previous entry, so going back leaves no game ahead of it.
  const enteredFromHome = (location.state as { fromHome?: boolean } | null)?.fromHome === true;
  const onExit = () => {
    if (enteredFromHome) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <ErrorBoundary>
      <React.Suspense fallback={null}>
        <Component settings={settings} onExit={onExit} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
