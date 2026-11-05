import { describe, expect, it, vi } from 'vitest';
import { createModuleLoader } from './moduleLoader';

describe('createModuleLoader', () => {
  it('loads once and gives every caller the same promise', async () => {
    const load = vi.fn(async () => ({ name: 'game' }));
    const loader = createModuleLoader(load);

    const first = loader.load();
    const second = loader.load();

    expect(second).toBe(first);
    await expect(first).resolves.toEqual({ name: 'game' });
    expect(loader.load()).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports the module only once its load has finished', async () => {
    let resolve!: (value: string) => void;
    const loader = createModuleLoader(() => new Promise<string>((done) => { resolve = done; }));

    expect(loader.loaded()).toBeUndefined();
    const pending = loader.load();
    expect(loader.loaded()).toBeUndefined();

    resolve('game');
    await pending;
    expect(loader.loaded()).toBe('game');
  });

  it('forgets a failed load so the next call retries', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('game');
    const loader = createModuleLoader(load);

    await expect(loader.load()).rejects.toThrow('offline');
    expect(loader.loaded()).toBeUndefined();

    await expect(loader.load()).resolves.toBe('game');
    expect(loader.loaded()).toBe('game');
    expect(load).toHaveBeenCalledTimes(2);
  });
});
