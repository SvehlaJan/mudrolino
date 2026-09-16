/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from './utils';

export interface DialogShellProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /**
   * The element that opens the dialog. Rendered through `Dialog.Trigger` so
   * Radix can restore focus to it on close — without this, Radix has no
   * trigger to focus and closing the dialog would strand focus.
   */
  trigger?: React.ReactElement;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /**
   * Radix's modal Dialog always restores close-focus to its own `Dialog.Trigger`, unconditionally
   * pre-empting any generic "restore whatever was focused before" fallback — so when a dialog has
   * no `trigger` prop (its opener lives in another component entirely, e.g. a route-driven gate),
   * closing it would otherwise strand focus. Pass the element to refocus in that case.
   */
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  /** Overrides the title's default size when a consumer needs to fit a short viewport. */
  titleClassName?: string;
  /** Overrides the description's default size when a consumer needs to fit a short viewport. */
  descriptionClassName?: string;
}

export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  initialFocusRef,
  restoreFocusRef,
  className,
  titleClassName,
  descriptionClassName,
}: DialogShellProps) {
  const descriptionId = useId();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text-main/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={event => {
            if (!initialFocusRef?.current) return;
            event.preventDefault();
            initialFocusRef.current.focus();
          }}
          onCloseAutoFocus={event => {
            if (!restoreFocusRef?.current) return;
            event.preventDefault();
            restoreFocusRef.current.focus();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-surface p-5 shadow-modal',
            className,
          )}
        >
          <Dialog.Title className={cn('text-2xl font-black text-text-main sm:text-3xl', titleClassName)}>
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description
              id={descriptionId}
              className={cn('mt-1 text-base font-medium text-text-muted', descriptionClassName)}
            >
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
