/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Settings } from 'lucide-react';
import { COLORS } from '../contentRegistry';
import { AppScreen, BackButton, Button, IconButton, TopBar } from '../ui';

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
    <IconButton
      onClick={onOpenSettings}
      label="Nastavenia"
    >
      <Settings size={24} className="sm:w-7 sm:h-7" />
    </IconButton>
  ) : undefined;

  return (
    <AppScreen>
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

        <Button
          variant="play"
          onClick={onPlay}
          aria-label="Hrať"
          className={`${playButtonColorClassName} shrink-0`}
        >
          <Play size={42} className="sm:w-16 sm:h-16 md:w-20 md:h-20 ml-1.5 sm:ml-3" fill="currentColor" />
        </Button>
      </div>

      {topDecorationClassName && (
        <div aria-hidden="true" className={topDecorationClassName} />
      )}
      {bottomDecorationClassName && (
        <div aria-hidden="true" className={bottomDecorationClassName} />
      )}
    </AppScreen>
  );
}
