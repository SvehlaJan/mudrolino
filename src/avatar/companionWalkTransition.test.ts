import { describe, expect, it } from 'vitest';
import { planCompanionWalk, sampleCompanionWalk } from './companionWalkTransition';

const homeRect = { left: 280, top: 320, width: 140, height: 156 };
const promptRect = { left: 40, top: 80, width: 88, height: 100 };

describe('companionWalkTransition', () => {
  it('skips walking when reduced motion is enabled, rects are unusable, or distance is tiny', () => {
    expect(planCompanionWalk(homeRect, promptRect, true)).toBeNull();
    expect(planCompanionWalk(null, promptRect, false)).toBeNull();
    expect(planCompanionWalk({ left: 0, top: 0, width: 0, height: 0 }, promptRect, false)).toBeNull();
    expect(
      planCompanionWalk(homeRect, { ...homeRect, left: homeRect.left + 8, top: homeRect.top - 5 }, false),
    ).toBeNull();
  });

  it('plans clamped parabolic hop duration, headroom arc, jump speed, and turn yaw across UI routes', () => {
    const hopLeft = planCompanionWalk(homeRect, promptRect, false)!;
    expect(hopLeft).not.toBeNull();
    expect(hopLeft.style).toBe('hop');
    expect(hopLeft.clipName).toBe('jump');
    expect(hopLeft.clipTimeScale).toBeGreaterThanOrEqual(1.9);
    expect(hopLeft.durationMs).toBeGreaterThanOrEqual(520);
    expect(hopLeft.durationMs).toBeLessThanOrEqual(760);
    expect(hopLeft.arcHeightPx).toBeGreaterThanOrEqual(40);
    expect(hopLeft.targetYawRad).toBeLessThan(0);

    // Top-header Home <-> Game slots stay bounded by available headroom without flattening
    const headerHome = { left: 960, top: 20, width: 112, height: 128 };
    const headerPrompt = { left: 40, top: 24, width: 84, height: 96 };
    const headerHop = planCompanionWalk(headerHome, headerPrompt, false)!;
    expect(headerHop.arcHeightPx).toBeGreaterThanOrEqual(36);
    expect(headerHop.arcHeightPx).toBeLessThanOrEqual(44);
    expect(headerHop.targetYawRad).toBeLessThan(0);

    const hopRight = planCompanionWalk(promptRect, homeRect, false)!;
    expect(hopRight.targetYawRad).toBeGreaterThan(0);
  });

  it('produces parabolic airborne lift, yaw turn, bottom-anchored squash-and-stretch, and exact endpoints', () => {
    const overlayRect = { left: 540, top: 310, width: 176, height: 200 };
    const plan = planCompanionWalk(promptRect, overlayRect, false)!;

    const start = sampleCompanionWalk(plan, 0);
    expect(start.translateX).toBeCloseTo(promptRect.left, 4);
    expect(start.translateY).toBeCloseTo(promptRect.top, 4);
    expect(start.scaleX).toBeCloseTo(1, 4);
    expect(start.scaleY).toBeCloseTo(1, 4);
    expect(start.yawRad).toBe(0);
    expect(start.pitchRad).toBe(0);
    expect(start.complete).toBe(false);

    const takeoffCrouch = sampleCompanionWalk(plan, plan.durationMs * 0.07);
    expect(takeoffCrouch.scaleX).toBeGreaterThan(1);
    expect(takeoffCrouch.scaleY).toBeLessThan(1);

    const apex = sampleCompanionWalk(plan, plan.durationMs * 0.51);
    const linearY = promptRect.top + (overlayRect.top - promptRect.top) * apex.eased;
    expect(apex.translateY).toBeLessThan(linearY - 30);
    expect(Math.abs(apex.yawRad)).toBeCloseTo(Math.abs(plan.targetYawRad), 3);

    const landingSquash = sampleCompanionWalk(plan, plan.durationMs * 0.94);
    expect(landingSquash.scaleY).toBeLessThan(overlayRect.height / promptRect.height);

    const shiftedOverlay = { left: 560, top: 320, width: 176, height: 200 };
    const landed = sampleCompanionWalk(plan, plan.durationMs, shiftedOverlay);
    expect(landed.translateX).toBeCloseTo(shiftedOverlay.left, 4);
    expect(landed.translateY).toBeCloseTo(shiftedOverlay.top, 4);
    expect(landed.scaleX).toBeCloseTo(shiftedOverlay.width / promptRect.width, 4);
    expect(landed.scaleY).toBeCloseTo(shiftedOverlay.height / promptRect.height, 4);
    expect(landed.yawRad).toBe(0);
    expect(landed.pitchRad).toBe(0);
    expect(landed.complete).toBe(true);
  });
});
