/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2, Mic, Play, RefreshCw, Settings, Trash2, Volume2 } from 'lucide-react';
import { AppScreen } from './AppScreen';
import { BackButton, IconButton } from './IconButton';
import { TopBar } from './TopBar';
import { RoundCounter } from './RoundCounter';
import { Button } from './Button';
import { Card } from './Card';
import { ChoiceTile } from './ChoiceTile';
import { SearchInput, SegmentedChoice, TextAreaControl, ToggleControl } from './FormControls';
import { OverlayFrame } from './OverlayFrame';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export function UiKitScreen() {
  return (
    <AppScreen fixedHeight={false} scrollable maxWidth="wide" contentClassName="gap-8 pb-8">
      <TopBar
        left={<BackButton onClick={() => window.history.back()} />}
        center={<RoundCounter completed={2} total={5} />}
        right={<IconButton label="Nastavenia"><Settings size={24} /></IconButton>}
      />

      <header className="space-y-2">
        <h1 className="text-4xl font-black sm:text-6xl">UI Kit</h1>
        <p className="max-w-3xl text-lg font-medium opacity-65">
          Interná knižnica komponentov pre Hravé Učenie. Táto stránka je skrytá z detskej navigácie a slúži na kontrolu komponentov a stavov.
        </p>
      </header>

      <Section title="Actions">
        <Card className="flex flex-wrap items-center gap-4">
          <Button variant="primary" icon={<Settings size={22} />}>Primárne</Button>
          <Button variant="secondary">Sekundárne</Button>
          <Button variant="quiet">Tiché</Button>
          <Button variant="danger">Dôležité</Button>
          <Button variant="primary" disabled>Vypnuté</Button>
          <Button variant="primary" icon={<Loader2 size={20} className="animate-spin" />}>Odosielam</Button>
          <Button variant="play" aria-label="Hrať"><Play size={56} fill="currentColor" /></Button>
          <IconButton label="Prehrať"><Volume2 size={24} /></IconButton>
          <IconButton label="Nahrať"><Mic size={24} /></IconButton>
        </Card>
      </Section>

      <Section title="Surfaces">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="text-xl font-bold">Karta</h3>
            <p className="mt-2 font-medium opacity-60">Štandardný biely povrch.</p>
          </Card>
          <Card variant="panel">
            <h3 className="text-xl font-bold">Panel</h3>
            <p className="mt-2 font-medium opacity-60">Silnejší povrch pre hru.</p>
          </Card>
          <Card variant="inset">
            <h3 className="text-xl font-bold">Vnorený blok</h3>
            <p className="mt-2 font-medium opacity-60">Používa sa v nastaveniach.</p>
          </Card>
        </div>
        <Card variant="row" className="flex items-center gap-2 transition-colors">
          <Mic size={18} className="shrink-0 text-accent-blue" />
          <span className="flex-1 truncate text-lg font-medium">mama 👩</span>
          <span className="mr-1 shrink-0 text-xs italic opacity-80">Vlastné</span>
          <IconButton label="Zmazať nahrávku" className="h-9 w-9 !bg-shadow/20 !shadow-sm text-text-main/70 sm:h-9 sm:w-9">
            <Trash2 size={16} />
          </IconButton>
          <IconButton label="Prehrať" className="h-9 w-9 !bg-accent-blue/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
            <Play size={16} />
          </IconButton>
          <IconButton label="Nahrať" className="h-9 w-9 !bg-soft-watermelon/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
            <Mic size={16} />
          </IconButton>
        </Card>
      </Section>

      <Section title="Choices">
        <Card className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <ChoiceTile state="neutral"><span className="text-5xl">A</span></ChoiceTile>
            <ChoiceTile state="selected"><span className="text-5xl">B</span></ChoiceTile>
            <ChoiceTile state="correct"><span className="text-5xl">C</span></ChoiceTile>
            <ChoiceTile state="wrong"><span className="text-5xl">D</span></ChoiceTile>
            <ChoiceTile disabled><span className="text-5xl">E</span></ChoiceTile>
          </div>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <ChoiceTile><span className="text-6xl">M</span></ChoiceTile>
            <ChoiceTile state="correct"><span className="text-6xl">A</span></ChoiceTile>
            <ChoiceTile state="wrong"><span className="text-6xl">S</span></ChoiceTile>
            <ChoiceTile><span className="text-6xl">O</span></ChoiceTile>
          </div>
          <SegmentedChoice
            options={[4, 6, 8]}
            selected={6}
            onSelect={() => undefined}
            formatLabel={(value) => `${value} kariet`}
          />
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
                      <span className="flex h-[72px] min-w-[112px] items-center justify-center rounded-[24px] border-2 border-white/30 bg-accent-blue px-6 text-3xl font-black uppercase tracking-wide text-white">
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
                    <span className="flex h-[72px] min-w-[112px] items-center justify-center rounded-[24px] border-2 border-white/30 bg-accent-blue px-6 text-3xl font-black uppercase tracking-wide text-white">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Forms">
        <Card className="space-y-5">
          <ToggleControl
            label="Hudba"
            description="Hudba na pozadí počas hrania"
            checked
            onToggle={() => undefined}
            icon={<Volume2 size={24} />}
          />
          <SearchInput value="mama" onChange={() => undefined} onClear={() => undefined} placeholder="Hľadať..." />
          <TextAreaControl value="Správa pre tím" onChange={() => undefined} rows={3} />
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
        </div>
      </Section>
    </AppScreen>
  );
}
