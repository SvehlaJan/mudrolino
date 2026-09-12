/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, MessageSquare, Mic, Type } from 'lucide-react';
import { GameSettings, SettingsTarget } from '../types';
import { additionRangeForcesNumerals, applyAdditionSumRangeChange } from '../services/settingsService';
import { FeedbackModal } from './FeedbackModal';
import { SETTINGS_VISIBILITY } from './settingsContentData';
import { Button, Card, SegmentedChoice, ToggleControl } from '../ui';
import { AppSettings, AppFontFamily, applyFontFamily } from '../services/appSettingsStore';

interface SettingsContentProps {
  target: SettingsTarget;
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onManageRecordings?: () => void;
  appSettings?: AppSettings;
  onUpdateAppSettings?: (settings: AppSettings) => void;
}

interface SettingsCardProps {
  children: React.ReactNode;
}

interface SettingsSectionProps {
  children: React.ReactNode;
}

interface SettingsRangeCardProps {
  title: string;
  description: string;
  options: readonly number[];
  selected: number;
  activeClassName: string;
  onSelect: (value: number) => void;
  formatLabel?: (value: number) => string;
}

const COMPLETE_LETTER_MISSING_COUNT_OPTIONS = [1, 2, 'adaptive'] as const;

function SettingsCard({ children }: SettingsCardProps) {
  return <Card>{children}</Card>;
}

function SettingsSection({ children }: SettingsSectionProps) {
  return <Card variant="inset">{children}</Card>;
}

function SettingsRangeCard({
  title,
  description,
  options,
  selected,
  activeClassName,
  onSelect,
  formatLabel = String,
}: SettingsRangeCardProps) {
  return (
    <SettingsSection>
      <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
      <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
        {description}
      </p>
      <div className="mt-5">
        <SegmentedChoice
          options={options}
          selected={selected}
          activeClassName={activeClassName}
          formatLabel={formatLabel}
          onSelect={onSelect}
          columns={options.length === 2 ? 2 : options.length === 4 ? 4 : 3}
        />
      </div>
    </SettingsSection>
  );
}

const ADDITION_SUM_RANGE_OPTIONS = [5, 10, 20, 100] as const;

function AdditionRepresentationCard({
  settings,
  onUpdate,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}) {
  const objectsDisabled = additionRangeForcesNumerals(settings.additionSumRange);
  return (
    <SettingsSection>
      <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
      <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
        {objectsDisabled
          ? 'Predmety sú dostupné len pri rozsahu 5 alebo 10.'
          : 'Predmety na počítanie, alebo napísané čísla.'}
      </p>
      <div className="mt-5">
        <SegmentedChoice
          options={['objects', 'numerals'] as const}
          selected={settings.additionRepresentation}
          disabledOptions={objectsDisabled ? (['objects'] as const) : undefined}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => (value === 'objects' ? 'Predmety' : 'Čísla')}
          onSelect={(value) => onUpdate({ ...settings, additionRepresentation: value })}
          columns={2}
        />
      </div>
    </SettingsSection>
  );
}

function AdditionSumRangeCard({
  settings,
  onUpdate,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}) {
  return (
    <SettingsRangeCard
      title="Rozsah sčítania"
      description="Najväčší možný súčet."
      options={ADDITION_SUM_RANGE_OPTIONS}
      selected={settings.additionSumRange}
      activeClassName="bg-accent-blue"
      formatLabel={(value) => String(value)}
      onSelect={(value) => onUpdate(applyAdditionSumRangeChange(settings, value as GameSettings['additionSumRange']))}
    />
  );
}

function CompleteLetterMissingCountCard({
  selected,
  onSelect,
}: {
  selected: GameSettings['completeLetterMissingCount'];
  onSelect: (value: GameSettings['completeLetterMissingCount']) => void;
}) {
  return (
    <SettingsSection>
      <h3 className="text-xl font-bold sm:text-2xl">Chýbajúce písmená</h3>
      <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
        Vyberte, koľko písmen má v slove chýbať.
      </p>
      <div className="mt-5">
        <SegmentedChoice
          options={COMPLETE_LETTER_MISSING_COUNT_OPTIONS}
          selected={selected}
          activeClassName="bg-success"
          columns={3}
          formatLabel={(value) => {
            if (value === 'adaptive') return 'Podľa dĺžky';
            return String(value);
          }}
          onSelect={onSelect}
        />
      </div>
    </SettingsSection>
  );
}

