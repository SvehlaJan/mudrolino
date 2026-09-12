/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Eye,
  Hash,
  Languages,
  LayoutGrid,
  MessageSquare,
  Mic,
  Type,
} from 'lucide-react';
import { GameSettings, SettingsTarget } from '../types';
import { additionRangeForcesNumerals, applyAdditionSumRangeChange } from '../services/settingsService';
import { FeedbackModal } from './FeedbackModal';
import { SETTINGS_VISIBILITY } from './settingsContentData';
import { Card, SegmentedChoice, ToggleControl, cx, uiTokens } from '../ui';
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
  className?: string;
}

interface SettingsSectionProps {
  children: React.ReactNode;
  className?: string;
  isModal?: boolean;
}

interface SettingsRangeCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  options: readonly number[];
  selected: number;
  activeClassName: string;
  onSelect: (value: number) => void;
  formatLabel?: (value: number) => string;
  className?: string;
  isModal?: boolean;
}

interface SettingsNavCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const COMPLETE_LETTER_MISSING_COUNT_OPTIONS = [1, 2, 'adaptive'] as const;

function SettingsCard({ children, className }: SettingsCardProps) {
  return <Card className={className}>{children}</Card>;
}

function SettingsSection({ children, className, isModal }: SettingsSectionProps) {
  if (isModal) {
    return <div className={cx('p-1 sm:p-2 pt-3 sm:pt-4 first:pt-0', className)}>{children}</div>;
  }
  return <Card variant="inset" className={className}>{children}</Card>;
}

function SettingsNavCard({ icon, title, description, onClick }: SettingsNavCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        uiTokens.card,
        'flex w-full items-center justify-between gap-4 text-left text-text-main transition-all hover:scale-[1.01] active:translate-y-1 active:shadow-block-pressed cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-blue/40',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-xl font-bold leading-tight sm:text-2xl text-text-main">{title}</span>
          <span className="mt-1 block text-sm font-medium leading-snug opacity-55 sm:text-base text-text-main">
            {description}
          </span>
        </div>
      </div>
      <ChevronRight size={24} className="shrink-0 text-text-main opacity-40 sm:h-7 sm:w-7" aria-hidden="true" />
    </button>
  );
}

function SettingsRangeCard({
  icon,
  title,
  description,
  options,
  selected,
  activeClassName,
  onSelect,
  formatLabel = String,
  className,
  isModal,
}: SettingsRangeCardProps) {
  return (
    <SettingsSection className={className} isModal={isModal}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
          <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 landscape:mt-2">
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
  className,
  isModal,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  className?: string;
  isModal?: boolean;
}) {
  const objectsDisabled = additionRangeForcesNumerals(settings.additionSumRange);
  return (
    <SettingsSection className={className} isModal={isModal}>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
          <Eye size={24} className="sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
          <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
            {objectsDisabled
              ? 'Predmety sú dostupné len pri rozsahu 5 alebo 10.'
              : 'Predmety na počítanie, alebo napísané čísla.'}
          </p>
        </div>
      </div>
      <div className="mt-4 landscape:mt-2">
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
  className,
  isModal,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  className?: string;
  isModal?: boolean;
}) {
  return (
    <SettingsRangeCard
      icon={<Hash size={24} className="sm:h-7 sm:w-7" />}
      title="Rozsah súčtu"
      description="Najväčší možný súčet."
      options={ADDITION_SUM_RANGE_OPTIONS}
      selected={settings.additionSumRange}
      activeClassName="bg-accent-blue"
      formatLabel={(value) => String(value)}
      onSelect={(value) => onUpdate(applyAdditionSumRangeChange(settings, value as GameSettings['additionSumRange']))}
      className={className}
      isModal={isModal}
    />
  );
}

