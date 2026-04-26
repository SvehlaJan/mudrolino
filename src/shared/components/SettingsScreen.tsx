/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSettings } from '../types';
import { SettingsContent } from './SettingsContent';
import { AppScreen, BackButton, TopBar } from '../ui';

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
    <AppScreen fixedHeight={false} scrollable maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/')} />} />

      <div className="mb-6 text-center sm:mb-8">
        <h2 className="mb-2 text-3xl font-bold sm:text-5xl">Rodičovská zóna</h2>
        <p className="text-base font-medium opacity-60 sm:text-xl">Nastavenia</p>
      </div>

      <SettingsContent
        target="home"
        settings={settings}
        onUpdate={onUpdate}
        onManageRecordings={() => navigate('/content')}
      />
    </AppScreen>
  );
}
