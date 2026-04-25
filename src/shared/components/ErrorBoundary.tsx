import { Component, ReactNode } from 'react';
import { Button } from '../ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// React 19 bundles its own types that omit class-component internals (setState, props).
// Cast `this` once to access the inherited API without @types/react.
type ClassAPI = { state: State; setState: (s: Partial<State>) => void; props: Props };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as unknown as ClassAPI).state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    const self = this as unknown as ClassAPI;
    if (self.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
          <div className="text-8xl mb-6">🙈</div>
          <h2 className="text-4xl font-black mb-4 text-text-main">Niečo sa pokazilo</h2>
          <p className="text-xl opacity-60 mb-8">Skús to znova.</p>
          <Button
            variant="danger"
            size="lg"
            onClick={() => self.setState({ hasError: false })}
            className="rounded-full px-12 py-6 text-2xl"
          >
            Skúsiť znova
          </Button>
        </div>
      );
    }
    return self.props.children;
  }
}
