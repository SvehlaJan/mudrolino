import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { transferTile, type TileTransfer } from './tileTransfer';

/** The landed piece remains visible until the question commits its outcome, or cancels. */
export function useTileTransfer(roundKey: unknown, interrupted: boolean, committedKey: unknown) {
  const reducedMotion = useReducedMotion();
  const active = useRef<TileTransfer | null>(null);
  const mounted = useRef(false);
  const [moving, setMoving] = useState(false);
  const [preview, setPreview] = useState<{ key: unknown } | null>(null);
  const cancel = useCallback(() => {
    active.current?.cancel();
    active.current = null;
  }, []);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancel(); };
  }, [cancel]);
  useLayoutEffect(() => { cancel(); }, [roundKey, interrupted, cancel]);
  useLayoutEffect(() => {
    if (!active.current) return;
    // A layout effect runs after the filled question DOM commits, avoiding a blank handoff.
    active.current.release();
    active.current = null;
  }, [committedKey]);
  const move = useCallback(async (source: HTMLElement | null, target: HTMLElement | null) => {
    cancel();
    const operation = transferTile(source, target, !!reducedMotion, true);
    active.current = operation;
    operation.released.then(() => {
      if (mounted.current && (active.current === operation || active.current === null)) {
        setMoving(false);
        setPreview(null);
      }
    });
    setMoving(true);
    const completed = await operation.finished;
    const current = active.current === operation;
    if (mounted.current && current) setPreview(completed && operation.previewPlacement ? { key: committedKey } : null);
    return completed && current && mounted.current;
  }, [cancel, reducedMotion, committedKey]);
  return { moving, move, cancel, previewPlacement: preview !== null && preview.key === committedKey };
}
