/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TopBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/** Shared 3-column top navigation bar used across game, lobby, settings, and gate screens. */
export function TopBar({ left, center, right }: TopBarProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-4 shrink-0 pb-3 sm:pb-4">
      {/* spacer keeps the center column symmetric when no slot is provided */}
      <div>{left ?? <div className="w-12 sm:w-14" />}</div>
      <div className="pt-1 sm:pt-1.5 flex justify-center">{center}</div>
      <div>{right ?? <div className="w-12 sm:w-14" />}</div>
    </div>
  );
}

/** Standard back button sized to match TopBar. */
export function BackButton({ onClick, label = 'Späť' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full shadow-block flex items-center justify-center text-text-main transition-all active:translate-y-2 active:shadow-block-pressed"
    >
      <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
    </button>
  );
}
