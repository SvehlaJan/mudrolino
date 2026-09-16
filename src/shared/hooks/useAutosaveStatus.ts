import { useEffect, useState } from 'react';
import type { SaveResult } from '../services/appSettingsStore';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosaveStatus<T>(value: T, save: (value: T) => SaveResult): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  useEffect(() => {
    let active = true;
    let saveTimer: number | undefined;
    let resetTimer: number | undefined;

    queueMicrotask(() => {
      if (!active) return;
      setStatus('saving');

      saveTimer = window.setTimeout(() => {
        if (!active) return;
        const result = save(value);
        setStatus(result.ok ? 'saved' : 'error');
        if (!result.ok) return;
        resetTimer = window.setTimeout(() => {
          if (active) setStatus('idle');
        }, 1200);
      }, 0);
    });

    return () => {
      active = false;
      if (saveTimer !== undefined) window.clearTimeout(saveTimer);
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
    };
  }, [value, save]);

  return status;
}
