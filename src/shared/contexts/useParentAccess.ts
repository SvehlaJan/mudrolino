import { useContext } from 'react';
import { ParentAccessContext, ParentAccessValue } from './ParentAccessContext';

export function useParentAccess(): ParentAccessValue {
  const context = useContext(ParentAccessContext);
  if (!context) {
    throw new Error('useParentAccess must be used within a ParentAccessProvider');
  }
  return context;
}
