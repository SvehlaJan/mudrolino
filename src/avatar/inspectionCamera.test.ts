import { describe, expect, it } from 'vitest';
import { inspectionCameraPose, type InspectionBounds } from './inspectionCamera';

const views = ['front', 'back', 'side', 'three-quarter'] as const;
const shorts: InspectionBounds = { min: [-1.345, 0, -1.017], max: [1.345, 2.7, 1.017] };

describe('inspection camera framing', () => {
  it('keeps every corner of a broad short garment inside a visible margin on desktop and phone', () => {
    for (const aspect of [326 / 506.390625, 700 / 540]) for (const view of views) {
      const { position, target } = inspectionCameraPose(view, aspect, shorts);
      const distance = Math.hypot(position[0], position[2]);
      const dx = position[0] / distance, dz = position[2] / distance;
      for (const x of [shorts.min[0], shorts.max[0]]) for (const y of [shorts.min[1], shorts.max[1]]) for (const z of [shorts.min[2], shorts.max[2]]) {
        const depth = x * dx + z * dz;
        const tangent = Math.tan(34 * Math.PI / 360);
        expect(Math.abs((x * dz - z * dx) / ((distance - depth) * tangent * aspect))).toBeLessThanOrEqual(.900001);
        expect(Math.abs((y - target[1]) / ((distance - depth) * tangent))).toBeLessThanOrEqual(.900001);
      }
    }
  });

  it('retains existing distances for a narrow full-height avatar and the regular presenter camera', () => {
    const body: InspectionBounds = { min: [-.45, 0, -.35], max: [.45, 2.7, .35] };
    for (const aspect of [.64, 1.3]) for (const view of views) {
      expect(inspectionCameraPose(view, aspect, body)).toEqual(inspectionCameraPose(view, aspect));
    }
    expect(inspectionCameraPose(undefined, .64, shorts)).toEqual({ position: [0, 1.35, 7.2], target: [0, 1.25, 0] });
  });
});
