/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Download, Loader2, Mic, MoreHorizontal, Play, RefreshCw, Settings, Square, Trash2, Volume2 } from 'lucide-react';
import { AppScreen } from './AppScreen';
import { BackButton, IconButton } from './IconButton';
import { IconMenuButton } from './IconMenuButton';
import { TopBar } from './TopBar';
import { RoundCounter } from './RoundCounter';
import { AlertDialogShell } from './AlertDialog';
import { Button } from './Button';
import { Card } from './Card';
import { ChoiceTile } from './ChoiceTile';
import { DialogShell } from './Dialog';
import { DropdownMenu } from './DropdownMenu';
import { Field } from './Field';
import { SearchInput, SegmentedChoice, TextAreaControl, ToggleControl } from './FormControls';
import { OverlayFrame } from './OverlayFrame';
import { PageHeader } from './PageHeader';
import { PromptBadge } from './PromptBadge';
import { RadioGroupControl } from './RadioGroup';
import { SwitchControl } from './Switch';
import { Tabs, TabPanel } from './Tabs';
import { cx } from './utils';
import { RecordingListItem } from '../../recordings/RecordingListItem';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

const compactActionClass = '!h-9 !w-9 shrink-0 !shadow-sm active:translate-y-0 active:opacity-60 sm:!h-9 sm:!w-9';

interface RecordingRowExampleProps {
  label: string;
  secondaryLabel?: string;
  indicator: React.ReactNode;
  statusText?: string;
  hasCustom?: boolean;
  engaged?: boolean;
  menuActions?: React.ComponentProps<typeof IconMenuButton>['actions'];
  className?: string;
}

