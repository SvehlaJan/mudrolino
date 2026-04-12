/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';

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
    show ? (
      <div
        onClick={() => {
          cancelledRef.current = true;
          audioManager.stop();
          onComplete();
        }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1e2a4a]/70 backdrop-blur-sm"
      >
          <div
            onClick={e => e.stopPropagation()}
            className="relative z-10 border-[6px] border-white rounded-[48px] px-12 py-12 sm:px-20 sm:py-16 mx-6 max-w-[90vw] w-auto text-center"
            style={{
              background: 'linear-gradient(150deg, #eef2ff 0%, #dde6ff 100%)',
              boxShadow: '0 8px 0 #b0c0f0, 0 20px 60px rgba(0,0,0,.15)',
            }}
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
          </div>
      </div>
    ) : null
  );
}
