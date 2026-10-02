import { describe, expect, it } from 'vitest';
import { GEOMETRY_TAG, INTEGRATION_IGNORED_SPECS, RELEASE_CORE_SPECS } from './browserProfiles';
import { CI_VIEWPORT_SUBSET, INTEGRATION_VIEWPORTS } from './viewports';

describe('browser profile ownership', () => {
  it('runs only viewport-sensitive tagged cases in the three geometry projects', () => {
    expect(CI_VIEWPORT_SUBSET).toEqual(['narrowPhone', 'shortLandscape', 'desktop']);
    expect(Object.keys(INTEGRATION_VIEWPORTS)).toEqual(CI_VIEWPORT_SUBSET);
    expect(GEOMETRY_TAG.test('@geometry answer targets fit')).toBe(true);
    expect(GEOMETRY_TAG.test('wrong answer recovers')).toBe(false);
    expect(GEOMETRY_TAG.test('@viewport-loop rotation preserves focus')).toBe(false);
  });

  it('assigns release parent data and explicit rotation loops to the release core only', () => {
    expect(INTEGRATION_IGNORED_SPECS).toContain('**/release-*.spec.ts');
    for (const spec of ['journeys', 'audio-order', 'parent-data', 'rotations']) {
      expect(RELEASE_CORE_SPECS.test(`release-${spec}.spec.ts`)).toBe(true);
    }
    for (const spec of ['responsive', 'accessibility', 'webkit-smoke']) {
      expect(RELEASE_CORE_SPECS.test(`release-${spec}.spec.ts`)).toBe(false);
    }
  });
});