export function SettingsContent({
  target,
  settings,
  onUpdate,
  onManageRecordings,
  appSettings,
  onUpdateAppSettings,
}: SettingsContentProps) {
  const visibility = SETTINGS_VISIBILITY[target];
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 space-y-3 sm:space-y-4 overflow-y-auto p-3 sm:p-4 landscape:p-3">
      {appSettings && onUpdateAppSettings && (
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
              <Type size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Písmo</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Štýl písma v celej aplikácii.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <SegmentedChoice<AppFontFamily>
              options={['nunito', 'shantell']}
              selected={appSettings.fontFamily}
              activeClassName="bg-accent-blue"
              formatLabel={(value) => (
                <span style={{ fontFamily: value === 'nunito' ? '"Nunito", sans-serif' : '"Shantell Sans", cursive, sans-serif' }}>
                  {value === 'nunito' ? 'Zaoblené (Nunito)' : 'Hravé (Shantell)'}
                </span>
              )}
              onSelect={(value) => {
                applyFontFamily(value);
                onUpdateAppSettings({ ...appSettings, fontFamily: value });
              }}
              columns={2}
            />
          </div>
        </SettingsCard>
      )}

      {visibility.recordings && onManageRecordings && (
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
              <Mic size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Vlastný obsah</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Nahraj vlastný hlas pre písmená, slová a frázy.
              </p>
            </div>
          </div>
          <Button onClick={onManageRecordings} fullWidth className="mt-5" icon={<Mic size={24} />}>
            Vlastný obsah
          </Button>
        </SettingsCard>
      )}

      {visibility.alphabetAccents && (
        <SettingsCard>
          <ToggleControl
            label="Písmená s dĺžňami a mäkčeňmi"
            description="Rozšíriť hru o slovenské znaky."
            icon={<Languages size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-accent-blue/35"
            checked={settings.alphabetAccents}
            onToggle={() => onUpdate({ ...settings, alphabetAccents: !settings.alphabetAccents })}
            activeColorClassName="bg-accent-blue"
          />
        </SettingsCard>
      )}

      {visibility.completeLetterMissingCount && (
        <CompleteLetterMissingCountCard
          selected={settings.completeLetterMissingCount}
          onSelect={(value) => onUpdate({ ...settings, completeLetterMissingCount: value })}
        />
      )}

      {visibility.alphabetGridSize && (
        <SettingsRangeCard
          title="Počet kariet"
          description="Vyberte počet kariet v hre."
          options={[4, 6, 8]}
          selected={settings.alphabetGridSize}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => String(value)}
          onSelect={(value) => onUpdate({ ...settings, alphabetGridSize: value as GameSettings['alphabetGridSize'] })}
        />
      )}

      {visibility.syllablesGridSize && (
        <SettingsRangeCard
          title="Počet kariet"
          description="Vyberte počet kariet v hre."
          options={[4, 6]}
          selected={settings.syllablesGridSize}
          activeClassName="bg-primary"
          formatLabel={(value) => String(value)}
          onSelect={(value) => onUpdate({ ...settings, syllablesGridSize: value as GameSettings['syllablesGridSize'] })}
        />
      )}

      {visibility.numbersRange && (
        <SettingsRangeCard
          title="Hra s číslami"
          description="Vyberte rozsah čísel pre hru."
          options={[5, 10, 20]}
          selected={settings.numbersRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, numbersRange: { start: 1, end: value as 5 | 10 | 20 } })}
        />
      )}

      {visibility.countingRange && (
        <SettingsRangeCard
          title="Počítanie predmetov"
          description="Vyberte rozsah pre počítanie predmetov."
          options={[5, 10]}
          selected={settings.countingRange.end}
          activeClassName="bg-soft-watermelon"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}

      {visibility.compareMode && (
        <SettingsSection>
          <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
          <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
            Predmety na počítanie, alebo napísané čísla.
          </p>
          <div className="mt-5">
            <SegmentedChoice
              options={['objects', 'numerals'] as const}
              selected={settings.compareMode}
              activeClassName="bg-accent-blue"
              formatLabel={(value) => (value === 'objects' ? 'Predmety' : 'Čísla')}
              onSelect={(value) => onUpdate({ ...settings, compareMode: value })}
              columns={2}
            />
          </div>
        </SettingsSection>
      )}

      {visibility.compareRange && (
        <SettingsRangeCard
          title="Viac alebo Menej"
          description="Vyberte rozsah čísel pre porovnávanie."
          options={[5, 10]}
          selected={settings.compareRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}

      {visibility.additionRepresentation && (
        <AdditionRepresentationCard settings={settings} onUpdate={onUpdate} />
      )}

      {visibility.additionSumRange && (
        <AdditionSumRangeCard settings={settings} onUpdate={onUpdate} />
      )}

      {target === 'home' && (
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
              <MessageSquare size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Spätná väzba</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Pomôžte nám zlepšiť aplikáciu
              </p>
            </div>
          </div>
          <Button onClick={() => setIsFeedbackOpen(true)} fullWidth className="mt-5" icon={<MessageSquare size={24} />}>
            Odoslať spätnú väzbu
          </Button>
        </SettingsCard>
      )}

      {createPortal(
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          screen={target}
        />,
        document.body
      )}
    </div>
  );
}
