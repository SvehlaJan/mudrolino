import { AvatarPresenter } from './AvatarPresenter';
import { AVATAR_MODULAR_MALE_MODEL_URL } from './avatarConstants';
import { useAvatarState } from './useAvatarState';

export function HomeAvatarOverlay() {
  const { avatarState } = useAvatarState();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 m-auto h-[min(36svh,280px)] min-h-[170px] w-[min(36vw,280px)] min-w-[170px] translate-y-[7svh] sm:h-[min(42svh,340px)] sm:w-[min(30vw,340px)] lg:h-[min(46svh,380px)] lg:w-[min(26vw,380px)]"
    >
      <AvatarPresenter
        className="h-full w-full"
        modelUrl={AVATAR_MODULAR_MALE_MODEL_URL}
        slotSelections={avatarState.config.slotSelections}
      />
    </div>
  );
}
