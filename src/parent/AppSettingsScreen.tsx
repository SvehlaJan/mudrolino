/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppScreen, BackButton, Card, PageHeader, RadioGroupControl, TopBar } from '../shared/ui';
import { applyFontFamily, type AppFontFamily, type AppSettings } from '../shared/services/appSettingsStore';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { getUiCopy, type UiCopyKey } from '../shared/uiCopy';
import { useT } from '../shared/hooks/useT';
import type { SupportedLocale } from '../shared/i18n';
import { BackupCard } from './BackupCard';

const PRIVACY_KEYS: UiCopyKey[] = ['parent.privacy.local', 'parent.privacy.feedback', 'parent.privacy.errors', 'parent.privacy.analytics'];

function AboutCards() {
  const locale = useContentLocale();
  return (
    <>
      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{getUiCopy(locale, 'parent.privacy.title')}</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm font-medium text-text-muted sm:text-base">
          {PRIVACY_KEYS.map(key => <li key={key}>{getUiCopy(locale, key)}</li>)}
        </ul>
      </Card>
      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{getUiCopy(locale, 'parent.about.title')}</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">
          {getUiCopy(locale, 'parent.about.version')}{' '}
          <span className="font-bold text-text-main" data-testid="app-version">{__APP_VERSION__}</span>
        </p>
      </Card>
    </>
  );
}

interface AppSettingsScreenProps {
  appSettings: AppSettings;
  onUpdate(next: AppSettings): void;
  /** A backup restore rewrote stored settings; reload them into app state. */
  onDataRestored(): void;
}

// Each language is named in itself, so a parent finds theirs whatever is active.
const LANGUAGE_OPTIONS: { value: SupportedLocale; label: React.ReactNode }[] = [
  { value: 'sk', label: <span lang="sk">Slovenčina</span> },
  { value: 'cs', label: <span lang="cs">Čeština</span> },
];

export function AppSettingsScreen({ appSettings, onUpdate, onDataRestored }: AppSettingsScreenProps) {
  const navigate = useNavigate();
  const t = useT();
  const fontOptions: { value: AppFontFamily; label: React.ReactNode }[] = [
    { value: 'nunito', label: <span style={{ fontFamily: '"Nunito", sans-serif' }}>{t('Zaoblené (Nunito)')}</span> },
    { value: 'shantell', label: <span style={{ fontFamily: '"Shantell Sans", cursive, sans-serif' }}>{t('Hravé (Shantell)')}</span> },
  ];

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title={t('Rodičovská zóna')} description={t('Aplikácia a vzhľad')} />
      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{t('Jazyk')}</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">
          {t('Jazyk hier, zvukov a celej aplikácie. Vlastné slová a nahrávky sa ukladajú pre každý jazyk zvlášť.')}
        </p>
        <div className="mt-4">
          <RadioGroupControl<SupportedLocale>
            ariaLabel={t('Jazyk')}
            tone="accent"
            columns={2}
            value={appSettings.locale as SupportedLocale}
            onValueChange={(value) => onUpdate({ ...appSettings, locale: value })}
            options={LANGUAGE_OPTIONS}
          />
        </div>
      </Card>
      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{t('Písmo')}</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">{t('Štýl písma v celej aplikácii.')}</p>
        <div className="mt-4">
          <RadioGroupControl
            ariaLabel={t('Písmo')}
            tone="accent"
            columns={2}
            value={appSettings.fontFamily}
            onValueChange={(value) => {
              applyFontFamily(value);
              onUpdate({ ...appSettings, fontFamily: value });
            }}
            options={fontOptions}
          />
        </div>
      </Card>
      <BackupCard onRestored={onDataRestored} />
      <AboutCards />
    </AppScreen>
  );
}
