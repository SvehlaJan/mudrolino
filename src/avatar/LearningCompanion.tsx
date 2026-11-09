import { useCallback, useRef, useState } from 'react';
import { cn } from '../shared/ui/utils';
import { AvatarPresenter } from './AvatarPresenter';
import { companionResources } from './companionResources';
import type { CelebrationEvent } from './companionCelebration';
import type { CompanionConfig } from './companionConfig';
import type { CompanionResource } from './companionResources';

interface LearningCompanionProps {
  event: CelebrationEvent | null;
  config: CompanionConfig | null;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl: string;
  /** The shell may size this to fill its responsive reserved visual area. */
  className?: string;
}
export function LearningCompanion(props: LearningCompanionProps) {
  if (!props.event || !props.config) return null;
  return <ActiveCompanion key={`${props.event.eventKey}:${props.config.modelUrl}`} {...props} event={props.event} config={props.config} />;
}

function ActiveCompanion({ event, config, resource, reducedMotion, stillUrl, className }: LearningCompanionProps & {
  event: CelebrationEvent;
  config: CompanionConfig;
}) {
  const [modelReady, setModelReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const failureReported = useRef(false);
  const modelUrl = config.modelUrl;
  const onModelReady = useCallback(() => { setModelReady(true); }, []);
  const onError = useCallback(() => {
    if (failureReported.current) return;
    failureReported.current = true;
    setFailed(true);
    companionResources.fail(modelUrl);
  }, [modelUrl]);
  const canRender = !reducedMotion && !failed
    && resource.status === 'ready' && resource.modelUrl === modelUrl;
  const rendered = canRender && modelReady;

  const activeAnimation = event.animationName ?? config.animationName;

  return (
    <div
      className={cn('pointer-events-none relative h-[200px] w-44 shrink-0', className)}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
      data-testid="learning-companion"
      data-celebration-key={event.eventKey}
      data-companion-animation={activeAnimation}
      data-companion-representation={rendered ? 'rendered3D' : 'still'}
      data-companion-resource-status={resource.status}
    >
      {!canRender && <img src={stillUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      {canRender && (
        <AvatarPresenter
          className="absolute inset-0 h-full w-full"
          modelUrl={modelUrl}
          animationName={activeAnimation}
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
