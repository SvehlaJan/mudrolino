import { describe, expect, it } from 'vitest';
import { selectVerification } from './selection';

describe('source to verification selection', () => {
  it('selects numeracy behavior and geometry for a game implementation', () => {
    expect(selectVerification(['src/games/counting/CountingGame.tsx'])).toEqual({
      profile: 'edit', specs: ['counting.spec.ts', 'numeracy-accessibility.spec.ts', 'numeracy-responsive.spec.ts'], reason: 'affected areas',
    });
  });
  it('broadens shared session, routing, content, audio and build changes', () => {
    for (const path of ['src/shared/game/useGameSession.ts', 'src/App.tsx', 'src/shared/services/audioManager.ts', 'src/shared/locales/sk.ts', 'vite.config.ts']) {
      expect(selectVerification([path]).profile).toBe('integration');
    }
  });
  it('fails conservatively for an unmapped source or deleted suite', () => {
    expect(selectVerification(['src/newFeature.ts'] ).profile).toBe('integration');
    expect(selectVerification(['e2e/future.spec.ts']).profile).toBe('integration');
  });
  it('skips browser checks for documentation alone', () => {
    expect(selectVerification(['ROADMAP.md', 'docs/audit.md']).profile).toBe('none');
  });
  it('unions affected game suites and honors explicit integration', () => {
    expect(selectVerification(['src/games/counting/CountingGame.tsx', 'src/games/addition/AdditionGame.tsx']).specs).toContain('addition.spec.ts');
    expect(selectVerification([], 'integration').profile).toBe('integration');
  });
});
