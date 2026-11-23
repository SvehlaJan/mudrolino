export interface AvatarFrameloopPauseOptions {
  mode?: 'loop' | 'once' | 'still';
  isInspection: boolean;
  actionPaused: boolean;
  actionTime: number;
  duration: number;
  settledFramesRendered: number;
  documentHidden?: boolean;
  hasIdleAfterOnce?: boolean;
}

const CLIP_FALLBACKS: Record<string, string> = {
  idle_breathe: 'idle',
  walk: 'march',
  point_down: 'search',
  gentle_try_again: 'encourage',
  talk_explain: 'listen',
  count_one_two_three: 'clap',
  sleepy_yawn: 'stretch',
};

export function shouldPauseAvatarFrameloop({
  mode,
  isInspection,
  actionPaused,
  actionTime,
  duration,
  settledFramesRendered,
  documentHidden = false,
  hasIdleAfterOnce = false,
}: AvatarFrameloopPauseOptions): boolean {
  if (documentHidden) return true;
  if (isInspection) return false;
  if (mode === 'once' && hasIdleAfterOnce) return false;
  if (mode !== 'once' && mode !== 'still') return false;
  const settled = mode === 'still' || actionPaused || actionTime >= Math.max(1e-6, duration) - 1e-6;
  return settled && settledFramesRendered >= 1;
}

export function resolveCompanionClipName(
  requested: string | null | undefined,
  available: readonly string[],
): string | undefined {
  if (available.length === 0) return undefined;
  if (requested && available.includes(requested)) return requested;
  if (requested) {
    const fallback = CLIP_FALLBACKS[requested];
    if (fallback && available.includes(fallback)) return fallback;
  }
  return (
    available.find((name) => name.toLowerCase() === 'idle') ??
    available.find((name) => name.toLowerCase().includes('idle')) ??
    available[0]
  );
}

export const CALM_IDLE_BASE_INTERVAL_MS = 50;
export const CALM_IDLE_MAX_INTERVAL_MS = 90;

/** Pace calm living-idle frames from ~20 fps down to ~11 fps under slow software WebGL. */
export function computeCalmIdleIntervalMs(frameCostMs: number): number {
  if (!Number.isFinite(frameCostMs) || frameCostMs <= 0) return CALM_IDLE_BASE_INTERVAL_MS;
  return Math.max(
    CALM_IDLE_BASE_INTERVAL_MS,
    Math.min(CALM_IDLE_MAX_INTERVAL_MS, Math.round(frameCostMs * 1.5)),
  );
}
