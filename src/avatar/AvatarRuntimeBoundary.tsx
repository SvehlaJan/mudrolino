import React from 'react';

interface AvatarRuntimeBoundaryProps {
  children: React.ReactNode;
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
    console.warn('Avatar renderer failed; hiding avatar.', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
