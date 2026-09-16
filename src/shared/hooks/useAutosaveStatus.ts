import { useEffect, useState } from 'react';
import type { SaveResult } from '../services/appSettingsStore';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosaveStatus<T>(value: T, save: (value: T) => SaveResult): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  useEffect(() => {
    let active = true;
    let finishTimer: number | undefined;
    let resetTimer: number | undefined;

    queueMicrotask(() => {
      if (!active) return;
      setStatus('saving');
      const result = save(value);

      finishTimer = window.setTimeout(() => {
        if (!active) return;
        setStatus(result.ok ? 'saved' : 'error');
        if (!result.ok) return;
        resetTimer = window.setTimeout(() => {
          if (active) setStatus('idle');
        }, 1200);
      }, 0);
    });

    return () => {
      active = false;
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
    };
  }, [value, save]);

  return status;
}
