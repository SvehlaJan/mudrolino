/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Settings } from 'lucide-react';
import { TopBar, BackButton } from './TopBar';
import { COLORS } from '../contentRegistry';

interface GameLobbyProps {
  title: string;
  playButtonColorClassName: string;
  onPlay: () => void;
  onBack: () => void;
  onOpenSettings?: () => void;
  subtitle?: React.ReactNode;
  topDecorationClassName?: string;
  bottomDecorationClassName?: string;
}

function renderTitle(title: string) {
  return title.split('').map((char, i) => (
    <span
      key={`${title}-${i}`}
      className={`${COLORS[i % COLORS.length]} inline-block py-2`}
      style={{
        transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
        textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
      }}
    >
      {char}
    </span>
  ));
}

export function GameLobby({
  title,
  playButtonColorClassName,
  onPlay,
  onBack,
  onOpenSettings,
  subtitle,
  topDecorationClassName,
  bottomDecorationClassName,
}: GameLobbyProps) {
  const settingsButton = onOpenSettings ? (
    <button
      onClick={onOpenSettings}
      aria-label="Nastavenia"
      className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full shadow-block flex items-center justify-center text-text-main transition-all active:translate-y-2 active:shadow-block-pressed"
    >
      <Settings size={24} className="sm:w-7 sm:h-7" />
    </button>
  ) : undefined;

  return (
    <div className="min-h-[100svh] h-[100svh] overflow-hidden relative bg-bg-light flex flex-col items-center px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="w-full max-w-5xl flex-1 min-h-0 flex flex-col">
        <TopBar
          left={<BackButton onClick={onBack} />}
          right={settingsButton}
        />

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 pt-4 sm:pt-6 pb-5 sm:pb-6">
          <div className="text-center w-full max-w-5xl px-4 py-2 shrink-0">
            <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-black flex flex-wrap justify-center gap-1 sm:gap-3 select-none leading-[0.95]">
              {renderTitle(title)}
            </h1>
            {subtitle && (
              <p className="text-[clamp(1.1rem,2.7vw,1.7rem)] font-bold opacity-55 mt-3">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onPlay}
            aria-label="Hrať"
            className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 ${playButtonColorClassName} rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0`}
          >
            <Play size={42} className="sm:w-16 sm:h-16 md:w-20 md:h-20 ml-1.5 sm:ml-3" fill="currentColor" />
          </button>
        </div>
      </div>

      {topDecorationClassName && (
        <div aria-hidden="true" className={topDecorationClassName} />
      )}
      {bottomDecorationClassName && (
        <div aria-hidden="true" className={bottomDecorationClassName} />
      )}
    </div>
  );
}
