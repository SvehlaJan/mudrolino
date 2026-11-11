import { useCallback, useRef, useState } from 'react';
import { cn } from '../shared/ui/utils';
import { AvatarPresenter } from './AvatarPresenter';
import {
  selectIdleNudgeClip,
  shouldArmIdleNudge,
  type CompanionClipName,
} from './companionCelebration';
import type { CompanionConfig } from './companionConfig';
import { companionResources, type CompanionResource } from './companionResources';
import bearStill from './companions/bear-still.png';

export const IDLE_NUDGE_DELAY_MS = 12_000;

// eslint-disable-next-line react-refresh/only-export-components
export { selectIdleNudgeClip, shouldArmIdleNudge };

export interface CompanionNudgeEvent {
  eventKey: string;
  animationName: CompanionClipName;
  startedAtMs: number;
}

export interface CompanionNudgeProps {
  event: CompanionNudgeEvent | null;
  config: CompanionConfig | null;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl?: string;
  className?: string;
}

export function CompanionNudge({
  event,
  config,
  resource,
  reducedMotion,
  stillUrl = bearStill,
  className,
}: CompanionNudgeProps) {
  if (!event || !config) return null;

  return (
    <ActiveCompanionNudge
      key={`${event.eventKey}:${config.modelUrl}`}
      event={event}
      config={config}
      resource={resource}
      reducedMotion={reducedMotion}
      stillUrl={stillUrl}
      className={className}
    />
  );
}

function ActiveCompanionNudge({
  event,
  config,
  resource,
  reducedMotion,
  stillUrl,
  className,
}: {
  event: CompanionNudgeEvent;
  config: CompanionConfig;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl: string;
  className?: string;
}) {
  const [modelReady, setModelReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const failureReported = useRef(false);
  const modelUrl = config.modelUrl;

  const onModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  const onError = useCallback(() => {
    if (failureReported.current) return;
    failureReported.current = true;
    setFailed(true);
    companionResources.fail(modelUrl);
  }, [modelUrl]);

  const canRender =
    !reducedMotion && !failed && resource.status === 'ready' && resource.modelUrl === modelUrl;
  const rendered = canRender && modelReady;

  return (
    <div
      data-testid="companion-idle-nudge"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
      data-nudge-key={event.eventKey}
      data-companion-animation={event.animationName}
      data-companion-representation={rendered ? 'rendered3D' : 'still'}
      data-companion-resource-status={resource.status}
      className={cn(
        'pointer-events-none fixed bottom-3 left-3 sm:bottom-5 sm:left-5 z-20 h-24 w-20 max-sm:h-20 max-sm:w-16 [@media(max-height:480px)]:h-16 [@media(max-height:480px)]:w-14',
        className,
      )}
    >
      {!canRender && (
        <img src={stillUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}
      {canRender && (
        <AvatarPresenter
          className="absolute inset-0 h-full w-full"
          modelUrl={modelUrl}
          animationName={event.animationName}
          preserveHipsPosition
          cameraDistance={5.6}
          interactive={false}
          playback={{ mode: 'once', eventKey: event.eventKey, startedAtMs: event.startedAtMs }}
          assetStatusOverride="available"
          onModelReady={onModelReady}
          onError={onError}
        />
      )}
    </div>
  );
}
