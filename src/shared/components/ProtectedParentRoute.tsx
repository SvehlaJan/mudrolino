import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useParentAccess } from '../contexts/useParentAccess';
import { sanitizeChildReturnPath } from '../services/parentAccessLogic';
import { ParentsGate } from './ParentsGate';

export function ProtectedParentRoute() {
  const { unlocked, unlock, lock } = useParentAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = sanitizeChildReturnPath(
    (location.state as { returnTo?: unknown } | null)?.returnTo,
  );

  if (unlocked) return <Outlet />;

  return (
    <ParentsGate
      onSuccess={unlock}
      onCancel={() => {
        lock();
        navigate(returnTo, { replace: true });
      }}
    />
  );
}
