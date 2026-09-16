/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GameId, GameSettings } from '../types';
import { GAME_DEFINITIONS_BY_ID } from '../gameCatalog';
import { sanitizeChildReturnPath } from '../services/parentAccessLogic';
import { SettingsOverlay } from './SettingsOverlay';

interface GameSettingsRouteProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}

/**
 * Route component for /settings/games/:gameId.
 * When unlocked, renders the selected game's SettingsOverlay.
 * On close, safely returns to the originating game lobby with focus restored.
 * Unknown game IDs or games without settings redirect to /settings.
 */
export function GameSettingsRoute({ settings, onUpdate }: GameSettingsRouteProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const definition = gameId ? GAME_DEFINITIONS_BY_ID[gameId as GameId] : undefined;

  if (!definition || definition.settings.length === 0) {
    return <Navigate to="/settings" replace />;
  }

  const handleClose = () => {
    const state = location.state as { returnTo?: unknown } | null;
    const returnTo = sanitizeChildReturnPath(state?.returnTo);
    const destination = returnTo !== '/' ? returnTo : definition.path;
    navigate(destination, {
      replace: true,
      state: { returnFocus: 'settings' },
    });
  };

  return (
    <SettingsOverlay
      gameId={definition.id}
      settings={settings}
      onUpdate={onUpdate}
      onClose={handleClose}
    />
  );
}
