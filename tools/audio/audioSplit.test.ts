import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('preserves manual and session audio splitting profiles and ffmpeg contracts', () => {
  const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tools/audio', '-p', 'audio_split_core_test.py'], { encoding: 'utf8' });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
