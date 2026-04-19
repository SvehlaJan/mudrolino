/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SettingToggleProps {
  label: string;
  icon: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  iconBackgroundClassName: string;
  activeColorClassName?: string;
  className?: string;
}

export function SettingToggle({
  label,
  icon,
  description,
  checked,
  onToggle,
  iconBackgroundClassName,
  activeColorClassName = 'bg-soft-watermelon',
  className = '',
}: SettingToggleProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`.trim()}>
      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] ${iconBackgroundClassName} text-text-main sm:h-16 sm:w-16`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">{label}</h3>
          {description && (
            <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={checked ? `Vypnúť ${label}` : `Zapnúť ${label}`}
        aria-pressed={checked}
        className={`relative h-10 w-[4.5rem] shrink-0 rounded-full px-1 transition-colors duration-300 sm:h-12 sm:w-24 ${
          checked ? activeColorClassName : 'bg-shadow'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10 ${
            checked ? 'translate-x-8 sm:translate-x-12' : 'translate-x-0'
          }`}
        >
          <span
            key={checked ? 'on' : 'off'}
            className="block h-full w-full rounded-full bg-white animate-toggle-pop"
          />
        </span>
      </button>
    </div>
  );
}
