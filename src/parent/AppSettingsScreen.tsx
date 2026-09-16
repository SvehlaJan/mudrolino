/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppScreen, BackButton, Card, PageHeader, RadioGroupControl, TopBar } from '../shared/ui';
import { applyFontFamily, type AppFontFamily, type AppSettings } from '../shared/services/appSettingsStore';

interface AppSettingsScreenProps {
  appSettings: AppSettings;
  onUpdate(next: AppSettings): void;
}

const FONT_OPTIONS: { value: AppFontFamily; label: React.ReactNode }[] = [
  { value: 'nunito', label: <span style={{ fontFamily: '"Nunito", sans-serif' }}>Zaoblené (Nunito)</span> },
  { value: 'shantell', label: <span style={{ fontFamily: '"Shantell Sans", cursive, sans-serif' }}>Hravé (Shantell)</span> },
];

export function AppSettingsScreen({ appSettings, onUpdate }: AppSettingsScreenProps) {
  const navigate = useNavigate();

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title="Rodičovská zóna" description="Aplikácia a vzhľad" />
      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">Písmo</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">Štýl písma v celej aplikácii.</p>
        <div className="mt-4">
          <RadioGroupControl
            ariaLabel="Písmo"
            tone="accent"
            columns={2}
            value={appSettings.fontFamily}
            onValueChange={(value) => {
              applyFontFamily(value);
              onUpdate({ ...appSettings, fontFamily: value });
            }}
            options={FONT_OPTIONS}
          />
        </div>
      </Card>
    </AppScreen>
  );
}
