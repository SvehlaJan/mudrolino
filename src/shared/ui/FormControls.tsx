/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import { RadioGroupControl, type RadioGroupTone } from './RadioGroup';
import { toSegmentedChoiceKey, resolveSegmentedChoiceOption } from './segmentedChoiceKey';
import { SwitchControl, type SwitchTone } from './Switch';
import { cx } from './utils';

export interface ToggleControlProps {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  tone?: SwitchTone;
  className?: string;
}

/** @deprecated Use `SwitchControl` directly with `onCheckedChange`. Kept only for the `onToggle`-shaped legacy call signature. */
export function ToggleControl({
  label,
  icon,
  description,
  checked,
  onToggle,
  tone = 'watermelon',
  className,
}: ToggleControlProps) {
  return (
    <SwitchControl
      label={label}
      icon={icon}
      description={description}
      checked={checked}
      onCheckedChange={onToggle}
      tone={tone}
      className={className}
    />
  );
}

interface SegmentedChoiceProps<T extends string | number> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  formatLabel?: (option: T) => React.ReactNode;
  tone?: RadioGroupTone;
  columns?: 2 | 3 | 4;
  ariaLabel?: string;
  /** Options rendered visibly but non-selectable (dimmed, unclickable) — e.g. a choice that's invalid for the current settings combination. */
  disabledOptions?: readonly T[];
}

export function SegmentedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel = option => option,
  tone = 'accent',
  columns,
  ariaLabel,
  disabledOptions,
}: SegmentedChoiceProps<T>) {
  return (
    <RadioGroupControl
      ariaLabel={ariaLabel}
      tone={tone}
      columns={columns}
      value={toSegmentedChoiceKey(selected)}
      onValueChange={key => {
        const option = resolveSegmentedChoiceOption(options, key);
        if (option !== undefined) onSelect(option);
      }}
      options={options.map(option => ({
        value: toSegmentedChoiceKey(option),
        label: formatLabel(option),
        disabled: disabledOptions?.includes(option) ?? false,
      }))}
    />
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

export interface TextAreaControlProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  surface?: 'outlined' | 'flat';
}

export const TextAreaControl = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaControlProps
>(function TextAreaControl({ className, surface = 'outlined', ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cx(
        'w-full resize-none rounded-2xl bg-bg-light/35 p-4 text-base font-medium placeholder:opacity-40 focus:outline-none',
        surface === 'outlined'
          ? 'border border-shadow/15 focus:ring-2 focus:ring-accent-blue'
          : 'border-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
    />
  );
});
