/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from './IconButton';
import { DropdownMenu } from './DropdownMenu';

export interface IconMenuAction {
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface IconMenuButtonProps {
  label: string;
  actions: IconMenuAction[];
  className?: string;
  menuClassName?: string;
}

export function IconMenuButton({
  label,
  actions,
  className,
  menuClassName,
}: IconMenuButtonProps) {
  return (
    <DropdownMenu
      trigger={
        <IconButton label={label} className={className}>
          <MoreHorizontal size={18} />
        </IconButton>
      }
      items={actions}
      contentClassName={menuClassName}
    />
  );
}
