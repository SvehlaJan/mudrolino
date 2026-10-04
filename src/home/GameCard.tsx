/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { GameDefinition, GameIconId } from '../shared/gameCatalog';
import { getUiCopy } from '../shared/uiCopy';
import { cn } from '../shared/ui/utils';

// Large glyphs and simple silhouettes stay legible in the small home-card badges.
const gameGlyphs: Record<GameIconId, React.ReactNode> = {
  letters: <text x="24" y="36" fontSize="36">A</text>,
  syllables: <><rect x="4" y="9" width="40" height="30" rx="7" /><text x="24" y="30" fontSize="23">MA</text></>,
  numbers: <><rect x="3" y="6" width="19" height="25" rx="5" /><rect x="17" y="17" width="19" height="25" rx="5" fill="var(--color-success-surface)" /><rect x="31" y="3" width="14" height="21" rx="4" /><text x="12" y="24" fontSize="20">1</text><text x="26" y="35" fontSize="20">2</text><text x="38" y="18" fontSize="14">3</text></>,
  counting: <><g fill="currentColor" stroke="none"><circle cx="10" cy="12" r="4" /><circle cx="25" cy="9" r="4" /><circle cx="13" cy="28" r="4" /><circle cx="29" cy="24" r="4" /></g><path d="M5 38h29m-29-3v6m29-6v6" /><text x="42" y="33" fontSize="19">4</text></>,
  compare: <><rect x="2" y="9" width="14" height="30" rx="5" /><rect x="32" y="9" width="14" height="30" rx="5" /><g fill="currentColor" stroke="none"><circle cx="9" cy="24" r="3" /><circle cx="39" cy="16" r="3" /><circle cx="39" cy="24" r="3" /><circle cx="39" cy="32" r="3" /></g><path d="m27 17-7 7 7 7" /></>,
  addition: <><text x="9" y="19" fontSize="18">2</text><path d="M20 11h8m-4-4v8" /><text x="39" y="19" fontSize="18">1</text><path d="M7 26h34" /><g fill="currentColor" stroke="none"><circle cx="12" cy="37" r="4" /><circle cx="24" cy="37" r="4" /><circle cx="36" cy="37" r="4" /></g></>,
  words: <><path d="M24 11c-7-5-14-5-20-3v30c7-2 14-1 20 3 6-4 13-5 20-3V8c-6-2-13-2-20 3Z" /><path d="M24 11v30" /></>,
  'first-letter': <><text x="16" y="35" fontSize="32">A</text><path d="M4 41h24m5-23h11m-11 9h8m-8 9h5" /></>,
  assembly: <><path d="M5 11h13v5a5 5 0 0 0 10 0v-5h15v27H28v-5a5 5 0 0 0-10 0v5H5Z" /></>,
  'complete-syllable': <><rect x="4" y="10" width="17" height="28" rx="5" strokeDasharray="4 4" /><rect x="27" y="10" width="17" height="28" rx="5" fill="currentColor" fillOpacity=".15" /></>,
  'complete-letter': <><text x="18" y="34" fontSize="32">?</text><path d="M33 19h11m-11 10h11M6 41h24" /></>,
};

export function GameIcon({ icon, className }: { icon: GameIconId; className?: string }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn('[&_text]:fill-current [&_text]:stroke-0 [&_text]:font-black', className)}
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" textAnchor="middle">
    {gameGlyphs[icon]}
  </svg>;
}

export interface GameCardProps {
  game: GameDefinition;
  title?: string;
  description?: string;
  locale?: string;
  onClick?: () => void;
  className?: string;
}

export function GameCard({
  game,
  title,
  description,
  locale = 'sk',
  onClick,
  className,
}: GameCardProps) {
  const resolvedTitle = title ?? getUiCopy(locale, game.titleKey);
  const resolvedDescription = description ?? getUiCopy(locale, game.descriptionKey);

  return (
    <Link
      to={game.path}
      data-testid="game-card"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between h-full p-4 sm:p-5 rounded-[24px] sm:rounded-[28px]',
        'bg-white border border-border-subtle shadow-sm',
        'hover:shadow-md hover:border-border-subtle/80',
        'active:translate-y-0.5 transition-all text-left min-w-0',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus outline-offset-2',
        className,
      )}
    >
      <div className="flex flex-col gap-3 min-w-0">
        <div
          className={cn(
            'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
            game.categoryId === 'literacy'
              ? 'bg-selected-surface text-focus'
              : 'bg-success-surface text-[#1f4e3d]',
          )}
          aria-hidden="true"
        >
          <GameIcon icon={game.icon} className="size-9 sm:size-10" />
        </div>
        <div className="min-w-0 flex flex-col gap-1">
          <h3 className="text-base sm:text-lg font-black text-text-main leading-tight tracking-tight">
            {resolvedTitle}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-text-muted leading-snug line-clamp-2">
            {resolvedDescription}
          </p>
        </div>
      </div>
    </Link>
  );
}
