/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check } from 'lucide-react';

interface SettingToggleProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  color: string;
}

export function SettingToggle({ label, icon, active, onToggle, color }: SettingToggleProps) {
  const knobOffset = active
    ? (typeof window !== 'undefined' && window.innerWidth < 640 ? 36 : 52)
    : 4;

  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] hover:bg-bg-light/40 transition-colors">
      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
        <div className={`w-12 h-12 sm:w-20 sm:h-20 rounded-full ${color} flex items-center justify-center text-text-main bg-opacity-30 shrink-0`}>
          {icon}
        </div>
        <span className="text-xl sm:text-4xl font-bold text-text-main leading-tight">{label}</span>
      </div>
      
      <button 
        onClick={onToggle}
        className={`w-16 h-8 sm:w-24 sm:h-12 rounded-full relative transition-colors duration-300 shrink-0 ${active ? 'bg-soft-watermelon' : 'bg-shadow'}`}
      >
        <div
          className="absolute top-1 w-6 h-6 sm:w-10 sm:h-10 bg-white rounded-full shadow-md flex items-center justify-center"
          style={{ transform: `translateX(${knobOffset}px)` }}
        >
          {active && <Check size={16} className="text-soft-watermelon sm:w-5 sm:h-5" />}
        </div>
      </button>
    </div>
  );
}
