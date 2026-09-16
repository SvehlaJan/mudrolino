/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from './utils';

export interface DropdownMenuItemConfig {
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: readonly DropdownMenuItemConfig[];
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
}

export function DropdownMenu({ trigger, items, align = 'end', contentClassName }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-20 min-w-44 rounded-2xl border-2 border-border-subtle bg-surface p-2 shadow-block',
            contentClassName,
          )}
        >
          {items.map((item, index) => (
            <DropdownMenuPrimitive.Item
              key={`${item.label}-${index}`}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold outline-none',
                'data-[highlighted]:bg-selected-surface',
                'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                item.tone === 'danger' ? 'text-action-danger' : 'text-text-main',
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
