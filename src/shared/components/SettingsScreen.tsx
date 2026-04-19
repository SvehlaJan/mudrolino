/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar, BackButton } from './TopBar';
import { GameSettings } from '../types';
import { SettingsContent } from './SettingsContent';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onReady?: () => void;
}

export function SettingsScreen({ settings, onUpdate, onReady }: SettingsScreenProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!onReady) return;
    const frameId = requestAnimationFrame(() => {
      onReady();
    });

    return () => cancelAnimationFrame(frameId);
  }, [onReady]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col">
        <TopBar left={<BackButton onClick={() => navigate('/')} />} />

        <div className="mb-6 text-center sm:mb-8">
          <h2 className="mb-2 text-3xl font-bold sm:text-5xl">Rodičovská zóna</h2>
          <p className="text-base font-medium opacity-60 sm:text-xl">Nastavenia</p>
        </div>

        <SettingsContent
          target="home"
          settings={settings}
          onUpdate={onUpdate}
          onManageRecordings={() => navigate('/recordings')}
        />
      </div>
    </div>
  );
}
