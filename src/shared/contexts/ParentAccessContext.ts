import { createContext } from 'react';

export interface ParentAccessValue {
  unlocked: boolean;
  unlock(): void;
  lock(): void;
}

export const ParentAccessContext = createContext<ParentAccessValue | null>(null);
