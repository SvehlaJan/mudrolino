/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from './utils';

export interface RadioGroupOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

/** Semantic checked-state color. Add a new entry here rather than accepting a raw class name. */
export type RadioGroupTone = 'primary' | 'accent' | 'success';

export interface RadioGroupControlProps<T extends string> {
  options: readonly RadioGroupOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  ariaLabel?: string;
  tone?: RadioGroupTone;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  className?: string;
}

const gridColsClass: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const toneCheckedClass: Record<RadioGroupTone, string> = {
  primary: 'data-[state=checked]:bg-action-primary data-[state=checked]:text-white',
  accent: 'data-[state=checked]:bg-accent-blue data-[state=checked]:text-text-main',
  success: 'data-[state=checked]:bg-success data-[state=checked]:text-text-main',
};

export function RadioGroupControl<T extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  tone = 'primary',
  columns,
  disabled,
  className,
}: RadioGroupControlProps<T>) {
  const resolvedColumns = columns ?? (options.length === 2 ? 2 : 3);

  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={value => onValueChange(value as T)}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn('grid gap-3', gridColsClass[resolvedColumns], className)}
    >
      {options.map(option => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            'relative flex min-h-12 min-w-12 items-center justify-center rounded-2xl px-4 py-4 font-bold shadow-block transition-all',
            'data-[state=unchecked]:bg-surface data-[state=unchecked]:text-text-main',
            'data-[state=checked]:shadow-chip',
            toneCheckedClass[tone],
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
