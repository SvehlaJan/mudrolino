/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Gamepad2, HelpCircle, Mic, Palette, Share2 } from 'lucide-react';
import { AppScreen, BackButton, PageHeader, TopBar, cn, uiTokens } from '../shared/ui';
import { pwaBrand } from '../pwa/pwaConfig';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { getUiCopy } from '../shared/uiCopy';
import { useParentZone } from './ParentZoneContext';
import { shareApp, type ShareAppResult } from './shareApp';

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
    description: 'Písmo, súkromie a verzia aplikácie.',
    icon: <Palette size={24} className="sm:h-7 sm:w-7" />,
  },
  {
    to: '/settings/help',
    title: 'Pomoc a spätná väzba',
    description: 'Pomôžte nám zlepšiť aplikáciu.',
    icon: <HelpCircle size={24} className="sm:h-7 sm:w-7" />,
  },
];

const destinationClassName = cn(
  uiTokens.card,
  'flex items-center justify-between gap-4 text-text-main transition-all hover:scale-[1.01] active:translate-y-1 active:shadow-block-pressed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
);

function DestinationContent({ title, description, icon }: Omit<DashboardDestination, 'to'>) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
        {icon}
      </div>
      <div className="min-w-0">
        <span className="block text-xl font-bold leading-tight sm:text-2xl">{title}</span>
        <span className="mt-1 block text-sm font-medium leading-snug text-text-muted sm:text-base">
          {description}
        </span>
      </div>
    </div>
  );
}

/** Lives behind the parent gate so a child cannot open the share sheet by accident. */
function ShareAppAction() {
  const locale = useContentLocale();
  const [result, setResult] = useState<ShareAppResult | null>(null);
  const url = pwaBrand.siteUrl;

  async function handleShare() {
    setResult(await shareApp({ title: pwaBrand.appName, text: getUiCopy(locale, 'parent.share.message'), url }));
  }

  return (
    <div>
      <button type="button" onClick={() => void handleShare()} className={cn(destinationClassName, 'w-full text-left')}>
        <DestinationContent
          title={getUiCopy(locale, 'parent.share.title')}
          description={getUiCopy(locale, 'parent.share.description')}
          icon={<Share2 size={24} className="sm:h-7 sm:w-7" />}
        />
      </button>
      <p role="status" aria-live="polite" className="mt-2 px-2 text-sm font-medium text-text-muted empty:hidden">
        {result === 'copied' && getUiCopy(locale, 'parent.share.copied')}
        {result === 'unavailable' && (
          <>
            {getUiCopy(locale, 'parent.share.manual')}{' '}
            <span className="select-all break-all font-bold text-text-main">{url}</span>
          </>
        )}
      </p>
    </div>
  );
}

export function ParentDashboardScreen() {
  const { closeToChild } = useParentZone();

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => closeToChild({ replace: true })} />} />
      <PageHeader title="Rodičovská zóna" description="Nastavenia, obsah a pomoc pre rodičov." />
      <nav aria-label="Rodičovská zóna" className="mt-5 space-y-3 sm:mt-6">
        {DESTINATIONS.map(destination => (
          <Link key={destination.to} to={destination.to} className={destinationClassName}>
            <DestinationContent title={destination.title} description={destination.description} icon={destination.icon} />
            <ChevronRight size={24} className="shrink-0 text-text-muted sm:h-7 sm:w-7" aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <div className="mt-3">
        <ShareAppAction />
      </div>
    </AppScreen>
  );
}
