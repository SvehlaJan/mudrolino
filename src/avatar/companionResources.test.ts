import { describe, expect, it, vi } from 'vitest';
import { createCompanionResources } from './companionResources';
import { celebrationReducer, createCelebrationState } from './companionCelebration';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const glb = () => new Response(new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]));
const url = 'https://assets.example.test/bear.glb';

describe('shared optional companion preparation', () => {
  it('retains validated bytes for parsing without a second model GET', async () => {
    const response = glb();
    const expected = await response.clone().arrayBuffer();
    const fetchModel = vi.fn(async () => response);
    const store = createCompanionResources({ fetchModel, loadScene: async () => ({}) });
    expect(store.getModelBytes(url)).toBeNull();
    await store.prepare(url);
    expect(new Uint8Array(store.getModelBytes(url)!)).toEqual(new Uint8Array(expected));
    expect(store.getModelBytes(url)).toBe(store.getModelBytes(url));
    expect(fetchModel).toHaveBeenCalledTimes(1);
  });
  it('does no work for null and returns one stable disabled snapshot', async () => {
    const fetchModel = vi.fn(async () => glb());
    const loadScene = vi.fn(async () => ({}));
    const store = createCompanionResources({ fetchModel, loadScene });
    const initial = store.getSnapshot(null);
    expect(initial).toEqual({ status: 'disabled', modelUrl: null });
    expect(await store.prepare(null)).toBe(initial);
    expect(store.getSnapshot(null)).toBe(initial);
    expect(fetchModel).not.toHaveBeenCalled();
    expect(loadScene).not.toHaveBeenCalled();
  });

  it.each(['model', 'scene'] as const)('shares pending work and waits for both (%s first)', async first => {
    const model = deferred<Response>();
    const scene = deferred<unknown>();
    const fetchModel = vi.fn(() => model.promise);
    const loadScene = vi.fn(() => scene.promise);
    const store = createCompanionResources({ fetchModel, loadScene });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const idle = store.getSnapshot(url);
    expect(store.getSnapshot(url)).toBe(idle);
    expect(idle).toEqual({ status: 'loading', modelUrl: url });
    const pending = store.prepare(url);
    expect(store.prepare(url)).toBe(pending);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(fetchModel).toHaveBeenCalledWith(url);
    expect(loadScene).toHaveBeenCalledTimes(1);
    if (first === 'model') model.resolve(glb());
    else scene.resolve({});
    await Promise.resolve();
    expect(store.getSnapshot(url).status).toBe('loading');
    if (first === 'model') scene.resolve({});
    else model.resolve(glb());
    const ready = await pending;
    expect(ready).toEqual({ status: 'ready', modelUrl: url });
    expect(store.getSnapshot(url)).toBe(ready);
    expect(store.prepare(url)).toBe(pending);
    expect(await store.prepare(url)).toBe(ready);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.fail(url);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(['http', 'magic', 'short-body', 'body-read', 'fetch', 'scene', 'sync-fetch', 'sync-scene'])(
    'settles %s failure and does not retry', async failure => {
      const fetchModel = vi.fn(() => {
        if (failure === 'sync-fetch') throw new Error('sync model failure');
        if (failure === 'fetch') return Promise.reject(new Error('model failure'));
        if (failure === 'http') return Promise.resolve(new Response('missing', { status: 404 }));
        if (failure === 'magic') return Promise.resolve(new Response('not a glb'));
        if (failure === 'short-body') return Promise.resolve(new Response(new Uint8Array([0x67, 0x6c])));
        if (failure === 'body-read') {
          const response = glb();
          vi.spyOn(response, 'arrayBuffer').mockRejectedValue(new Error('body failure'));
          return Promise.resolve(response);
        }
        return Promise.resolve(glb());
      });
      const loadScene = vi.fn(() => {
        if (failure === 'sync-scene') throw new Error('sync chunk failure');
        return failure === 'scene' ? Promise.reject(new Error('chunk failure')) : Promise.resolve({});
      });
      const store = createCompanionResources({ fetchModel, loadScene });
      const pending = store.prepare(url);
      expect(await pending).toEqual({ status: 'failed', modelUrl: url });
      expect(store.prepare(url)).toBe(pending);
      expect(fetchModel).toHaveBeenCalledTimes(1);
      expect(loadScene).toHaveBeenCalledTimes(1);
    });

  it('consumes the model response before declaring preparation ready', async () => {
    const body = deferred<ArrayBuffer>();
    const response = glb();
    const read = vi.spyOn(response, 'arrayBuffer').mockReturnValue(body.promise);
    const store = createCompanionResources({ fetchModel: async () => response, loadScene: async () => ({}) });
    const pending = store.prepare(url);
    await Promise.resolve();
    expect(read).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot(url).status).toBe('loading');
    body.resolve(await glb().arrayBuffer());
    expect((await pending).status).toBe('ready');
  });

  it('persists renderer failure through a late successful preparation', async () => {
    const model = deferred<Response>();
    const store = createCompanionResources({ fetchModel: () => model.promise, loadScene: async () => ({}) });
    const listener = vi.fn();
    store.subscribe(listener);
    const pending = store.prepare(url);
    store.fail(url);
    const failed = store.getSnapshot(url);
    model.resolve(glb());
    expect(await pending).toBe(failed);
    expect(store.getSnapshot(url)).toBe(failed);
    store.fail(url);
    expect(store.getSnapshot(url)).toBe(failed);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('marks an unprepared URL failed without network or import', async () => {
    const fetchModel = vi.fn(async () => glb());
    const loadScene = vi.fn(async () => ({}));
    const store = createCompanionResources({ fetchModel, loadScene });
    store.fail(url);
    expect(await store.prepare(url)).toEqual({ status: 'failed', modelUrl: url });
    expect(fetchModel).not.toHaveBeenCalled();
    expect(loadScene).not.toHaveBeenCalled();
  });

  it('replaces cached readiness after an actual renderer failure', async () => {
    const fetchModel = vi.fn(async () => glb());
    const loadScene = vi.fn(async () => ({}));
    const store = createCompanionResources({ fetchModel, loadScene });
    expect((await store.prepare(url)).status).toBe('ready');
    store.fail(url);
    const failed = store.getSnapshot(url);
    expect(await store.prepare(url)).toBe(failed);
    expect(failed.status).toBe('failed');
    const cachedFailure = store.prepare(url);
    store.fail(url);
    expect(store.prepare(url)).toBe(cachedFailure);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(loadScene).toHaveBeenCalledTimes(1);
  });

  it('handles a second dependency rejection after the first has already failed', async () => {
    const model = deferred<Response>();
    const scene = deferred<unknown>();
    const store = createCompanionResources({ fetchModel: () => model.promise, loadScene: () => scene.promise });
    const pending = store.prepare(url);
    scene.reject(new Error('chunk unavailable'));
    const failed = await pending;
    expect(failed.status).toBe('failed');
    model.reject(new Error('model unavailable later'));
    await Promise.resolve();
    expect(store.getSnapshot(url)).toBe(failed);
  });

  it('keeps URL outcomes independent and shared work alive after unsubscribe', async () => {
    const model = deferred<Response>();
    const store = createCompanionResources({ fetchModel: async () => model.promise, loadScene: async () => ({}) });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const pending = store.prepare(url);
    unsubscribe();
    store.fail('https://assets.example.test/other.glb');
    model.resolve(glb());
    expect((await pending).status).toBe('ready');
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot('https://assets.example.test/other.glb').status).toBe('failed');
  });

  it('cannot revive an expired celebration when resources become ready', async () => {
    const observation = { phase: 'answered-correctly' as const, paused: false,
      feedback: 'success' as const, roundsPlayed: 1, correctRounds: 1 };
    const event = celebrationReducer(createCelebrationState(), { type: 'observe', observation, nowMs: 0 });
    const expired = celebrationReducer(event, { type: 'expire', eventKey: event.active!.eventKey, nowMs: 1600 });
    const store = createCompanionResources({ fetchModel: async () => glb(), loadScene: async () => ({}) });
    await store.prepare(url);
    expect(celebrationReducer(expired, { type: 'observe', observation, nowMs: 2000 }).active).toBeNull();
  });
});
