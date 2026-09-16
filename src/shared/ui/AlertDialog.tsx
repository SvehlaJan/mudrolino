/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './Button';
import { cn } from './utils';

export interface AlertDialogShellProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  cancelLabel: string;
  actionLabel: string;
  onAction: () => void;
  actionTone?: 'primary' | 'danger';
  children?: React.ReactNode;
  /**
   * The element that opens the confirmation. Rendered through
   * `AlertDialog.Trigger` so Radix can restore focus to it on close.
   */
  trigger?: React.ReactElement;
  className?: string;
}

/**
 * Radix omits onPointerDownOutside/onInteractOutside from AlertDialog.Content's
 * API (unlike Dialog.Content), so a backdrop click never dismisses it — only
 * Escape or an explicit Cancel/Action does. That's what makes it safe for
 * destructive confirmations.
 */
export function AlertDialogShell({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  actionLabel,
  onAction,
  actionTone = 'danger',
  children,
  trigger,
  className,
}: AlertDialogShellProps) {
  const descriptionId = useId();

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-text-main/40 backdrop-blur-sm" />
        <AlertDialog.Content
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-surface p-5 shadow-modal',
            className,
          )}
        >
          <AlertDialog.Title className="text-2xl font-black text-text-main">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description id={descriptionId} className="mt-1 text-base font-medium text-text-muted">
              {description}
            </AlertDialog.Description>
          )}
          {children}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button tone="neutral" size="parent">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button tone={actionTone} size="parent" onClick={onAction}>{actionLabel}</Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
