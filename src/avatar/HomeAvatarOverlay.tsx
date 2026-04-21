import { AvatarPresenter } from './AvatarPresenter';

export function HomeAvatarOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 z-10 h-[34svh] min-h-[210px] w-[min(34vw,340px)] min-w-[180px] translate-x-[8%] sm:h-[42svh] sm:min-h-[300px] sm:w-[min(30vw,420px)] lg:h-[50svh] lg:min-h-[380px] lg:w-[min(26vw,460px)]"
    >
      <AvatarPresenter className="h-full w-full" label="Animovaný sprievodca" />
    </div>
  );
}
