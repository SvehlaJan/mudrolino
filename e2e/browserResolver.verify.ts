import { resolveChromiumExecutable } from './browserResolver';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const nothingExists = () => false;
const everythingExists = () => true;

// A normal developer machine: Playwright's own managed browser must win.
assert(
  resolveChromiumExecutable({}, nothingExists) === undefined,
  'no browsers path and no override resolves to the managed browser',
);

// An explicit override is trusted even if the path looks wrong, so a typo
// surfaces as Playwright's own launch error instead of a silent fallback.
assert(
  resolveChromiumExecutable({ PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/custom/chrome' }, nothingExists) ===
    '/custom/chrome',
  'explicit executable override is used as-is',
);
assert(
  resolveChromiumExecutable(
    { PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/custom/chrome', PLAYWRIGHT_BROWSERS_PATH: '/opt/pw-browsers' },
    everythingExists,
  ) === '/custom/chrome',
  'explicit override beats a pre-installed browser',
);

// A sandbox that pre-staged a browser: use it rather than failing to download one.
assert(
  resolveChromiumExecutable({ PLAYWRIGHT_BROWSERS_PATH: '/opt/pw-browsers' }, everythingExists) ===
    '/opt/pw-browsers/chromium',
  'pre-installed chromium under the browsers path is used',
);

// A Playwright-managed browsers directory holds versioned entries (chromium-1217/)
// and no bare `chromium`, so it must fall through to the managed browser.
assert(
  resolveChromiumExecutable({ PLAYWRIGHT_BROWSERS_PATH: '/home/dev/.cache/ms-playwright' }, nothingExists) ===
    undefined,
  'a managed browsers directory without a bare chromium entry falls through',
);

console.log('browserResolver checks passed');
