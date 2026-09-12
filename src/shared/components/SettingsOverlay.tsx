/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-light/95 backdrop-blur-md p-2 sm:p-4 landscape:p-2">
      <Card
        variant="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-overlay-title"
        className="max-h-[94vh] landscape:max-h-[96vh] w-full max-w-md flex flex-col overflow-hidden p-0"
      >
        <div className="relative shrink-0 border-b-2 border-shadow/30 bg-bg-light/50 p-3 sm:p-4 landscape:py-2 text-center">
          <h2 id="settings-overlay-title" className="mb-0.5 text-xl font-bold sm:text-2xl landscape:text-xl">Rodičovská zóna</h2>
          <p className="text-xs font-medium opacity-60 sm:text-sm">{getSettingsSubtitle(gameId)}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť nastavenia"
            className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-2xl text-text-main/60 hover:text-text-main hover:bg-black/5 active:scale-95 transition cursor-pointer"
          >
            <X size={22} className="sm:h-6 sm:w-6" />
          </button>
        </div>

        <SettingsContent target={gameId} settings={settings} onUpdate={onUpdate} />

        <div className="shrink-0 border-t-2 border-shadow/30 bg-bg-light/50 p-2.5 sm:p-3 landscape:py-2 flex justify-center">
          <Button
            onClick={onClose}
            variant="quiet"
            size="sm"
            className="w-full max-w-xs py-2 sm:py-2.5 landscape:py-1.5 text-base sm:text-lg text-text-main"
            icon={<Check size={20} className="sm:h-6 sm:w-6" />}
          >
            Hotovo
          </Button>
        </div>
      </Card>
    </div>
  );
}
