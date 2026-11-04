/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { GameId, GameSettings } from '../shared/types';
import { GAME_DEFINITIONS_BY_ID } from '../shared/gameCatalog';
import { SETTINGS_BY_ID } from '../shared/settings/settingsRegistry';
import { SettingField } from './SettingField';

interface SettingsRendererProps {
  gameId: GameId;
  settings: GameSettings;
  onUpdate(next: GameSettings, notice?: string): void;
}

/** Renders exactly the catalogued settings for one game, in the Parent area's drill-down. */
export function SettingsRenderer({ gameId, settings, onUpdate }: SettingsRendererProps) {
  const definition = GAME_DEFINITIONS_BY_ID[gameId];

  return (
    <div className="space-y-5">
      {definition.settings.map(id => {
        const setting = SETTINGS_BY_ID[id];
        return (
          <SettingField
            key={id}
            definition={setting}
            value={setting.read(settings)}
            onValueChange={(value) => {
              const result = setting.apply(settings, value);
              if (result.rejected) return;
              onUpdate(result.settings, result.notice);
            }}
          />
        );
      })}
    </div>
  );
}
