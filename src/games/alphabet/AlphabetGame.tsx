/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { COLORS } from '../../shared/contentRegistry';
import { GameSettings } from '../../shared/types';
import { FindItGame } from '../../shared/components/FindItGame';
import { createAlphabetDescriptor } from './alphabetDescriptor';

interface AlphabetGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ settings, onExit, onOpenSettings }: AlphabetGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = createAlphabetDescriptor(settings.alphabetGridSize);

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute safe-top sm:safe-top-lg safe-left sm:safe-left-lg flex gap-4 z-20">
        <button
          onClick={onExit}
          aria-label="Späť"
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Nastavenia"
        className="absolute safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
      >
        <Settings size={24} className="sm:w-8 sm:h-8" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {'ABECEDA'.split('').map((char, i) => (
              <span
                key={i}
                className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                style={{
                  transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                  textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
        <button
          onClick={() => setGameState('PLAYING')}
          aria-label="Hrať"
          className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-success rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </button>
      </div>
      <div aria-hidden="true" className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none" />
    </div>
  );
}
