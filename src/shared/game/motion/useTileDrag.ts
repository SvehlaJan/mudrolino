import { useCallback, useEffect, useRef, type HTMLAttributes } from 'react';
import { createFloatingTile } from './tileTransfer';

interface Drag {
  pointerId: number;
  tileId: string;
  source: HTMLElement;
  startX: number;
  startY: number;
  rect: DOMRect;
  visibility: string;
  clone?: HTMLElement;
}

/** Pointer capture keeps mouse, pen and touch on the same path; taps still use onPress. */
export function useTileDrag({ enabled, roundKey, targetSelector, onDrop }: {
  enabled: boolean;
  roundKey: unknown;
  targetSelector: string;
  onDrop: (tileId: string, target: HTMLElement, clone: HTMLElement) => boolean;
}): { handlers: HTMLAttributes<HTMLDivElement>; cancelDrag: () => void } {
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const highlightedRef = useRef<HTMLElement | null>(null);

  const clearHighlight = useCallback(() => {
    highlightedRef.current?.removeAttribute('data-drag-over');
    highlightedRef.current = null;
  }, []);

  const release = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    clearHighlight();
    if (drag) {
      drag.source.style.visibility = drag.visibility;
      if (drag.source.hasPointerCapture(drag.pointerId)) drag.source.releasePointerCapture(drag.pointerId);
    }
    return drag;
  }, [clearHighlight]);

  const cancelDrag = useCallback(() => {
    const drag = release();
    if (drag?.clone) {
      suppressClickRef.current = true;
      drag.clone.remove();
    }
  }, [release]);

  useEffect(() => {
    if (!enabled) cancelDrag();
    return cancelDrag;
  }, [enabled, roundKey, cancelDrag]);

  const dropTarget = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    return element?.closest<HTMLElement>(targetSelector) ?? null;
  };

  const handlers: HTMLAttributes<HTMLDivElement> = {
    onPointerDown: event => {
      if (dragRef.current || !event.isPrimary || event.button !== 0) return;
      // Cancellation has no follow-up click. A fresh gesture, including on Back/Replay,
      // must not inherit suppression from the previous pointer sequence.
      suppressClickRef.current = false;
      if (!enabled) return;
      const source = (event.target as Element).closest<HTMLElement>('button[data-tile-id]');
      if (!source || source.matches(':disabled') || !event.currentTarget.contains(source)) return;
      dragRef.current = {
        pointerId: event.pointerId, tileId: source.dataset.tileId!, source,
        startX: event.clientX, startY: event.clientY, rect: source.getBoundingClientRect(), visibility: source.style.visibility,
      };
      source.setPointerCapture(event.pointerId);
    },
    onPointerMove: event => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.clone && Math.hypot(dx, dy) < 8) return;
      if (!drag.clone) {
        drag.clone = createFloatingTile(drag.source);
        drag.clone.style.zIndex = '60';
        drag.source.style.visibility = 'hidden';
      }
      event.preventDefault();
      drag.clone.style.left = `${drag.rect.left + dx}px`;
      drag.clone.style.top = `${drag.rect.top + dy}px`;
      clearHighlight();
      const target = dropTarget(event.clientX, event.clientY);
      if (target && event.currentTarget.contains(target)) {
        target.setAttribute('data-drag-over', 'true');
        highlightedRef.current = target;
      }
    },
    onPointerUp: event => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      const drag = release();
      if (!drag?.clone) return;
      suppressClickRef.current = true;
      const target = dropTarget(event.clientX, event.clientY);
      if (!target || !event.currentTarget.contains(target)
        || !onDrop(drag.tileId, target, drag.clone)) drag.clone.remove();
    },
    onPointerCancel: event => {
      if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
    },
    onLostPointerCapture: event => {
      if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
    },
    onClickCapture: event => {
      if (!suppressClickRef.current || event.detail === 0) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDownCapture: event => {
      if (event.key === 'Escape') cancelDrag();
    },
  };
  return { handlers, cancelDrag };
}
