/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './utils';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  listClassName?: string;
}

export function Tabs({
  items,
  value,
  onValueChange,
  children,
  ariaLabel,
  className,
  listClassName,
}: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={cn('flex flex-col gap-3', className)}>
      <TabsPrimitive.List aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', listClassName)}>
        {items.map(item => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'min-h-11 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              'data-[state=inactive]:bg-surface data-[state=inactive]:text-text-main',
              'data-[state=active]:bg-action-primary data-[state=active]:text-white',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  return (
    <TabsPrimitive.Content value={value} className={cn('focus-visible:outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
