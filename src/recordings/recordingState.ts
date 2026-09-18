export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'saved' | 'cancelled' | 'error';
export type RecorderError = 'permission-denied' | 'unavailable' | 'processing-failed';

const transitions: Record<RecorderState, readonly RecorderState[]> = {
  idle: ['requesting'],
  requesting: ['recording', 'cancelled', 'error'],
  recording: ['processing', 'cancelled', 'error'],
  processing: ['saved', 'cancelled', 'error'],
  saved: ['idle'],
  cancelled: ['idle'],
  error: ['idle'],
};

export function recordingTransition(state: RecorderState, next: RecorderState): RecorderState {
  return transitions[state].includes(next) ? next : state;
}
