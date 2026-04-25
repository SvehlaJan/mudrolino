/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Pause, X } from 'lucide-react';
import { SuccessSpec, PraiseEntry } from '../types';
import { getLocaleContent, TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';
import { IconButton, OverlayFrame } from '../ui';

interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
  locale?: string;
}

export function SuccessOverlay({ show, spec, onComplete, locale = 'sk' }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(getLocaleContent(locale).praiseEntries[0]);
  const [paused, setPaused] = useState(false);
  const cancelledRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!show) { setPaused(false); return; }
    const praiseEntries = getLocaleContent(locale).praiseEntries;
    const entry = spec.praiseEntry ?? praiseEntries[Math.floor(Math.random() * praiseEntries.length)];
    setPraise(entry);
    setPaused(false);
    cancelledRef.current = false;

    const minTimer = new Promise<void>(resolve =>
      setTimeout(resolve, TIMING.SUCCESS_OVERLAY_DURATION_MS)
    );
    const audio = spec.audioSpec
      ? audioManager.playPraise().then(() => audioManager.play(spec.audioSpec!))
      : audioManager.playPraise();

    Promise.all([minTimer, audio]).then(() => {
      if (!cancelledRef.current) onComplete();
    });

    return () => {
      cancelledRef.current = true;
      audioManager.stop();
    };
  }, [show, spec]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePause = () => {
    cancelledRef.current = true;
    audioManager.stop();
    setPaused(true);
  };

  return (
    <OverlayFrame
      show={show}
      confetti
      onBackdropClick={() => {
        cancelledRef.current = true;
        audioManager.stop();
        onComplete();
      }}
      panelClassName="bg-[linear-gradient(150deg,#fff8f0_0%,#ffecd2_100%)] shadow-[0_8px_0_#f0c99a,0_20px_60px_rgba(0,0,0,.10)]"
    >
      <IconButton
        label={paused ? 'Zavrieť' : 'Pauza'}
        onClick={paused ? onComplete : handlePause}
        className="absolute right-4 top-4 h-10 w-10 !bg-white !shadow-[0_2px_8px_rgba(0,0,0,.10)] text-[#aaa] transition-colors hover:text-[#666] sm:h-10 sm:w-10"
      >
        {paused ? <X size={20} /> : <Pause size={20} />}
      </IconButton>
      <div role="img" aria-label={praise.text} className="text-[100px] sm:text-[140px] leading-none mb-2">{praise.emoji}</div>
      <h3 className="text-primary text-5xl sm:text-[80px] font-black tracking-tighter leading-none">
        {praise.text}
      </h3>
      <p className="text-2xl sm:text-4xl font-extrabold mt-5" style={{ color: '#c06a00' }}>
        {spec.echoLine}
      </p>
    </OverlayFrame>
  );
}
