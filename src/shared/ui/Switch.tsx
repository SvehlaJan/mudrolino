/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from './utils';

/** Semantic icon-tile and checked-track color pairing. Add a new entry here rather than accepting a raw class name. */
export type SwitchTone = 'primary' | 'accent' | 'watermelon';

const iconToneClass: Record<SwitchTone, string> = {
  primary: 'bg-selected-surface',
  accent: 'bg-accent-blue/35',
  watermelon: 'bg-shadow/35',
};

const trackToneClass: Record<SwitchTone, string> = {
  primary: 'bg-action-primary',
  accent: 'bg-accent-blue',
  watermelon: 'bg-soft-watermelon',
};

export interface SwitchControlProps {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  tone?: SwitchTone;
  className?: string;
}

export function SwitchControl({
  label,
  icon,
  description,
  checked,
  onCheckedChange,
  disabled,
  tone = 'primary',
  className,
}: SwitchControlProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {icon && (
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-text-main sm:h-16 sm:w-16',
              iconToneClass[tone],
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">{label}</h3>
          {description && (
            <p className="mt-1 text-sm font-medium leading-snug text-text-muted sm:text-base">{description}</p>
          )}
        </div>
      </div>

      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'relative h-10 w-[4.5rem] shrink-0 rounded-full bg-shadow px-1 transition-colors duration-300 sm:h-12 sm:w-24',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
          checked && trackToneClass[tone],
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block h-8 w-8 translate-x-0 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10',
            'data-[state=checked]:translate-x-8 sm:data-[state=checked]:translate-x-12',
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
