import { afterEach, describe, expect, it, vi } from 'vitest';
import { transferTile } from './tileTransfer';

function tileFixture() {
  let complete!: () => void;
  let reject!: () => void;
  const animation = {
    finished: new Promise<void>((resolve, rejectPromise) => { complete = resolve; reject = () => rejectPromise(new Error('cancelled')); }),
    cancel: vi.fn(() => reject()),
  };
  const clone = {
    style: { setProperty: vi.fn() }, removeAttribute: vi.fn(), setAttribute: vi.fn(),
    querySelectorAll: () => [], remove: vi.fn(), animate: vi.fn(() => animation),
  };
  const source = {
    style: { visibility: '', setProperty: vi.fn() }, cloneNode: () => clone, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 300, left: 50, width: 90, height: 90 }),
  };
  const target = { getBoundingClientRect: () => ({ top: 100, left: 200, width: 60, height: 60 }) };
  vi.stubGlobal('getComputedStyle', () => []);
  vi.stubGlobal('document', { body: { appendChild: vi.fn() } });
  return { source: source as unknown as HTMLElement, target: target as unknown as HTMLElement, clone, animation, complete, reject };
}

afterEach(() => vi.unstubAllGlobals());

describe('tile transfer lifecycle', () => {
  it('keeps the answer hidden during travel and restores it only when the transfer lands', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, false);
    expect(fixture.source.style.visibility).toBe('hidden');
    expect(fixture.clone.remove).not.toHaveBeenCalled();
    fixture.complete();
    expect(await transfer.finished).toBe(true);
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('retains a landed piece and hides its source until the filled slot releases it', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, false, true);
    fixture.complete();
    expect(await transfer.finished).toBe(true);
    expect(fixture.source.style.visibility).toBe('hidden');
    expect(fixture.clone.remove).not.toHaveBeenCalled();
    transfer.release();
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('can cancel after arrival while an answer is still waiting for audio', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, false, true);
    fixture.complete();
    await transfer.finished;
    transfer.cancel();
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('cancels without allowing a cancelled answer to fill its question slot', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, false);
    transfer.cancel();
    transfer.cancel();
    expect(await transfer.finished).toBe(false);
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
    fixture.complete();
    await Promise.resolve();
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('restores the original answer and permits placement when browser animation fails', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, false);
    fixture.reject();
    expect(await transfer.finished).toBe(true);
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('permits immediate placement when browser animation cannot start', async () => {
    const fixture = tileFixture();
    fixture.clone.animate.mockImplementation(() => { throw new Error('WAAPI unavailable'); });
    const transfer = transferTile(fixture.source, fixture.target, false);
    expect(await transfer.finished).toBe(true);
    expect(fixture.source.style.visibility).toBe('');
    expect(fixture.clone.remove).toHaveBeenCalledOnce();
  });

  it('places with no clone or translation when reduced motion is requested', async () => {
    const fixture = tileFixture();
    const transfer = transferTile(fixture.source, fixture.target, true);
    expect(await transfer.finished).toBe(true);
    expect(fixture.clone.animate).not.toHaveBeenCalled();
    expect(fixture.source.style.visibility).toBe('');
  });
});
