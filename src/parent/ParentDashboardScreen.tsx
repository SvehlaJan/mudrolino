/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Gamepad2, HelpCircle, Mic, Palette } from 'lucide-react';
import { AppScreen, BackButton, PageHeader, TopBar, cn, uiTokens } from '../shared/ui';
import { useParentZone } from './ParentZoneContext';

interface DashboardDestination {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const DESTINATIONS: DashboardDestination[] = [
  {
    to: '/settings/games',
    title: 'Nastavenia hier',
    description: 'Rozsahy, obtiažnosť a zobrazenie pre jednotlivé hry.',
    icon: <Gamepad2 size={24} className="sm:h-7 sm:w-7" />,
  },
  {
    to: '/content',
    title: 'Vlastný obsah',
    description: 'Nahraj vlastný hlas pre písmená, slová a frázy.',
    icon: <Mic size={24} className="sm:h-7 sm:w-7" />,
  },
  {
    to: '/settings/app',
    title: 'Aplikácia a vzhľad',
    description: 'Štýl písma a ďalšie nastavenia aplikácie.',
    icon: <Palette size={24} className="sm:h-7 sm:w-7" />,
  },
  {
    to: '/settings/help',
    title: 'Pomoc a spätná väzba',
    description: 'Pomôžte nám zlepšiť aplikáciu.',
    icon: <HelpCircle size={24} className="sm:h-7 sm:w-7" />,
  },
];

export function ParentDashboardScreen() {
  const { closeToChild } = useParentZone();

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => closeToChild({ replace: true })} />} />
      <PageHeader title="Rodičovská zóna" description="Nastavenia, obsah a pomoc pre rodičov." />
      <nav aria-label="Rodičovská zóna" className="mt-5 space-y-3 sm:mt-6">
        {DESTINATIONS.map(destination => (
          <Link
            key={destination.to}
            to={destination.to}
            className={cn(
              uiTokens.card,
              'flex items-center justify-between gap-4 text-text-main transition-all hover:scale-[1.01] active:translate-y-1 active:shadow-block-pressed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
                {destination.icon}
              </div>
              <div className="min-w-0">
                <span className="block text-xl font-bold leading-tight sm:text-2xl">{destination.title}</span>
                <span className="mt-1 block text-sm font-medium leading-snug text-text-muted sm:text-base">
                  {destination.description}
                </span>
              </div>
            </div>
            <ChevronRight size={24} className="shrink-0 text-text-muted sm:h-7 sm:w-7" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </AppScreen>
  );
}
