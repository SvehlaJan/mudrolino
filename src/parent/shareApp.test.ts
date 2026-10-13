import { describe, expect, it, vi } from 'vitest';
import { shareApp } from './shareApp';

const data = { title: 'Mudrolíno', text: 'Hry pre predškolákov.', url: 'https://mudrolino.vercel.app' };

describe('shareApp', () => {
  it('uses the system share sheet when the browser has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareApp(data, { share, clipboard: { writeText } as unknown as Clipboard })).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('treats a closed share sheet as a cancel, not a reason to copy', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    const writeText = vi.fn();
    expect(await shareApp(data, { share, clipboard: { writeText } as unknown as Clipboard })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when sharing is missing or fails for another reason', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareApp(data, { clipboard: { writeText } as unknown as Clipboard })).toBe('copied');
    const failingShare = vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    expect(await shareApp(data, { share: failingShare, clipboard: { writeText } as unknown as Clipboard })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it('reports unavailable when neither sharing nor copying works', async () => {
    expect(await shareApp(data, {})).toBe('unavailable');
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await shareApp(data, { clipboard: { writeText } as unknown as Clipboard })).toBe('unavailable');
  });
});
