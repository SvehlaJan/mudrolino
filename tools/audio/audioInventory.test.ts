import { describe, expect, it } from 'vitest';

import { evaluateAudioInventory } from './audioInventory.ts';

describe('evaluateAudioInventory', () => {
  it('allows only listed pending recordings during development', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3'],
      existing: [],
      pending: ['sk/words/a.mp3'],
      strict: false,
    });

    expect(result).toEqual({ issues: [], pendingCount: 1 });
  });

  it('rejects missing recordings that are absent from the pending list', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3', 'sk/words/b.mp3'],
      existing: [],
      pending: ['sk/words/a.mp3'],
      strict: false,
    });

    expect(result.issues).toContain('Missing recording is not pending: sk/words/b.mp3');
  });

  it('rejects orphan files', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3'],
      existing: ['sk/words/a.mp3', 'sk/words/extra.mp3'],
      pending: [],
      strict: false,
    });

    expect(result.issues).toContain('Orphan recording: sk/words/extra.mp3');
  });

  it('rejects duplicate pending entries', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3'],
      existing: [],
      pending: ['sk/words/a.mp3', 'sk/words/a.mp3'],
      strict: false,
    });

    expect(result.issues).toContain('Duplicate pending recording: sk/words/a.mp3');
  });

  it('rejects pending paths that are not expected', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3'],
      existing: [],
      pending: ['sk/words/other.mp3'],
      strict: false,
    });

    expect(result.issues).toContain('Pending recording is not expected: sk/words/other.mp3');
  });

  it('rejects stale pending entries once their file exists', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3'],
      existing: ['sk/words/a.mp3'],
      pending: ['sk/words/a.mp3'],
      strict: false,
    });

    expect(result.issues).toContain('Pending recording already exists: sk/words/a.mp3');
  });

  it('requires every recording and an empty pending list in strict mode', () => {
    const result = evaluateAudioInventory({
      expected: ['sk/words/a.mp3', 'sk/words/b.mp3'],
      existing: [],
      pending: ['sk/words/a.mp3', 'sk/words/b.mp3'],
      strict: true,
    });

    expect(result.issues).toContain('Strict mode requires recording: sk/words/a.mp3');
    expect(result.issues).toContain('Strict mode requires recording: sk/words/b.mp3');
    expect(result.issues).toContain('Strict mode requires an empty pending list');
  });
});
