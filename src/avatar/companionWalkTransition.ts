export interface CompanionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CompanionTravelStyle = 'hop';

export interface CompanionWalkPlan {
  style: CompanionTravelStyle;
  from: CompanionRect;
  to: CompanionRect;
  durationMs: number;
  targetYawRad: number;
  distancePx: number;
  clipName: 'jump';
  clipTimeScale: number;
  arcHeightPx: number;
  forwardLeanRad: number;
}

export interface CompanionWalkSample {
  progress: number;
  eased: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  yawRad: number;
  pitchRad: number;
  complete: boolean;
}

const MIN_WALK_DISTANCE_PX = 24;
const HOP_YAW_RAD = 0.48;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cubicEaseInOut(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothTurnEnvelope(u: number): number {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

function isUsableRect(rect: CompanionRect | null | undefined): rect is CompanionRect {
  return Boolean(
    rect &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width >= 12 &&
      rect.height >= 12,
  );
}

export function planCompanionWalk(
  fromRect: CompanionRect | null | undefined,
  toRect: CompanionRect | null | undefined,
  reducedMotion: boolean,
): CompanionWalkPlan | null {
  if (reducedMotion || !isUsableRect(fromRect) || !isUsableRect(toRect)) {
    return null;
  }
  const fromCx = fromRect.left + fromRect.width * 0.5;
  const fromCy = fromRect.top + fromRect.height * 0.5;
  const toCx = toRect.left + toRect.width * 0.5;
  const toCy = toRect.top + toRect.height * 0.5;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const distancePx = Math.hypot(dx, dy);
  if (!Number.isFinite(distancePx) || distancePx < MIN_WALK_DISTANCE_PX) {
    return null;
  }
  const dir = Math.abs(dx) >= 12 ? Math.sign(dx) : Math.sign(dy) || 1;
  const from = { left: fromRect.left, top: fromRect.top, width: fromRect.width, height: fromRect.height };
  const to = { left: toRect.left, top: toRect.top, width: toRect.width, height: toRect.height };

  const durationMs = Math.round(Math.max(520, Math.min(760, 420 + distancePx * 0.48)));
  const minTop = Math.min(fromRect.top, toRect.top);
  const canvasHeadroomPx = Math.round(Math.min(fromRect.height, toRect.height) * 0.14);
  const maxClearLift = Math.max(36, minTop + canvasHeadroomPx - 4);
  const arcHeightPx = Math.round(Math.min(110, Math.max(40, distancePx * 0.28), maxClearLift));

  return {
    style: 'hop',
    from,
    to,
    durationMs,
    targetYawRad: dir * HOP_YAW_RAD,
    distancePx,
    clipName: 'jump',
    clipTimeScale: Number(Math.max(1.9, Math.min(3.0, 1.6 / (durationMs / 1000))).toFixed(2)),
    arcHeightPx,
    forwardLeanRad: 0.10,
  };
}

export function sampleCompanionWalk(
  plan: CompanionWalkPlan,
  elapsedMs: number,
  liveToRect?: CompanionRect | null,
): CompanionWalkSample {
  const target = isUsableRect(liveToRect) ? liveToRect : plan.to;
  const progress = clamp01(elapsedMs / Math.max(1, plan.durationMs));
  const targetScaleX = target.width / plan.from.width;
  const targetScaleY = target.height / plan.from.height;

  const takeoffEnd = 0.14;
  const landStart = 0.88;
  const flightU =
    progress <= takeoffEnd
      ? 0
      : progress >= landStart
        ? 1
        : (progress - takeoffEnd) / (landStart - takeoffEnd);
  const eased = cubicEaseInOut(flightU);
  const baseScaleX = 1 + (targetScaleX - 1) * eased;
  const baseScaleY = 1 + (targetScaleY - 1) * eased;

  let squashX = 1;
  let squashY = 1;
  let liftPx = 0;
  let pitchRad = 0;

  if (progress > 0 && progress < takeoffEnd) {
    const crouch = Math.sin((progress / takeoffEnd) * Math.PI);
    squashX = 1 + 0.07 * crouch;
    squashY = 1 - 0.08 * crouch;
    pitchRad = 0.12 * crouch;
  } else if (progress >= takeoffEnd && progress < landStart) {
    const arc = 4 * flightU * (1 - flightU);
    liftPx = arc * plan.arcHeightPx;
    squashX = 1 - 0.05 * arc;
    squashY = 1 + 0.06 * arc;
    pitchRad = plan.forwardLeanRad * Math.cos(Math.PI * flightU) * Math.sin(Math.PI * flightU);
  } else if (progress >= landStart && progress < 1) {
    const absorb = Math.sin(((progress - landStart) / (1 - landStart)) * Math.PI);
    squashX = 1 + 0.08 * absorb;
    squashY = 1 - 0.09 * absorb;
    pitchRad = 0.08 * absorb;
  }

  const scaleX = baseScaleX * squashX;
  const scaleY = baseScaleY * squashY;
  const baseLeft = plan.from.left + (target.left - plan.from.left) * eased;
  const baseTop = plan.from.top + (target.top - plan.from.top) * eased - liftPx;
  const anchorOffsetX = -(plan.from.width * baseScaleX * (squashX - 1)) * 0.5;
  const anchorOffsetY = -(plan.from.height * baseScaleY * (squashY - 1));

  const turnIn = progress < 0.16 ? smoothTurnEnvelope(progress / 0.16) : 1;
  const turnOut = progress > 0.82 ? smoothTurnEnvelope((1 - progress) / 0.18) : 1;
  const rawYaw = plan.targetYawRad * Math.min(turnIn, turnOut);

  return {
    progress,
    eased,
    translateX: baseLeft + anchorOffsetX,
    translateY: baseTop + anchorOffsetY,
    scaleX,
    scaleY,
    yawRad: rawYaw === 0 ? 0 : rawYaw,
    pitchRad: pitchRad === 0 ? 0 : pitchRad,
    complete: progress >= 1,
  };
}
