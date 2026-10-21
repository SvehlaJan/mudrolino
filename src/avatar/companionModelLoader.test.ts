import { describe, expect, it, vi } from 'vitest';
import { GLTFLoader } from 'three-stdlib';
import { createCompanionModelLoader } from './companionModelLoader';

describe('optional companion model preparation', () => {
  it('parses outside rendering and shares a parsed scene across mounts', async () => {
    const load = vi.fn(() => new GLTFLoader().parseAsync(JSON.stringify({
      asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'BearRoot' }],
    }), ''));
    const prepare = createCompanionModelLoader(load);
    const first = prepare('/bear.glb');
    expect(prepare('/bear.glb')).toBe(first);
    const model = await first;
    expect(model.scene.getObjectByName('BearRoot')).toBeDefined();
    expect(await prepare('/bear.glb')).toBe(model);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps a real GLTF parsing failure rejected without retrying on another event', async () => {
    const bytes = new TextEncoder().encode('glTFbroken-model').buffer;
    const load = vi.fn(() => new GLTFLoader().parseAsync(bytes, ''));
    const prepare = createCompanionModelLoader(load);
    const first = prepare('/broken.glb');
    await expect(first).rejects.toThrow();
    expect(prepare('/broken.glb')).toBe(first);
    await expect(prepare('/broken.glb')).rejects.toThrow();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
