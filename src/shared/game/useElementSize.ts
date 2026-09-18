/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const INITIAL_SIZE: ElementSize = { width: 0, height: 0 };

/** Measures one container without coupling its children to layout reads. */
export function useElementSize<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
): ElementSize {
  const [size, setSize] = useState<ElementSize>(INITIAL_SIZE);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next: ElementSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      setSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
