import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const req = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = req('playwright');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const screenshotDir =
  process.env.SCREENSHOT_DIR ||
  '/Users/svehla/.gemini/antigravity/brain/c3bef48f-2a10-49a2-ab43-e3c295a19449/screenshots';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function run() {
  console.log('Launching Playwright browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  // 1. Home with default font (Nunito)
  console.log('Navigating to Home...');
  await page.goto(`${baseUrl}/`);
  await page.waitForSelector('text=Hravé Učenie');
  await page.waitForTimeout(1000);

  const defaultFont = await page.evaluate(() => document.documentElement.dataset.font);
  console.log('Default document font:', defaultFont);
  if (defaultFont !== 'nunito') {
    throw new Error(`Expected default font 'nunito', got '${defaultFont}'`);
  }

  await page.screenshot({ path: path.join(screenshotDir, 'verified_home_nunito.png') });
  console.log('Saved verified_home_nunito.png');

  // 2. Settings screen with Písmo card
  console.log('Navigating to Settings...');
  await page.goto(`${baseUrl}/settings`);
  await page.waitForSelector('text=Písmo');
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(screenshotDir, 'verified_settings_font.png') });
  console.log('Saved verified_settings_font.png');

  // 3. Switch to Shantell Sans
  console.log('Selecting Shantell Sans in Settings...');
  const shantellBtn = page.getByRole('button', { name: /Hravé/i });
  await shantellBtn.click();
  await page.waitForTimeout(500);

  const switchedFont = await page.evaluate(() => document.documentElement.dataset.font);
  console.log('Font after switch:', switchedFont);
  if (switchedFont !== 'shantell') {
    throw new Error(`Expected switched font 'shantell', got '${switchedFont}'`);
  }

  // 4. Home with Shantell Sans
  console.log('Navigating to Home with Shantell...');
  await page.goto(`${baseUrl}/`);
  await page.waitForSelector('text=Hravé Učenie');
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(screenshotDir, 'verified_home_shantell.png') });
  console.log('Saved verified_home_shantell.png');

  // 5. Mobile viewport verification with Nunito
  console.log('Switching back to Nunito and testing mobile viewport...');
  await page.goto(`${baseUrl}/settings`);
  await page.waitForSelector('text=Písmo');
  const nunitoBtn = page.getByRole('button', { name: /Zaoblené/i });
  await nunitoBtn.click();
  await page.waitForTimeout(300);

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  await mobilePage.goto(`${baseUrl}/`);
  await mobilePage.waitForSelector('text=Hravé Učenie');
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({ path: path.join(screenshotDir, 'verified_home_mobile_nunito.png') });
  console.log('Saved verified_home_mobile_nunito.png');

  await browser.close();
  console.log('✓ All visual font verifications completed successfully!');
}

run().catch((err) => {
  console.error('Visual verification failed:', err);
  process.exit(1);
});
