import { describe, expect, it } from 'vitest';
import { pwaPluginOptions } from './pwaConfig';

describe('pwaConfig workbox precache rules', () => {
  it('precaches hashed bear-still fallback PNGs while keeping 3D GLBs and AvatarScene chunk excluded', () => {
    expect(pwaPluginOptions.workbox?.globPatterns).toContain('assets/bear-still-*.png');
    expect(pwaPluginOptions.workbox?.globIgnores).toEqual(
      expect.arrayContaining(['avatar/**/*.glb', 'assets/AvatarScene-*.js']),
    );
  });
});
