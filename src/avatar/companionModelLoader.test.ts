import { describe, expect, it, vi } from 'vitest';
import { GLTFLoader } from 'three-stdlib';
import { createCompanionModelLoader, loadCompanionModel } from './companionModelLoader';
import { companionResources } from './companionResources';

function makeMinimalGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'BearRoot' }],
  });
  const encoded = new TextEncoder().encode(json);
  const paddedLength = Math.ceil(encoded.byteLength / 4) * 4;
  const buffer = new ArrayBuffer(12 + 8 + paddedLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  const chunkBytes = new Uint8Array(buffer, 20, paddedLength);
  chunkBytes.fill(0x20);
  chunkBytes.set(encoded);
  return buffer;
}

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

  it('releases prepared raw GLB bytes once loadCompanionModel parses and caches the GLTF', async () => {
    const testUrl = 'https://assets.example.test/release-check-bear.glb';
    let storedBytes: ArrayBuffer | null = makeMinimalGlb();
    const getBytesSpy = vi.spyOn(companionResources, 'getModelBytes').mockImplementation(requested =>
      requested === testUrl ? storedBytes : null,
    );
    const releaseSpy = vi.spyOn(companionResources, 'releaseModelBytes').mockImplementation(requested => {
      if (requested === testUrl) storedBytes = null;
    });

    try {
      const gltf = await loadCompanionModel(testUrl);
      expect(gltf.scene.getObjectByName('BearRoot')).toBeDefined();
      expect(loadCompanionModel.getLoaded(testUrl)).toBe(gltf);
      expect(releaseSpy).toHaveBeenCalledTimes(1);
      expect(releaseSpy).toHaveBeenCalledWith(testUrl);
      expect(storedBytes).toBeNull();

      expect(await loadCompanionModel(testUrl)).toBe(gltf);
      expect(getBytesSpy).toHaveBeenCalledTimes(1);
    } finally {
      getBytesSpy.mockRestore();
      releaseSpy.mockRestore();
    }
  });
});
