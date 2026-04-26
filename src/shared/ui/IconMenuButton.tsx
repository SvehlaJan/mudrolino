/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './utils';

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function closeMenu({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
    setOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function focusAction(index: number) {
    actionRefs.current[index]?.focus();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => focusAction(0));

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu({ restoreFocus: true });
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={triggerRef}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={className}
      >
        <MoreHorizontal size={18} />
      </IconButton>

      {open ? (
        <div
          role="menu"
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              closeMenu();
              return;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              closeMenu({ restoreFocus: true });
              return;
            }

            if (actions.length === 0) {
              return;
            }

            const currentIndex = actionRefs.current.findIndex(
              (actionRef) => actionRef === document.activeElement,
            );

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusAction((currentIndex + 1) % actions.length);
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              focusAction((currentIndex - 1 + actions.length) % actions.length);
              return;
            }

            if (event.key === 'Home') {
              event.preventDefault();
              focusAction(0);
              return;
            }

            if (event.key === 'End') {
              event.preventDefault();
              focusAction(actions.length - 1);
            }
          }}
          className={cx(
            'absolute right-0 top-full z-20 mt-2 min-w-44 rounded-2xl border-2 border-shadow/10 bg-white p-2 shadow-block',
            menuClassName,
          )}
        >
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              ref={(element) => {
                actionRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onSelect();
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold active:opacity-70',
                action.tone === 'danger' ? 'text-red-500' : 'text-text-main',
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
