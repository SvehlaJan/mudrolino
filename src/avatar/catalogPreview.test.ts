import { describe, expect, it } from 'vitest';
import { resolveCatalogPreview, type CatalogPreviewEntry } from './catalogPreview';

const entry: CatalogPreviewEntry = { id: 'F04', label: 'Orange boots', kind: 'piece', status: 'Candidate', modelUrl: '/body.glb', garmentUrl: '/boots.glb', slot: 'shoes' };
describe('catalog inspection assets', () => {
  it('loads the matching masked body, skinned piece and selected gait', () => {
    const result = resolveCatalogPreview(entry, 'run', { walk: '/walk.glb', run: '/run.glb' });
    expect(result.baseUrl).toBe('/body.glb');
    expect(result.requiredUrls).toEqual(['/body.glb', '/run.glb', '/boots.glb']);
    expect(result.externalAssets).toEqual([{ id: 'F04', slot: 'shoes', url: '/boots.glb', animationReady: true }]);
  });
  it('uses an assembled outfit directly and returns to rest without a gait', () => {
    const result = resolveCatalogPreview({ ...entry, kind: 'outfit', modelUrl: '/outfit.glb', garmentUrl: undefined }, 'rest', { walk: '/walk.glb', run: '/run.glb' });
    expect(result.requiredUrls).toEqual(['/outfit.glb']);
    expect(result.externalAssets).toEqual([]);
    expect(result.animationUrl).toBeUndefined();
  });
});
