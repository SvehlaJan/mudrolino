import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarPresenter } from './AvatarPresenter';
import { resolveCatalogPreview } from './catalogPreview';
import type { AvatarSceneData } from './avatarTypes';

// Browser verifiers fulfill these fixed URLs from selected catalog source bytes.
// No legacy runtime assets or candidate promotion are required by this harness.
const entry = { id: 'catalog-runtime-fixture', kind: 'piece' as const,
  modelUrl: '/__avatar_fixture/body.glb', garmentUrl: '/__avatar_fixture/garments.glb', slot: 'top' as const };
const clips = { walk: '/__avatar_fixture/walk.glb', run: '/__avatar_fixture/run.glb' };

export function AvatarRuntimeFixture() {
  const [params] = useSearchParams();
  const requested = params.get('animation');
  const animation = requested === 'walk' || requested === 'run' ? requested : 'rest';
  const assets = useMemo(() => resolveCatalogPreview(entry, animation, clips), [animation]);
  const [scene, setScene] = useState<AvatarSceneData | null>(null);
  return (
    <main className="min-h-[100svh] bg-bg-light p-4">
      <div className="mx-auto h-[85svh] max-w-6xl overflow-hidden rounded-3xl bg-white">
        <AvatarPresenter className="h-full w-full" label="Catalog runtime verification"
          modelUrl={assets.baseUrl} animationUrl={assets.animationUrl}
          animationName={assets.animationName} externalAssets={assets.externalAssets}
          requiredUrls={assets.requiredUrls} preserveHipsPosition={assets.preserveHipsPosition}
          onSceneData={setScene} />
      </div>
      <pre data-testid="avatar-debug-json" hidden aria-hidden="true">{scene ? JSON.stringify(scene) : ''}</pre>
    </main>
  );
}
