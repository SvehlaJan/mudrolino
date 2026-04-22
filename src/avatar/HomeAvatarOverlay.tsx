import { AvatarPresenter } from './AvatarPresenter';

export function HomeAvatarOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 m-auto h-[min(36svh,280px)] min-h-[170px] w-[min(36vw,280px)] min-w-[170px] translate-y-[7svh] sm:h-[min(42svh,340px)] sm:w-[min(30vw,340px)] lg:h-[min(46svh,380px)] lg:w-[min(26vw,380px)]"
    >
      <AvatarPresenter className="h-full w-full" />
    </div>
  );
}
