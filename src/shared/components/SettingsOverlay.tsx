/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GameId, GameSettings } from '../types';
import { SettingsContent } from './SettingsContent';
import { getSettingsSubtitle } from './settingsContentData';

interface SettingsOverlayProps {
  gameId: GameId;
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
}

export function SettingsOverlay({ gameId, settings, onUpdate, onClose }: SettingsOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-light/95 backdrop-blur-md p-4 sm:p-8">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-block sm:rounded-[40px] flex flex-col">
        <div className="shrink-0 border-b-2 border-shadow/30 bg-bg-light/50 p-6 text-center sm:p-10">
          <h2 className="mb-1 text-3xl font-bold sm:mb-2 sm:text-5xl">Rodičovská zóna</h2>
          <p className="text-base font-medium opacity-60 sm:text-xl">{getSettingsSubtitle(gameId)}</p>
        </div>

        <SettingsContent target={gameId} settings={settings} onUpdate={onUpdate} />

        <div className="shrink-0 border-t-2 border-shadow/30 bg-bg-light/50 p-6 sm:p-8">
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-soft-watermelon py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed sm:gap-4 sm:py-6 sm:text-2xl"
          >
            <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
            Späť
          </button>
        </div>
      </div>
    </div>
  );
}
