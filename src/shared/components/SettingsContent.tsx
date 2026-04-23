/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, MessageSquare, Mic, Music } from 'lucide-react';
import { GameSettings, SettingsTarget } from '../types';
import { audioManager } from '../services/audioManager';
import { SettingToggle } from './SettingToggle';
import { FeedbackModal } from './FeedbackModal';
import { hasFeedbackKey } from '../services/feedbackService';
import { SETTINGS_VISIBILITY } from './settingsContentData';

interface SettingsContentProps {
  target: SettingsTarget;
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onManageRecordings?: () => void;
}

interface SettingsCardProps {
  children: React.ReactNode;
}

interface GameSettingsGroupCardProps {
  title: string;
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

function SettingsCard({ children }: SettingsCardProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
      {children}
    </section>
  );
}

function GameSettingsGroupCard({ title, children }: GameSettingsGroupCardProps) {
  return (
    <SettingsCard>
      <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
      <div className="mt-4 space-y-4">
        {children}
      </div>
    </SettingsCard>
  );
}

function SettingsSection({ children }: SettingsSectionProps) {
  return (
    <div className="rounded-[24px] border border-shadow/15 bg-bg-light/35 p-4 sm:rounded-[28px] sm:p-5">
      {children}
    </div>
  );
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
      <div className={`mt-5 grid gap-3 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`rounded-2xl py-4 text-lg font-bold transition-all sm:text-xl ${
              selected === option
                ? `${activeClassName} scale-105 text-white shadow-block`
                : 'bg-bg-light text-text-main opacity-70'
            }`}
          >
            {formatLabel(option)}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

export function SettingsContent({ target, settings, onUpdate, onManageRecordings }: SettingsContentProps) {
  const visibility = SETTINGS_VISIBILITY[target];
  const isHome = target === 'home';
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-8">
      {visibility.music && (
        <SettingsCard>
          <SettingToggle
            label="Hudba"
            description="Hudba na pozadí počas hrania"
            icon={<Music size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-shadow/35"
            checked={settings.music}
            onToggle={() => {
              const newMusic = !settings.music;
              audioManager.updateSettings({ music: newMusic });
              onUpdate({ ...settings, music: newMusic });
            }}
          />
        </SettingsCard>
      )}

      {visibility.recordings && onManageRecordings && (
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
              <Mic size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Vlastné nahrávky</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Nahraj vlastný hlas pre písmená, slová a frázy.
              </p>
            </div>
          </div>
          <button
            onClick={onManageRecordings}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-accent-blue py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed"
          >
            <Mic size={24} />
            Spravovať nahrávky
          </button>
        </SettingsCard>
      )}

      {visibility.alphabetAccents && isHome && (
        <GameSettingsGroupCard title="Abeceda">
          <SettingToggle
            label="Písmená s dĺžňami a mäkčeňmi"
            description="Rozšíriť hru o slovenské znaky."
            icon={<Languages size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-accent-blue/35"
            checked={settings.alphabetAccents}
            onToggle={() => onUpdate({ ...settings, alphabetAccents: !settings.alphabetAccents })}
            activeColorClassName="bg-accent-blue"
          />
          <SettingsRangeCard
            title="Počet kariet"
            description="Vyberte počet kariet v hre."
            options={[4, 6, 8]}
            selected={settings.alphabetGridSize}
            activeClassName="bg-accent-blue"
            formatLabel={(value) => String(value)}
            onSelect={(value) => onUpdate({ ...settings, alphabetGridSize: value as GameSettings['alphabetGridSize'] })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.alphabetAccents && !isHome && (
        <SettingsCard>
          <SettingToggle
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

      {visibility.alphabetGridSize && !isHome && (
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

      {visibility.syllablesGridSize && isHome && (
        <GameSettingsGroupCard title="Slabiky">
          <SettingsRangeCard
            title="Počet kariet"
            description="Vyberte počet kariet v hre."
            options={[4, 6]}
            selected={settings.syllablesGridSize}
            activeClassName="bg-primary"
            formatLabel={(value) => String(value)}
            onSelect={(value) => onUpdate({ ...settings, syllablesGridSize: value as GameSettings['syllablesGridSize'] })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.syllablesGridSize && !isHome && (
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

      {visibility.numbersRange && isHome && (
        <GameSettingsGroupCard title="Čísla">
          <SettingsRangeCard
            title="Rozsah čísel"
            description="Vyberte rozsah čísel pre hru."
            options={[5, 10, 20]}
            selected={settings.numbersRange.end}
            activeClassName="bg-accent-blue"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, numbersRange: { start: 1, end: value as 5 | 10 | 20 } })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.numbersRange && !isHome && (
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

      {visibility.countingRange && isHome && (
        <GameSettingsGroupCard title="Počítanie">
          <SettingsRangeCard
            title="Rozsah počítania"
            description="Vyberte rozsah pre počítanie predmetov."
            options={[5, 10]}
            selected={settings.countingRange.end}
            activeClassName="bg-soft-watermelon"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.countingRange && !isHome && (
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

      {hasFeedbackKey() && (
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#8b5cf6]/20 text-text-main sm:h-16 sm:w-16">
              <MessageSquare size={24} className="sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold leading-tight sm:text-2xl">Spätná väzba</h3>
              <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
                Pomôžte nám zlepšiť aplikáciu
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#8b5cf6] py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed"
          >
            <MessageSquare size={24} />
            Odoslať spätnú väzbu
          </button>
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
