/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GameId, GameSettings } from '../types';
import { SettingsContent } from './SettingsContent';
import { getSettingsSubtitle } from './settingsContentData';
import { Button, Card } from '../ui';

interface SettingsOverlayProps {
  gameId: GameId;
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
}

export function SettingsOverlay({ gameId, settings, onUpdate, onClose }: SettingsOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-light/95 backdrop-blur-md p-4 sm:p-8">
      <Card variant="modal" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b-2 border-shadow/30 bg-bg-light/50 p-6 text-center sm:p-10">
          <h2 className="mb-1 text-3xl font-bold sm:mb-2 sm:text-5xl">Rodičovská zóna</h2>
          <p className="text-base font-medium opacity-60 sm:text-xl">{getSettingsSubtitle(gameId)}</p>
        </div>

        <SettingsContent target={gameId} settings={settings} onUpdate={onUpdate} />

        <div className="shrink-0 border-t-2 border-shadow/30 bg-bg-light/50 p-6 sm:p-8">
          <Button onClick={onClose} variant="secondary" fullWidth icon={<ArrowLeft size={24} className="sm:h-8 sm:w-8" />}>
            Späť
          </Button>
        </div>
      </Card>
    </div>
  );
}