function RecordingRowExample({
  label,
  secondaryLabel,
  indicator,
  statusText,
  hasCustom = false,
  engaged = false,
  menuActions,
  className,
}: RecordingRowExampleProps) {
  return (
    <Card variant="row" className={cx('flex items-center gap-2 transition-colors', className)}>
      <div className="w-[22px] flex items-center justify-center shrink-0">
        {indicator}
      </div>

      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-lg font-medium text-text-main">{label}</span>
        {secondaryLabel && (
          <span className="mt-0.5 block truncate text-xs font-bold uppercase tracking-normal text-text-muted">
            {secondaryLabel}
          </span>
        )}
      </span>

      {statusText && (
        <span className="text-xs italic opacity-80 shrink-0 mr-1">{statusText}</span>
      )}

      {engaged ? (
        <div className="w-9 flex items-center justify-center shrink-0">
          <button
            type="button"
            aria-label="Zastaviť"
            className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center active:opacity-70"
          >
            <Square size={12} className="text-white fill-white" />
          </button>
        </div>
      ) : (
        <>
          <div className="w-9 flex items-center justify-center shrink-0">
            {hasCustom && (
              <IconButton
                label="Zmazať nahrávku"
                className={`${compactActionClass} !bg-shadow/20 text-text-main/70`}
              >
                <Trash2 size={16} />
              </IconButton>
            )}
          </div>

          <div className="w-9 flex items-center justify-center shrink-0">
            <IconButton
              label="Prehrať"
              className={`${compactActionClass} !bg-accent-blue/45 text-text-main`}
            >
              <Play size={16} />
            </IconButton>
          </div>

          <div className="w-9 flex items-center justify-center shrink-0">
            <IconButton
              label="Nahrať"
              className={`${compactActionClass} !bg-soft-watermelon/45 text-text-main`}
            >
              <Mic size={16} />
            </IconButton>
          </div>

          {menuActions && menuActions.length > 0 && (
            <div className="w-9 flex items-center justify-center shrink-0">
              <IconMenuButton
                label="Ďalšie možnosti"
                actions={menuActions}
                className={`${compactActionClass} !bg-transparent !shadow-none text-text-main/70`}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function UiKitDialogDemo() {
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-4">
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        trigger={<Button tone="neutral" size="parent">Otvoriť ukážkový dialóg</Button>}
        title="Ukážkový dialóg"
        description="Toto je ukážkový popis dialógu pre kontrolu prístupnosti."
      >
        <p className="mt-4 text-base font-medium text-text-muted">
          Obsah dialógu, ktorý overuje zachytenie a obnovenie zamerania.
        </p>
        <div className="mt-6 flex justify-end">
          <Button tone="primary" size="parent" onClick={() => setOpen(false)}>Zavrieť</Button>
        </div>
      </DialogShell>

      <AlertDialogShell
        open={alertOpen}
        onOpenChange={setAlertOpen}
        trigger={<Button tone="danger" size="parent">Otvoriť potvrdenie</Button>}
        title="Vymazať položku?"
        description="Túto akciu nie je možné vrátiť späť."
        cancelLabel="Zrušiť"
        actionLabel="Vymazať"
        onAction={() => undefined}
      />
    </div>
  );
}

function UiKitSegmentedChoiceDemo() {
  const [tileCount, setTileCount] = useState<4 | 6 | 8>(6);
  return (
    <SegmentedChoice
      ariaLabel="Počet kariet (segmentovaný výber)"
      options={[4, 6, 8]}
      selected={tileCount}
      onSelect={setTileCount}
      formatLabel={(value) => `${value} kariet`}
    />
  );
}

function UiKitInteractionDemo() {
  const [gridSize, setGridSize] = useState<'4' | '6' | '8'>('6');
  const [diacritics, setDiacritics] = useState(false);
  const [tab, setTab] = useState('words');
  const [customWord, setCustomWord] = useState('');
  const customWordTooLong = customWord.length > 20;

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Rádiová skupina</h3>
        <div className="mt-3 max-w-md">
          <RadioGroupControl
            ariaLabel="Počet kariet"
            options={[
              { value: '4', label: 'Štyri' },
              { value: '6', label: 'Šesť' },
              { value: '8', label: 'Osem' },
            ]}
            value={gridSize}
            onValueChange={setGridSize}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Prepínač</h3>
        <div className="mt-3">
          <SwitchControl
            label="Diakritika"
            description="Zobraziť písmená s dĺžňami a mäkčeňmi."
            checked={diacritics}
            onCheckedChange={setDiacritics}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Karty</h3>
        <Tabs
          ariaLabel="Kategórie vlastného obsahu (ukážka)"
          items={[
            { value: 'words', label: 'Slová (ukážka)' },
            { value: 'praise', label: 'Pochvaly (ukážka)' },
          ]}
          value={tab}
          onValueChange={setTab}
        >
          <TabPanel value="words" className="mt-3 text-base font-medium text-text-muted">
            Obsah karty Slová.
          </TabPanel>
          <TabPanel value="praise" className="mt-3 text-base font-medium text-text-muted">
            Obsah karty Pochvaly.
          </TabPanel>
        </Tabs>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Menu</h3>
        <div className="mt-3">
          <DropdownMenu
            trigger={<IconButton label="Ďalšie možnosti (ukážka)"><MoreHorizontal size={18} /></IconButton>}
            items={[
              { label: 'Upraviť', onSelect: () => undefined },
              { label: 'Zmazať', tone: 'danger', onSelect: () => undefined },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Pole formulára</h3>
        <div className="mt-3 max-w-md">
          <Field
            label="Vlastné slovo"
            helpText="Napríklad meno obľúbenej hračky."
            errorText={customWordTooLong ? 'Slovo je príliš dlhé.' : undefined}
            required
          >
            {fieldProps => (
              <input
                {...fieldProps}
                value={customWord}
                onChange={event => setCustomWord(event.target.value)}
                className="w-full rounded-2xl border-2 border-shadow/10 bg-white px-4 py-3 text-lg font-medium focus:border-accent-blue/50 focus:outline-none"
              />
            )}
          </Field>
        </div>
      </div>
    </Card>
  );
}

export function UiKitScreen() {
  return (
    <AppScreen fixedHeight={false} scrollable maxWidth="wide" contentClassName="gap-8 pb-8">
      <TopBar
        data-testid="ui-kit-topbar"
        left={<BackButton onClick={() => window.history.back()} />}
        center={<RoundCounter completed={2} total={5} />}
        right={<IconButton label="Nastavenia"><Settings size={24} /></IconButton>}
      />

      <header className="space-y-2">
        <h1 className="text-4xl font-black sm:text-6xl">UI Kit</h1>
        <p className="max-w-3xl text-lg font-medium text-text-muted">
          Interná knižnica komponentov pre Hravé Učenie. Táto stránka je skrytá z detskej navigácie a slúži na kontrolu komponentov a stavov.
        </p>
      </header>

      <Section title="Actions — typed variants">
        <Card className="space-y-5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Rodič (tone × veľkosť, min. 44×44)</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button tone="primary" size="parent" data-testid="ui-parent-primary">Primárne</Button>
              <Button tone="neutral" size="parent" data-testid="ui-parent-neutral">Neutrálne</Button>
              <Button tone="quiet" size="parent">Tiché</Button>
              <Button tone="danger" size="parent">Zmazať</Button>
              <Button tone="primary" size="parent" disabled>Vypnuté</Button>
              <Button tone="primary" size="parent" icon={<Loader2 size={18} className="animate-spin" />}>
                Odosielam
              </Button>
              <Button tone="neutral" size="parent" density="compact">Kompaktné</Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Dieťa (tone × veľkosť, min. 48×48)</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button tone="primary" size="child" data-testid="ui-child-primary">Hrať</Button>
              <Button tone="neutral" size="child">Tiché</Button>
              <Button tone="danger" size="child">Zmazať</Button>
              <Button tone="primary" size="play" aria-label="Hrať"><Play size={40} fill="currentColor" /></Button>
              <Button size="child" data-testid="ui-child-size-only">Iba veľkosť</Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Ikonové tlačidlá</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <IconButton label="Prehrať" tone="neutral" size="child"><Volume2 size={24} /></IconButton>
              <IconButton label="Nahrať" tone="primary" size="child"><Mic size={24} /></IconButton>
              <IconButton label="Zmazať" tone="danger" size="parent"><Trash2 size={18} /></IconButton>
              <IconButton label="Ďalšie" tone="neutral" size="parent" density="compact" data-testid="ui-icon-compact-parent"><Settings size={16} /></IconButton>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Actions — legacy compatibility adapter">
        <p className="max-w-3xl text-sm font-medium text-text-muted">
          Staré API (<code>variant</code>, <code>size=&quot;sm|md|lg&quot;</code>) sa naďalej vykresľuje
          nezmenené, kým sa volajúce miesta nepremigrujú na <code>tone</code>/<code>size</code>.
        </p>
        <Card className="mt-3 flex flex-wrap items-center gap-4">
          <Button variant="primary" icon={<Settings size={22} />}>Primárne</Button>
          <Button variant="secondary">Sekundárne</Button>
          <Button variant="quiet">Tiché</Button>
          <Button variant="danger">Dôležité</Button>
          <Button variant="primary" disabled>Vypnuté</Button>
          <Button variant="primary" icon={<Loader2 size={20} className="animate-spin" />}>Odosielam</Button>
          <Button variant="play" aria-label="Hrať"><Play size={56} fill="currentColor" /></Button>
          <Button size="sm" variant="quiet">Malé (sm)</Button>
        </Card>
      </Section>

      <Section title="Surfaces">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="text-xl font-bold">Karta</h3>
            <p className="mt-2 font-medium text-text-muted">Štandardný biely povrch.</p>
          </Card>
          <Card variant="panel">
            <h3 className="text-xl font-bold">Panel</h3>
            <p className="mt-2 font-medium text-text-muted">Silnejší povrch pre hru.</p>
          </Card>
          <Card variant="inset">
            <h3 className="text-xl font-bold">Vnorený blok</h3>
            <p className="mt-2 font-medium text-text-muted">Používa sa v nastaveniach.</p>
          </Card>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Embeds the real, pre-existing RecordingListItem for reference; its contrast
              debt belongs to src/recordings/RecordingListItem.tsx, out of this task's scope. */}
          <div data-testid="ui-kit-legacy-recording-item">
            <RecordingListItem
              item={{ key: 'sk/words/custom-draft', label: 'Jahoda 🍓', category: 'words' }}
              secondaryLabel="JA-HO-DA"
              hasCustom={false}
              isActive={false}
              recorderState="idle"
              speaking={false}
              savedFlash={false}
              statusLabel="Koncept"
              statusTone="draft"
              allowPlay={false}
              recordEmphasis
              onRecord={() => undefined}
              onStop={() => undefined}
              onPlay={() => undefined}
              onDelete={() => undefined}
            />
          </div>

          <div data-testid="ui-kit-legacy-recording-item">
            <RecordingListItem
              item={{ key: 'sk/words/custom-ready', label: 'Jahoda 🍓', category: 'words' }}
              secondaryLabel="JA-HO-DA"
              hasCustom
              isActive={false}
              recorderState="idle"
              speaking={false}
              savedFlash={false}
              statusLabel="Vlastné"
              statusTone="ready"
              onRecord={() => undefined}
              onStop={() => undefined}
              onPlay={() => undefined}
              onDelete={() => undefined}
            />
          </div>

          <div data-testid="ui-kit-legacy-recording-item">
            <RecordingListItem
              item={{ key: 'sk/words/default-ready', label: 'Mama 👩', category: 'words' }}
              secondaryLabel="MA-MA"
              hasCustom={false}
              isActive={false}
              recorderState="idle"
              speaking={false}
              savedFlash={false}
              statusLabel="Predvolené"
              onRecord={() => undefined}
              onStop={() => undefined}
              onPlay={() => undefined}
              onDelete={() => undefined}
            />
          </div>

          <RecordingRowExample
            label="mama 👩"
            indicator={<span className="inline-block h-3 w-3 rounded-full border-2 border-shadow/20" />}
          />

          <RecordingRowExample
            label="jahoda 🍓"
            secondaryLabel="JA-HO-DA"
            indicator={<span className="inline-block h-3 w-3 rounded-full border-2 border-shadow/20" />}
          />

          <RecordingRowExample
            label="auto 🚗"
            indicator={<Mic size={14} className="text-accent-blue" />}
            statusText="Vlastné"
            hasCustom
          />

          <RecordingRowExample
            label="pes 🐶"
            secondaryLabel="PES"
            indicator={<span className="text-sm text-red-400">●</span>}
            statusText="Počujem…"
            engaged
          />

          <RecordingRowExample
            label="vlak 🚂"
            indicator={<span className="inline-block h-3 w-3 rounded-full border-2 border-shadow/20" />}
            menuActions={[
              {
                label: 'Zmazať slovo',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onSelect: () => undefined,
              },
            ]}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-text-main/70" />
              <p className="text-sm font-bold text-text-main">Pridať Teo</p>
            </div>
          </Card>
          <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600" />
              <p className="text-sm font-bold text-text-main">Teo je pripravený aj offline.</p>
            </div>
          </Card>
          <Card className="!rounded-2xl !p-3 text-left !shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-primary" />
              <p className="text-sm font-bold text-text-main">Nová verzia je pripravená.</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Choices">
        <Card className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <ChoiceTile state="neutral" data-testid="ui-choice-neutral"><span className="text-5xl">A</span></ChoiceTile>
            <ChoiceTile state="selected" data-testid="ui-choice-selected"><span className="text-5xl">B</span></ChoiceTile>
            <ChoiceTile state="correct" data-testid="ui-choice-correct"><span className="text-5xl">C</span></ChoiceTile>
            <ChoiceTile state="wrong" data-testid="ui-choice-wrong"><span className="text-5xl">D</span></ChoiceTile>
            <ChoiceTile disabled data-testid="ui-choice-disabled"><span className="text-5xl">E</span></ChoiceTile>
          </div>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <ChoiceTile><span className="text-6xl">M</span></ChoiceTile>
            <ChoiceTile state="correct"><span className="text-6xl">A</span></ChoiceTile>
            <ChoiceTile state="wrong"><span className="text-6xl">S</span></ChoiceTile>
            <ChoiceTile><span className="text-6xl">O</span></ChoiceTile>
          </div>
          <UiKitSegmentedChoiceDemo />
        </Card>
      </Section>

      <Section title="Game Surfaces">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <TopBar
              left={<BackButton onClick={() => undefined} />}
              center={<RoundCounter completed={3} total={5} />}
              right={<IconButton label="Prehrať zvuk"><Volume2 size={24} /></IconButton>}
              className="pb-0"
            />
            <Card className="relative min-h-[220px] overflow-hidden !rounded-[30px] !border-4 !border-dashed !border-shadow/20 !bg-white/50 !p-0 !shadow-none sm:!rounded-[44px]">
              {['🍓', '🍓', '🍓', '🍓', '🍓'].map((emoji, index) => (
                <span
                  key={`${emoji}-${index}`}
                  className="absolute select-none text-5xl sm:text-7xl"
                  style={{
                    left: `${20 + (index % 3) * 28}%`,
                    top: `${28 + Math.floor(index / 3) * 34}%`,
                    transform: `translate(-50%, -50%) rotate(${index % 2 === 0 ? -12 : 14}deg)`,
                  }}
                >
                  {emoji}
                </span>
              ))}
              <IconButton label="Nové kolo" className="absolute bottom-4 right-4 !bg-white/50 text-shadow/40">
                <RefreshCw size={24} />
              </IconButton>
            </Card>
            <div className="grid grid-cols-4 gap-3">
              {[4, 5, 6, 7].map((value) => (
                <ChoiceTile key={value} state={value === 5 ? 'correct' : 'neutral'} className="!aspect-[4/5] text-4xl font-spline sm:!aspect-square sm:text-6xl">
                  {value}
                </ChoiceTile>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center">
              <Card className="min-w-[180px] !rounded-[32px] !px-8 !py-6 text-center !shadow-block sm:min-w-[220px] sm:!rounded-[48px]">
                <div className="text-[72px] leading-none sm:text-[112px]">🍓</div>
              </Card>
            </div>
            <Card className="mx-auto w-full !rounded-[36px] !bg-white/70 !p-4 !shadow-block sm:!rounded-[48px]">
              <div className="grid grid-cols-3 gap-3">
                {['JA', '?', 'DA'].map((text, index) => (
                  <div key={`${text}-${index}`} className="min-h-[88px] rounded-[28px] border-[3px] border-dashed border-shadow/15 bg-bg-light/55 flex items-center justify-center">
                    {text === '?' ? (
                      <span className="text-xl font-black text-shadow/25">?</span>
                    ) : (
                      <span className="flex h-[72px] min-w-[112px] items-center justify-center rounded-[24px] border-2 border-white/30 bg-accent-blue px-6 text-3xl font-black uppercase tracking-wide text-text-main">
                        {text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="mx-auto w-full !rounded-[36px] !p-4 !shadow-block sm:!rounded-[48px]">
              <div className="grid min-h-[112px] grid-cols-3 gap-3">
                {['HO', 'JA', 'DA'].map((text) => (
                  <div key={text} className="min-h-[88px] flex items-center justify-center">
                    <span className="flex h-[72px] min-w-[112px] items-center justify-center rounded-[24px] border-2 border-white/30 bg-accent-blue px-6 text-3xl font-black uppercase tracking-wide text-text-main">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Prompt Badge">
        <div className="flex flex-wrap gap-4 items-center">
          <PromptBadge ariaLabel="Auto">
            <span className="text-6xl sm:text-7xl">🚗</span>
          </PromptBadge>
          <PromptBadge onClick={() => {}} ariaLabel="Klikateľný prompt">
            <span className="text-6xl sm:text-7xl">🍎</span>
          </PromptBadge>
        </div>
      </Section>

      <Section title="Forms">
        <Card className="space-y-5">
          <ToggleControl
            label="Zvukové efekty"
            description="Zvuková odozva pri klepnutí"
            checked
            onToggle={() => undefined}
            icon={<Volume2 size={24} />}
          />
          <SearchInput value="mama" onChange={() => undefined} onClear={() => undefined} placeholder="Hľadať..." />
          <TextAreaControl aria-label="Správa pre tím" value="Správa pre tím" onChange={() => undefined} rows={3} />
        </Card>
      </Section>

      <Section title="Dialogs">
        <UiKitDialogDemo />
      </Section>

      <Section title="Rádiové skupiny, prepínače, karty, menu a polia">
        <UiKitInteractionDemo />
      </Section>

      <Section title="Page Header">
        <Card>
          <PageHeader
            title="Nastavenia hier"
            description="Uprav rozsahy a možnosti pre jednotlivé hry."
            actions={<Button tone="neutral" size="parent">Hotovo</Button>}
          />
        </Card>
      </Section>

      <Section title="Overlay Frame">
        <div className="grid gap-4 lg:grid-cols-2">
          <OverlayFrame show inline tone="success" confetti panelClassName="bg-white shadow-block">
            <div className="text-6xl">🎉</div>
            <h3 className="mt-2 text-4xl font-black text-primary">Výborne!</h3>
            <p className="mt-3 text-2xl font-extrabold text-text-main">Ukážka panelu</p>
          </OverlayFrame>
          <OverlayFrame show inline tone="failure" panelClassName="bg-white shadow-block">
            <div className="text-6xl">🤗</div>
            <h3 className="mt-2 text-4xl font-black text-[#3a4a8a]">Nevadí!</h3>
            <p className="mt-3 text-2xl font-extrabold text-[#5566aa]">Ukážka panelu</p>
          </OverlayFrame>
          <OverlayFrame show inline tone="success" focusOnShow panelClassName="bg-white shadow-block">
            <div className="text-6xl">🏆</div>
            <h3 className="mt-2 text-4xl font-black text-primary">Hotovo!</h3>
            <div className="mt-4 flex justify-center gap-3">
              <Button tone="primary" size="parent">Hrať znova</Button>
              <Button tone="neutral" size="parent">Domov</Button>
            </div>
          </OverlayFrame>
        </div>
      </Section>
    </AppScreen>
  );
}
