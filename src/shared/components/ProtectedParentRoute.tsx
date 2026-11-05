import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useParentAccess } from '../contexts/useParentAccess';
import { ParentsGate } from './ParentsGate';
import { RETURN_FOCUS_TO_SETTINGS } from '../services/parentAccessLogic';

export function ProtectedParentRoute() {
  const { unlocked, unlock, lock } = useParentAccess();
  const navigate = useNavigate();

  if (unlocked) return <Outlet />;

  return (
    <ParentsGate
      onSuccess={unlock}
      onCancel={() => {
        lock();
        navigate('/', { replace: true, state: RETURN_FOCUS_TO_SETTINGS });
      }}
    />
  );
}
