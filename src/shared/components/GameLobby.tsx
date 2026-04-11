/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
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
  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute safe-top sm:safe-top-lg safe-left sm:safe-left-lg flex gap-4 z-20">
        <button
          onClick={onBack}
          aria-label="Späť"
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>

      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          aria-label="Nastavenia"
          className="absolute safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
        >
          <Settings size={24} className="sm:w-8 sm:h-8" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {renderTitle(title)}
          </h1>
          {subtitle && (
            <p className="text-2xl sm:text-3xl font-bold opacity-50 mt-4">
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={onPlay}
          aria-label="Hrať"
          className={`w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 ${playButtonColorClassName} rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0`}
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </button>
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