function CompleteLetterMissingCountCard({
  selected,
  onSelect,
  className,
  isModal,
}: {
  selected: GameSettings['completeLetterMissingCount'];
  onSelect: (value: GameSettings['completeLetterMissingCount']) => void;
  className?: string;
  isModal?: boolean;
}) {
  return (
    <SettingsSection className={className} isModal={isModal}>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
          <Type size={24} className="sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold sm:text-2xl">Chýbajúce písmená</h3>
          <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
            Vyberte, koľko písmen má v slove chýbať.
          </p>
        </div>
      </div>
      <div className="mt-4 landscape:mt-2">
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

  const isModal = target !== 'home';
  const visibleCardsCount = Object.values(visibility).filter(Boolean).length;
  const singleCardClassName = undefined;

  return (
    <div
      className={cx(
        'flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 landscape:p-2.5',
        isModal
          ? 'space-y-4 landscape:space-y-2 divide-y divide-shadow/15'
          : 'space-y-3 sm:space-y-4',
      )}
    >
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
        <SettingsNavCard
          icon={<Mic size={24} className="sm:h-7 sm:w-7" />}
          title="Vlastný obsah"
          description="Nahraj vlastný hlas pre písmená, slová a frázy."
          onClick={onManageRecordings}
        />
      )}

      {visibility.alphabetAccents && (
        <SettingsSection className={singleCardClassName} isModal={isModal}>
          <ToggleControl
            label="Písmená s dĺžňami a mäkčeňmi"
            description="Rozšíriť hru o slovenské znaky."
            icon={<Languages size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-accent-blue/35"
            checked={settings.alphabetAccents}
            onToggle={() => onUpdate({ ...settings, alphabetAccents: !settings.alphabetAccents })}
            activeColorClassName="bg-accent-blue"
          />
        </SettingsSection>
      )}

      {visibility.completeLetterMissingCount && (
        <CompleteLetterMissingCountCard
          selected={settings.completeLetterMissingCount}
          onSelect={(value) => onUpdate({ ...settings, completeLetterMissingCount: value })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.alphabetGridSize && (
        <SettingsRangeCard
          icon={<LayoutGrid size={24} className="sm:h-7 sm:w-7" />}
          title="Počet kariet"
          description="Vyberte počet kariet v hre."
          options={[4, 6, 8]}
          selected={settings.alphabetGridSize}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => String(value)}
          onSelect={(value) => onUpdate({ ...settings, alphabetGridSize: value as GameSettings['alphabetGridSize'] })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.syllablesGridSize && (
        <SettingsRangeCard
          icon={<LayoutGrid size={24} className="sm:h-7 sm:w-7" />}
          title="Počet kariet"
          description="Vyberte počet kariet v hre."
          options={[4, 6]}
          selected={settings.syllablesGridSize}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => String(value)}
          onSelect={(value) => onUpdate({ ...settings, syllablesGridSize: value as GameSettings['syllablesGridSize'] })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.numbersRange && (
        <SettingsRangeCard
          icon={<Hash size={24} className="sm:h-7 sm:w-7" />}
          title="Rozsah čísel"
          description="Vyberte rozsah čísel pre hru."
          options={[5, 10, 20]}
          selected={settings.numbersRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, numbersRange: { start: 1, end: value as 5 | 10 | 20 } })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.countingRange && (
        <SettingsRangeCard
          icon={<Hash size={24} className="sm:h-7 sm:w-7" />}
          title="Rozsah počítania"
          description="Vyberte rozsah počítania predmetov."
          options={[5, 10]}
          selected={settings.countingRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.compareMode && (
        <SettingsSection className={singleCardClassName} isModal={isModal}>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
              <Eye size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
              <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
                Predmety na počítanie, alebo napísané čísla.
              </p>
            </div>
          </div>
          <div className="mt-4 landscape:mt-2">
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
          icon={<Hash size={24} className="sm:h-7 sm:w-7" />}
          title="Rozsah čísel"
          description="Vyberte rozsah čísel pre porovnávanie."
          options={[5, 10]}
          selected={settings.compareRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
          className={singleCardClassName}
          isModal={isModal}
        />
      )}

      {visibility.additionRepresentation && (
        <AdditionRepresentationCard settings={settings} onUpdate={onUpdate} className={singleCardClassName} isModal={isModal} />
      )}

      {visibility.additionSumRange && (
        <AdditionSumRangeCard settings={settings} onUpdate={onUpdate} className={singleCardClassName} isModal={isModal} />
      )}

      {target !== 'home' && visibleCardsCount === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center text-text-main opacity-60 landscape:col-span-2">
          <p className="text-base sm:text-lg font-medium">Táto hra nemá žiadne ďalšie nastavenia.</p>
        </div>
      )}

      {target === 'home' && (
        <SettingsNavCard
          icon={<MessageSquare size={24} className="sm:h-7 sm:w-7" />}
          title="Spätná väzba"
          description="Pomôžte nám zlepšiť aplikáciu"
          onClick={() => setIsFeedbackOpen(true)}
        />
      )}

      {isFeedbackOpen &&
        createPortal(
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
