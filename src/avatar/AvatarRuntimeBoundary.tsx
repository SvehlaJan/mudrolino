import React from 'react';

interface AvatarRuntimeBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: unknown) => void;
}

interface AvatarRuntimeBoundaryState {
  hasError: boolean;
}

export class AvatarRuntimeBoundary extends React.Component<AvatarRuntimeBoundaryProps, AvatarRuntimeBoundaryState> {
  state: AvatarRuntimeBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AvatarRuntimeBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (this.props.onError) this.props.onError(error);
    else console.warn('Avatar renderer failed; hiding avatar.', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
