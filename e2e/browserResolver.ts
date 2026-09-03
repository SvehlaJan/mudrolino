import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Sandboxed environments (Claude Code on the web, some CI images) pre-install a
 * Chromium under PLAYWRIGHT_BROWSERS_PATH and block cdn.playwright.dev, so
 * `npx playwright install` cannot fetch the exact build this Playwright version
 * wants. Launching the pre-installed browser is better than not running at all.
 *
 * Returns undefined on a normal machine, where Playwright's own managed browser
 * is correct and should win.
 */
export function resolveChromiumExecutable(
  env: NodeJS.ProcessEnv = process.env,
  exists: (candidate: string) => boolean = existsSync,
): string | undefined {
  // An explicit path is trusted as-is: if it is wrong, Playwright's own launch
  // error names it, which beats silently falling back to a different browser.
  const explicit = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (explicit) return explicit;

  const browsersPath = env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath) return undefined;

  // A Playwright-managed directory holds versioned entries (chromium-1217/), never
  // a bare `chromium`, so this only matches an environment that pre-staged one.
  const preinstalled = path.join(browsersPath, 'chromium');
  return exists(preinstalled) ? preinstalled : undefined;
}
