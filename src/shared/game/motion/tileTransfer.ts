/** Preserve the tile's inherited typography and variables when it leaves its layout tree. */
export function createFloatingTile(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  originals.forEach((element, index) => {
    const computed = getComputedStyle(element);
    for (const property of computed) copies[index].style.setProperty(property, computed.getPropertyValue(property));
  });
  const rect = source.getBoundingClientRect();
  clone.removeAttribute('id');
  clone.removeAttribute('data-tile-id');
  clone.removeAttribute('data-answer-id');
  clone.setAttribute('data-tile-flight', 'true');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  Object.assign(clone.style, {
    position: 'fixed', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    margin: '0', pointerEvents: 'none', zIndex: '40', transform: 'none', transition: 'none', visibility: 'visible',
  });
  document.body.appendChild(clone);
  return clone;
}

export interface TileTransfer {
  finished: Promise<boolean>;
  released: Promise<void>;
  cancel(): void;
  release(): void;
  readonly previewPlacement: boolean;
}

/** Explicit cancellation aborts placement; unsupported/failed animation falls back to immediate placement. */
export function transferTile(source: HTMLElement | null, target: HTMLElement | null, reducedMotion: boolean, retainUntilRelease = false): TileTransfer {
  const originalVisibility = source?.style.visibility ?? '';
  if (!source || !target || reducedMotion) {
    let resolveReleased!: () => void;
    const released = new Promise<void>((resolve) => { resolveReleased = resolve; });
    if (source && retainUntilRelease) source.style.visibility = 'hidden';
    const restore = () => { if (source) source.style.visibility = originalVisibility; resolveReleased(); };
    if (!retainUntilRelease) restore();
    return { finished: Promise.resolve(true), released, previewPlacement: true, cancel: restore, release: restore };
  }
  const clone = createFloatingTile(source);
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  source.style.visibility = 'hidden';
  let resolveFinished!: (completed: boolean) => void;
  const finished = new Promise<boolean>((resolve) => { resolveFinished = resolve; });
  let resolveReleased!: () => void;
  const released = new Promise<void>((resolve) => { resolveReleased = resolve; });
  let animation: Animation | undefined;
  let settled = false;
  let cleaned = false;
  let floating = true;
  const removeFloating = () => { if (floating) { floating = false; clone.remove(); } };
  const release = () => {
    if (cleaned) return;
    cleaned = true;
    removeFloating();
    source.style.visibility = originalVisibility;
    resolveReleased();
  };
  const finish = (completed: boolean, retain = false) => {
    if (settled) return;
    settled = true;
    if (!retain) release();
    resolveFinished(completed);
  };
  try {
    const scale = Math.min(to.width / from.width, to.height / from.height);
    const x = to.left + (to.width - from.width * scale) / 2 - from.left;
    const y = to.top + (to.height - from.height * scale) / 2 - from.top;
    clone.style.transformOrigin = 'top left';
    animation = clone.animate([
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: `translate(${x}px, ${y}px) scale(${scale})` },
    ], { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
    animation.finished.then(() => finish(true, retainUntilRelease), () => { removeFloating(); finish(true, retainUntilRelease); });
  } catch {
    // A browser without working WAAPI can still place the correct answer immediately.
    removeFloating();
    finish(true, retainUntilRelease);
  }
  return { finished, released, release, get previewPlacement() { return !floating; }, cancel() { animation?.cancel(); release(); finish(false); } };
}
