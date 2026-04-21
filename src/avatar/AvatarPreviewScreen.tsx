import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AvatarPresenter } from './AvatarPresenter';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

export function AvatarPreviewScreen() {
  const navigate = useNavigate();
  const assetStatus = useAvatarAssetAvailability(AVATAR_MODEL_URL);

  return (
    <div className="h-[100svh] overflow-y-auto bg-bg-light p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="safe-top safe-left fixed z-20 flex h-14 w-14 items-center justify-center rounded-full bg-white text-text-main shadow-chip transition-transform hover:scale-105 active:scale-95"
        aria-label="Späť"
      >
        <ArrowLeft size={30} />
      </button>

      <main className="mx-auto flex h-full min-h-0 max-w-5xl flex-col items-center justify-center gap-6 text-center">
        <div className="h-[clamp(180px,52svh,560px)] w-[min(82vw,520px)]">
          <AvatarPresenter className="h-full w-full" />
        </div>
        <div>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-black leading-none text-text-main">
            Avatar Preview
          </h1>
          <p className="mt-3 text-lg font-semibold opacity-70 sm:text-2xl">
            Asset: {AVATAR_MODEL_URL}
          </p>
          <p className="mt-1 text-base font-semibold opacity-60 sm:text-xl">
            Status: {assetStatus}
          </p>
        </div>
      </main>
    </div>
  );
}
