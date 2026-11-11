export interface AvatarFrameloopPauseOptions {
  mode?: 'loop' | 'once' | 'still';
  isInspection: boolean;
  actionPaused: boolean;
  actionTime: number;
  duration: number;
  settledFramesRendered: number;
}

export function shouldPauseAvatarFrameloop({
  mode,
  isInspection,
  actionPaused,
  actionTime,
  duration,
  settledFramesRendered,
}: AvatarFrameloopPauseOptions): boolean {
  if (isInspection) return false;
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
  if (requested === 'idle_breathe' && available.includes('idle')) return 'idle';
  return (
    available.find((name) => name.toLowerCase() === 'idle') ??
    available.find((name) => name.toLowerCase().includes('idle')) ??
    available[0]
  );
}
