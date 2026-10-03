/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { GameDefinition, GameIconId } from '../shared/gameCatalog';
import { getUiCopy } from '../shared/uiCopy';
import { cn } from '../shared/ui/utils';

// Each drawing shows the game's task rather than an unrelated generic app symbol.
const gameGlyphs: Record<GameIconId, React.ReactNode> = {
  letters: <><rect x="4" y="9" width="24" height="29" rx="5" /><rect x="24" y="18" width="20" height="25" rx="5" fill="currentColor" fillOpacity=".1" /><text x="16" y="30" fontSize="21">A</text><text x="34" y="36" fontSize="16">B</text></>,
  syllables: <><rect x="3" y="12" width="20" height="25" rx="5" /><rect x="25" y="12" width="20" height="25" rx="5" /><text x="13" y="29" fontSize="11">MA</text><text x="35" y="29" fontSize="11">MA</text><path d="M12 7h24M12 7v2m24-2v2" /></>,
  numbers: <><rect x="3" y="6" width="19" height="25" rx="5" /><rect x="17" y="17" width="19" height="25" rx="5" fill="var(--color-success-surface)" /><rect x="31" y="3" width="14" height="21" rx="4" /><text x="12" y="24" fontSize="20">1</text><text x="26" y="35" fontSize="20">2</text><text x="38" y="18" fontSize="14">3</text></>,
  counting: <><g fill="currentColor" stroke="none"><circle cx="10" cy="12" r="4" /><circle cx="25" cy="9" r="4" /><circle cx="13" cy="28" r="4" /><circle cx="29" cy="24" r="4" /></g><path d="M5 38h29m-29-3v6m29-6v6" /><text x="42" y="33" fontSize="19">4</text></>,
  compare: <><rect x="2" y="9" width="14" height="30" rx="5" /><rect x="32" y="9" width="14" height="30" rx="5" /><g fill="currentColor" stroke="none"><circle cx="9" cy="24" r="3" /><circle cx="39" cy="16" r="3" /><circle cx="39" cy="24" r="3" /><circle cx="39" cy="32" r="3" /></g><path d="m27 17-7 7 7 7" /></>,
  addition: <><text x="9" y="19" fontSize="18">2</text><path d="M20 11h8m-4-4v8" /><text x="39" y="19" fontSize="18">1</text><path d="M7 26h34" /><g fill="currentColor" stroke="none"><circle cx="12" cy="37" r="4" /><circle cx="24" cy="37" r="4" /><circle cx="36" cy="37" r="4" /></g></>,
  words: <><rect x="5" y="3" width="38" height="18" rx="5" /><text x="24" y="16" fontSize="12">DOM</text><path d="m12 33 12-9 12 9v12H12Z" /><path d="M21 45V35h6v10" /></>,
  'first-letter': <><rect x="3" y="9" width="20" height="29" rx="5" fill="currentColor" fillOpacity=".15" /><text x="13" y="30" fontSize="21">A</text><text x="35" y="28" fontSize="11">UTO</text><path d="M7 43h12" /></>,
  assembly: <><rect x="3" y="3" width="20" height="18" rx="4" /><rect x="25" y="3" width="20" height="18" rx="4" /><text x="13" y="16" fontSize="11">MA</text><text x="35" y="16" fontSize="11">MA</text><path d="m13 24 11 6 11-6m-11 6v3" /><rect x="5" y="34" width="38" height="12" rx="4" fill="currentColor" fillOpacity=".1" /><text x="24" y="43" fontSize="10">MAMA</text></>,
  'complete-syllable': <><rect x="3" y="3" width="20" height="22" rx="4" strokeDasharray="3 3" /><rect x="25" y="3" width="20" height="22" rx="4" /><text x="13" y="19" fontSize="16">?</text><text x="35" y="18" fontSize="11">MA</text><rect x="3" y="34" width="20" height="12" rx="4" fill="currentColor" fillOpacity=".1" /><text x="13" y="43" fontSize="10">MA</text><path d="M13 32v-4m-3 2 3-3 3 3" /></>,
  'complete-letter': <><rect x="3" y="3" width="20" height="22" rx="4" strokeDasharray="3 3" /><text x="13" y="19" fontSize="16">?</text><text x="35" y="18" fontSize="11">UTO</text><rect x="5" y="34" width="16" height="12" rx="4" fill="currentColor" fillOpacity=".1" /><text x="13" y="44" fontSize="12">A</text><path d="M13 32v-4m-3 2 3-3 3 3" /></>,
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
