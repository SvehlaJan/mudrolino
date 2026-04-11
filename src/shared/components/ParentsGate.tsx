/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

interface ParentsGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ParentsGate({ onSuccess, onCancel }: ParentsGateProps) {
  const [gateProgress, setGateProgress] = useState(0);
  const gateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gateProgress >= 100) {
      onSuccess();
    }
  }, [gateProgress, onSuccess]);

  const startGateHold = () => {
    setGateProgress(0);
    gateInterval.current = setInterval(() => {
      setGateProgress(prev => {
        if (prev >= 100) {
          if (gateInterval.current) clearInterval(gateInterval.current);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
  };

  const stopGateHold = () => {
    if (gateInterval.current) {
      clearInterval(gateInterval.current);
    }
    setGateProgress(0);
  };

  useEffect(() => {
    return () => {
      if (gateInterval.current) clearInterval(gateInterval.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/95 backdrop-blur-md">
      <button 
        onClick={onCancel}
        className="absolute top-8 left-8 w-16 h-16 bg-white rounded-full shadow-block flex items-center justify-center"
      >
        <ArrowLeft size={32} />
      </button>

      <h2 className="text-4xl font-bold mb-12 text-center px-4">Podržte 3 sekundy</h2>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-shadow opacity-20"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray="754"
            strokeDashoffset={754 - (754 * gateProgress) / 100}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        
        <button
          onMouseDown={startGateHold}
          onMouseUp={stopGateHold}
          onMouseLeave={stopGateHold}
          onTouchStart={startGateHold}
          onTouchEnd={stopGateHold}
          className="w-52 h-52 bg-white rounded-full shadow-block flex items-center justify-center text-text-main active:scale-95 transition-transform"
        >
          <Lock size={80} fill="currentColor" className="opacity-80" />
        </button>
      </div>

      <p className="mt-12 text-xl font-medium opacity-70 text-center px-8">
        Pre vstup do nastavení podržte prst na zámku.
      </p>
    </div>
  );
}
