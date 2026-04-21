import { AvatarPresenter } from './AvatarPresenter';

export function HomeAvatarOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 z-10 h-[24svh] min-h-[140px] w-[min(24vw,220px)] min-w-[120px] translate-x-[26%] translate-y-[10%] sm:h-[30svh] sm:min-h-[180px] sm:w-[min(22vw,280px)] sm:min-w-[150px] sm:translate-x-[20%] sm:translate-y-[8%] lg:h-[38svh] lg:min-h-[260px] lg:w-[min(20vw,360px)] lg:min-w-[180px] lg:translate-x-[16%] lg:translate-y-[6%]"
    >
      <AvatarPresenter className="h-full w-full" />
    </div>
  );
}
