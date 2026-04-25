/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import { ChoiceTile } from './ChoiceTile';
import { cx } from './utils';

export interface ToggleControlProps {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  iconBackgroundClassName?: string;
  activeColorClassName?: string;
  className?: string;
}

export function ToggleControl({
  label,
  icon,
  description,
  checked,
  onToggle,
  iconBackgroundClassName = 'bg-shadow/35',
  activeColorClassName = 'bg-soft-watermelon',
  className,
}: ToggleControlProps) {
  return (
    <div className={cx('flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {icon && (
          <div
            className={cx(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-text-main sm:h-16 sm:w-16',
              iconBackgroundClassName,
            )}
          >
            {icon}
          </div>
        )}
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
        className={cx(
          'relative h-10 w-[4.5rem] shrink-0 rounded-full px-1 transition-colors duration-300 sm:h-12 sm:w-24',
          checked ? activeColorClassName : 'bg-shadow',
        )}
      >
        <span
          className={cx(
            'absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10',
            checked ? 'translate-x-8 sm:translate-x-12' : 'translate-x-0',
          )}
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

interface SegmentedChoiceProps<T extends string | number> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  formatLabel?: (option: T) => React.ReactNode;
  activeClassName?: string;
  columns?: 2 | 3 | 4;
}

const activeBackgroundOverride: Record<string, string> = {
  'bg-accent-blue': '!bg-accent-blue',
  'bg-primary': '!bg-primary',
  'bg-soft-watermelon': '!bg-soft-watermelon',
  'bg-success': '!bg-success',
};

function resolveActiveClassName(className: string) {
  return className
    .split(' ')
    .map(token => activeBackgroundOverride[token] ?? token)
    .join(' ');
}

export function SegmentedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel = option => option,
  activeClassName = 'bg-accent-blue',
  columns,
}: SegmentedChoiceProps<T>) {
  const gridClass =
    columns === 4
      ? 'grid-cols-4'
      : columns === 2 || options.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className={cx('grid gap-3', gridClass)}>
      {options.map(option => (
        <ChoiceTile
          key={String(option)}
          shape="option"
          state={selected === option ? 'selected' : 'neutral'}
          unstyledState={selected !== option}
          className={
            selected === option
              ? resolveActiveClassName(activeClassName)
              : 'bg-bg-light text-text-main opacity-70 shadow-none'
          }
          onClick={() => onSelect(option)}
        >
          {formatLabel(option)}
        </ChoiceTile>
      ))}
    </div>
  );
}

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  clearLabel?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    className,
    clearLabel = 'Vymazať',
    onClear,
    value,
    ...props
  },
  ref,
) {
  const showClear = onClear && value !== undefined && String(value).length > 0;

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        size={22}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-main/45"
      />
      <input
        {...props}
        ref={ref}
        value={value}
        type="text"
        className={cx(
          'w-full rounded-2xl border-2 border-shadow/10 bg-white py-3 pl-11 pr-10 text-lg font-medium focus:border-accent-blue/50 focus:outline-none',
          className,
        )}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-main/55 transition-colors hover:bg-bg-light hover:text-text-main"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
});

export const TextAreaControl = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaControl({ className, ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cx(
        'w-full resize-none rounded-2xl border border-shadow/15 bg-bg-light/35 p-4 text-base font-medium placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-accent-blue',
        className,
      )}
    />
  );
});
