import { AvatarPresenter } from './AvatarPresenter';

export function HomeAvatarOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 z-10 h-[14svh] min-h-[60px] w-[min(14vw,120px)] min-w-[48px] translate-x-[62%] translate-y-[32%] sm:h-[24svh] sm:min-h-[130px] sm:w-[min(18vw,220px)] sm:min-w-[110px] sm:translate-x-[38%] sm:translate-y-[16%] lg:h-[34svh] lg:min-h-[220px] lg:w-[min(18vw,320px)] lg:min-w-[150px] lg:translate-x-[24%] lg:translate-y-[10%]"
    >
      <AvatarPresenter className="h-full w-full" />
    </div>
  );
}
