/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar, BackButton } from './TopBar';
import { SettingToggle } from './SettingToggle';
import { GameSettings } from '../types';
import { audioManager } from '../services/audioManager';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}

export function SettingsScreen({ settings, onUpdate }: SettingsScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100svh] bg-bg-light flex flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="w-full max-w-2xl mx-auto flex flex-col flex-1">
        <TopBar left={<BackButton onClick={() => navigate('/')} />} />

        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">Rodičovská zóna</h2>
          <p className="text-base sm:text-xl opacity-60 font-medium">Nastavenia</p>
        </div>

        <div className="space-y-4 sm:space-y-8 flex-1">
          <SettingToggle
            label="Hudba"
            icon={<Music size={24} className="sm:w-8 sm:h-8" />}
            active={settings.music}
            color="bg-shadow"
            onToggle={() => {
              const newMusic = !settings.music;
              audioManager.updateSettings({ music: newMusic });
              onUpdate({ ...settings, music: newMusic });
            }}
          />

          <div className="pt-4 pb-8 border-b-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Vlastné nahrávky</h3>
            <button
              onClick={() => navigate('/recordings')}
              className="w-full py-4 bg-accent-blue text-white rounded-2xl font-bold text-xl shadow-block active:translate-y-2 active:shadow-block-pressed flex items-center justify-center gap-3"
            >
              <Mic size={24} />
              Spravovať nahrávky
            </button>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Nahraj vlastný hlas pre každý zvuk</p>
          </div>

          <div className="pt-8 border-t-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Hra s číslami</h3>
            <div className="grid grid-cols-3 gap-4">
              {[5, 10, 20].map((max) => (
                <button
                  key={max}
                  onClick={() => onUpdate({ ...settings, numbersRange: { start: 1, end: max } })}
                  className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                    settings.numbersRange.end === max
                      ? 'bg-accent-blue text-white shadow-block scale-105'
                      : 'bg-bg-light text-text-main opacity-60'
                  }`}
                >
                  1 - {max}
                </button>
              ))}
            </div>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Vyberte rozsah čísel pre hru</p>
          </div>

          <div className="pt-8 pb-8 border-t-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Hra s počítaním</h3>
            <div className="grid grid-cols-2 gap-4">
              {[5, 10].map((max) => (
                <button
                  key={max}
                  onClick={() => onUpdate({ ...settings, countingRange: { start: 1, end: max } })}
                  className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                    settings.countingRange.end === max
                      ? 'bg-soft-watermelon text-white shadow-block scale-105'
                      : 'bg-bg-light text-text-main opacity-60'
                  }`}
                >
                  1 - {max}
                </button>
              ))}
            </div>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Vyberte rozsah pre počítanie predmetov</p>
          </div>
        </div>
      </div>
    </div>
  );
}
