/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Mic, PartyPopper, Music } from 'lucide-react';
import { SettingToggle } from './SettingToggle';
import { GameSettings } from '../types';

interface SettingsOverlayProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
}

export function SettingsOverlay({ settings, onUpdate, onClose }: SettingsOverlayProps) {
  const updateSetting = (key: keyof GameSettings, value: boolean) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-light/95 backdrop-blur-md p-4 sm:p-8">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-block overflow-hidden border-4 border-white flex flex-col">
        <div className="p-6 sm:p-10 border-b-2 border-shadow/30 bg-bg-light/50 text-center shrink-0">
          <h2 className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">Rodičovská zóna</h2>
          <p className="text-base sm:text-xl opacity-60 font-medium">Nastavenia hlasitosti</p>
        </div>

        <div className="p-4 sm:p-10 space-y-4 sm:space-y-8 overflow-y-auto flex-1">
          <SettingToggle 
            label="Hlas" 
            icon={<Mic size={24} className="sm:w-8 sm:h-8" />} 
            active={settings.voice} 
            color="bg-accent-blue"
            onToggle={() => updateSetting('voice', !settings.voice)} 
          />
          <SettingToggle 
            label="Zvukové efekty" 
            icon={<PartyPopper size={24} className="sm:w-8 sm:h-8" />} 
            active={settings.sfx} 
            color="bg-success"
            onToggle={() => updateSetting('sfx', !settings.sfx)} 
          />
          <SettingToggle 
            label="Hudba" 
            icon={<Music size={24} className="sm:w-8 sm:h-8" />} 
            active={settings.music} 
            color="bg-shadow"
            onToggle={() => updateSetting('music', !settings.music)} 
          />
        </div>

        <div className="p-6 sm:p-8 bg-bg-light/50 border-t-2 border-shadow/30 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 sm:py-6 bg-soft-watermelon rounded-full text-white text-xl sm:text-2xl font-bold shadow-block flex items-center justify-center gap-3 sm:gap-4 active:translate-y-2 active:shadow-block-pressed"
          >
            <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
            Späť
          </button>
        </div>
      </div>
    </div>
  );
}
