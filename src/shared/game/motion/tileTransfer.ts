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
    minWidth: '0', minHeight: '0', maxWidth: 'none', maxHeight: 'none', aspectRatio: 'auto', outline: 'none',
  });
  // Let label typography follow the morph, rather than freezing it at the tray's size.
  const labels = Array.from(clone.querySelectorAll<HTMLElement>('[data-tile-label]'));
  if (labels[0]) clone.style.fontSize = labels[0].style.fontSize;
  for (const label of labels) Object.assign(label.style, { fontSize: 'inherit', width: 'auto', height: 'auto', minWidth: '0', minHeight: '0', whiteSpace: 'nowrap' });
  document.body.appendChild(clone);
  return clone;
}

export function getTileFontSize(tile: HTMLElement): string {
  const label = tile.querySelectorAll<HTMLElement>('[data-tile-label]')[0] ?? tile;
  return getComputedStyle(label).fontSize || '16px';
}

export interface TileTransfer {
  finished: Promise<boolean>;
  released: Promise<void>;
  cancel(): void;
  release(): void;
  readonly previewPlacement: boolean;
}

/** Explicit cancellation aborts placement; unsupported/failed animation falls back to immediate placement. */
export function transferTile(source: HTMLElement | null, target: HTMLElement | null, reducedMotion: boolean, retainUntilRelease = false, returnToSource = false): TileTransfer {
  const originalVisibility = source?.style.visibility ?? '';
  if (!source || !target || reducedMotion) {
    let resolveReleased!: () => void;
    const released = new Promise<void>((resolve) => { resolveReleased = resolve; });
    if (source && retainUntilRelease && !returnToSource) source.style.visibility = 'hidden';
    const restore = () => { if (source) source.style.visibility = originalVisibility; resolveReleased(); };
    if (!retainUntilRelease || returnToSource) restore();
    return { finished: Promise.resolve(true), released, previewPlacement: !returnToSource, cancel: restore, release: restore };
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
    const start: Keyframe = { top: `${from.top}px`, left: `${from.left}px`, width: `${from.width}px`, height: `${from.height}px`, fontSize: getTileFontSize(source), borderRadius: getComputedStyle(source).borderRadius || '22px' };
    const end: Keyframe = { top: `${to.top}px`, left: `${to.left}px`, width: `${to.width}px`, height: `${to.height}px`, fontSize: getTileFontSize(target), borderRadius: getComputedStyle(target).borderRadius || '16px' };
    animation = clone.animate([start, end], { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
    animation.finished.then(() => {
      if (cleaned) return;
      if (!returnToSource) { finish(true, retainUntilRelease); return; }
      try {
        animation = clone.animate([end, start], { duration: 420, delay: 140, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
        animation.finished.then(() => finish(true), () => finish(true));
      } catch { finish(true); }
    }, () => { removeFloating(); finish(true, retainUntilRelease && !returnToSource); });
  } catch {
    // A browser without working WAAPI can still place the correct answer immediately.
    removeFloating();
    finish(true, retainUntilRelease && !returnToSource);
  }
  return { finished, released, release, get previewPlacement() { return !returnToSource && !floating; }, cancel() { animation?.cancel(); release(); finish(false); } };
}
