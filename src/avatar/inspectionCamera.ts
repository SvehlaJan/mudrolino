import type { AvatarInspectionControls } from './avatarTypes';

export interface InspectionBounds { min: [number, number, number]; max: [number, number, number] }
export function inspectionCameraPose(view: AvatarInspectionControls['view'] | undefined, aspect: number, bounds?: InspectionBounds): { position: [number, number, number]; target: [number, number, number] } {
  if (!view) return { position: [0, 1.35, 7.2], target: [0, 1.25, 0] };
  const safeAspect = Math.max(aspect, 0.1);
  let distance = Math.max(6, 4.5 / safeAspect);
  const dx = view === 'side' ? 1 : view === 'three-quarter' ? Math.SQRT1_2 : 0;
  const dz = view === 'back' ? -1 : view === 'side' ? 0 : view === 'three-quarter' ? Math.SQRT1_2 : 1;
  if (bounds) {
    const tangentWithMargin = Math.tan(34 * Math.PI / 360) * .9;
    // Include depth: the corners nearer the camera project larger than the center.
    for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
      const depth = x * dx + z * dz;
      const horizontal = Math.abs(x * dz - z * dx) / (tangentWithMargin * safeAspect);
      const vertical = Math.abs(y - 1.35) / tangentWithMargin;
      distance = Math.max(distance, depth + horizontal, depth + vertical);
    }
  }
  const position: [number, number, number] = [distance * dx, 1.35, distance * dz];
  return { position, target: [0, 1.35, 0] };
}
