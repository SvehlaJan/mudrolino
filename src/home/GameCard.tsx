/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Apple,
  BookOpen,
  Gamepad2,
  Play,
  Plus,
  Puzzle,
  Scale,
  Type,
  WandSparkles,
} from 'lucide-react';
import type { GameDefinition, GameIconId } from '../shared/gameCatalog';
import { getUiCopy } from '../shared/uiCopy';
import { cn } from '../shared/ui/utils';

export function GameIcon({ icon, className }: { icon: GameIconId; className?: string }) {
  switch (icon) {
    case 'letters':
      return <Type className={className} />;
    case 'syllables':
      return <Gamepad2 className={className} />;
    case 'numbers':
      return <Play className={className} fill="currentColor" />;
    case 'counting':
      return <Apple className={className} />;
    case 'compare':
      return <Scale className={className} />;
    case 'addition':
      return <Plus className={className} strokeWidth={3} />;
    case 'words':
      return <BookOpen className={className} />;
    case 'first-letter':
      return <WandSparkles className={className} />;
    case 'assembly':
    case 'complete-syllable':
      return <Puzzle className={className} />;
    case 'complete-letter':
      return <Type className={className} />;
  }
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
          <GameIcon icon={game.icon} className="w-6 h-6 sm:w-7 sm:h-7" />
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
