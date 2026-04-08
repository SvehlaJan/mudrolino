/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';

const FAILURE_DURATION_MS = 2500;

interface FailureOverlayProps {
  show: boolean;
  spec: FailureSpec;
  onComplete: () => void;
}

export function FailureOverlay({ show, spec, onComplete }: FailureOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) return;
    audioManager.play(spec.audioSpec);
    timerRef.current = setTimeout(onComplete, FAILURE_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1e2a4a]/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
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
              Správna odpoveď je:
            </p>
            <p className="text-2xl sm:text-4xl font-extrabold mt-2" style={{ color: '#3a4a8a' }}>
              {spec.echoLine}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
