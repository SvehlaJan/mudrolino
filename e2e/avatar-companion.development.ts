import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { completeCurrentRound, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { startGame } from './support/gameEntry';

interface ScreencastFrame {
  data: string;
  deviceWidth: number;
  deviceHeight: number;
}

test('home companion survives development effect replay and plays tapped clips', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await page.goto('/');
  const bear = page.getByTestId('home-companion');
  await expect(bear).toHaveAttribute('data-companion-representation', 'rendered3D');
  const box = await bear.locator('canvas').boundingBox();
  expect(box).not.toBeNull();

  const cdp = await page.context().newCDPSession(page);
  let collector: { ignoreUntilMs: number; queue: ScreencastFrame[] } | null = null;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (!collector || Date.now() < collector.ignoreUntilMs) return;
    if (collector.queue.length < 24) {
      collector.queue.push({
        data,
        deviceWidth: metadata.deviceWidth,
        deviceHeight: metadata.deviceHeight,
      });
    }
  });

  try {
    await cdp.send('Page.startScreencast', {
      format: 'png',
      maxWidth: 800,
      maxHeight: 700,
      everyNthFrame: 1,
    });

    for (const clip of ['peekaboo', 'stretch', 'clap']) {
      await bear.click();
      await expect(bear).toHaveAttribute('data-companion-animation', clip);

      const frames = new Set<string>();
      const activeCollector = { ignoreUntilMs: Date.now() + 250, queue: [] as ScreencastFrame[] };
      collector = activeCollector;

      const deadline = Date.now() + 2500;
      while (frames.size < 3 && Date.now() < deadline) {
        const batch = activeCollector.queue.splice(0, activeCollector.queue.length);
        for (const frame of batch) {
          const buf = Buffer.from(frame.data, 'base64');
          const meta = await sharp(buf).metadata();
          const imgW = meta.width ?? frame.deviceWidth;
          const imgH = meta.height ?? frame.deviceHeight;
          const scaleX = imgW / frame.deviceWidth;
          const scaleY = imgH / frame.deviceHeight;
          const left = Math.max(0, Math.min(imgW - 1, Math.round((box!.x + 2) * scaleX)));
          const top = Math.max(0, Math.min(imgH - 1, Math.round((box!.y + 2) * scaleY)));
          const width = Math.max(1, Math.min(imgW - left, Math.round((box!.width - 4) * scaleX)));
          const height = Math.max(1, Math.min(imgH - top, Math.round((box!.height - 4) * scaleY)));
          const raw = await sharp(buf).extract({ left, top, width, height }).raw().toBuffer();
          // Canvas pixels, rather than a changed animation label, prove actual motion.
          frames.add(createHash('sha256').update(raw).digest('hex'));
          if (frames.size >= 3) break;
        }
        if (frames.size < 3) {
          await page.waitForTimeout(80);
        }
      }
      collector = null;

      expect(frames.size, `${clip} must visibly animate`).toBeGreaterThanOrEqual(3);
      await expect(bear).toHaveAttribute('data-companion-resource-status', 'ready');
    }
  } finally {
    collector = null;
    await cdp.send('Page.stopScreencast').catch(() => {});
    await cdp.detach().catch(() => {});
  }
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(requests);
});

test('counting prompt and celebration mount working 3D canvases on the development server', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await stubSpeechSynthesis(page);
  await startGame(page, '/counting');
  await waitForGamePhase(page, 'awaiting-answer');
  const promptBear = page.getByTestId('prompt-companion');
  await expect(promptBear).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptBear.locator('canvas')).toBeVisible();
  await completeCurrentRound(page, 'COUNTING_ITEMS');
  const bear = page.getByTestId('learning-companion');
  await expect(bear).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(bear).toHaveAttribute('data-companion-resource-status', 'ready');
  await expect(bear.locator('canvas')).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(requests);
});
