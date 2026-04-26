/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { OverlayFrame } from '../ui';

const FAILURE_DURATION_MS = 2500;

interface FailureOverlayProps {
  show: boolean;
  spec: FailureSpec;
  onComplete: () => void;
}

export function FailureOverlay({ show, spec, onComplete }: FailureOverlayProps) {
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    cancelledRef.current = false;

    const minTimer = new Promise<void>(resolve =>
      setTimeout(resolve, FAILURE_DURATION_MS)
    );
    const audio = audioManager.play(spec.audioSpec);

    Promise.all([minTimer, audio]).then(() => {
      if (!cancelledRef.current) onComplete();
    });

    return () => {
      cancelledRef.current = true;
      audioManager.stop();
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OverlayFrame
      show={show}
      tone="failure"
      onBackdropClick={() => {
        cancelledRef.current = true;
        audioManager.stop();
        onComplete();
      }}
      panelClassName="bg-[linear-gradient(150deg,#eef2ff_0%,#dde6ff_100%)] shadow-[0_8px_0_#b0c0f0,0_20px_60px_rgba(0,0,0,.15)]"
    >
      <div role="img" aria-label="Nevadí" className="text-[100px] sm:text-[140px] leading-none mb-2">
        🤗
      </div>
      <h3 className="text-[#3a4a8a] text-4xl sm:text-6xl font-black tracking-tighter leading-none">
        Nevadí!
      </h3>
      <p className="text-xl sm:text-2xl font-bold mt-3 text-[#5566aa]">
        Je to:
      </p>
      <p className="text-2xl sm:text-4xl font-extrabold mt-2" style={{ color: '#3a4a8a' }}>
        {spec.echoLine}
      </p>
    </OverlayFrame>
  );
}
