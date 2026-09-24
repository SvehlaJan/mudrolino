import { parseArgs, printHelp, RELEASE_SCENE_NAMES, SCENES } from './capture.mjs';
import { CANONICAL_VIEWPORTS } from '../../e2e/support/viewports.ts';

if (!('ui-kit' in SCENES)) {
  throw new Error('capture.mjs must permanently register a "ui-kit" scene for the /ui-kit sweep');
}
if (!('home' in SCENES)) {
  throw new Error('capture.mjs must permanently register a "home" scene');
}

const REQUIRED_LOBBIES = [
  'alphabet',
  'syllables',
  'numbers',
  'counting',
  'compare',
  'addition',
  'words',
  'first-letter',
  'assembly',
  'complete-syllable',
  'complete-letter',
];
for (const slug of REQUIRED_LOBBIES) {
  if (!(`lobby-${slug}` in SCENES)) {
    throw new Error(`capture.mjs must permanently register "lobby-${slug}" scene`);
  }
  if (!(slug in SCENES)) {
    throw new Error(`capture.mjs must permanently register "${slug}" alias scene`);
  }
}

const defaults = parseArgs([]);
if (defaults.base !== 'http://127.0.0.1:4173') throw new Error(`Unexpected default base: ${defaults.base}`);
if (defaults.scenes.length !== 0) throw new Error('Default parse must not select any scene');
if (defaults.help !== false) throw new Error('Default parse must not request help');

const helpFlag = parseArgs(['--help']);
if (helpFlag.help !== true) throw new Error('--help must be recognized as a flag, not an unknown argument');
parseArgs(['-h']); // must not throw

const scoped = parseArgs(['--scene=ui-kit', '--viewport=desktop', '--base=http://example.com/']);
if (scoped.base !== 'http://example.com') throw new Error('Trailing slash must be stripped from --base');
if (!scoped.scenes.includes('ui-kit')) throw new Error('--scene=ui-kit must be parsed');
if (!scoped.viewports.includes('desktop')) throw new Error('--viewport=desktop must be parsed');

const releaseMatrix = parseArgs(['--matrix=release']);
if (releaseMatrix.matrix !== 'release') throw new Error('--matrix=release must select the release capture matrix');
if (releaseMatrix.scenes.length !== 0 || releaseMatrix.viewports.length !== 0) {
  throw new Error('--matrix=release must leave matrix expansion to the runner');
}

let invalidMatrixThrew = false;
try {
  parseArgs(['--matrix=preview']);
} catch {
  invalidMatrixThrew = true;
}
if (!invalidMatrixThrew) throw new Error('Unknown screenshot matrices must still throw');

const REQUIRED_RELEASE_SCENES = [
  'home',
  'parents-gate',
  'parents-gate-error',
  ...REQUIRED_LOBBIES.map(slug => `lobby-${slug}`),
  ...REQUIRED_LOBBIES.map(slug => `${slug}-round`),
  'game-shell-success',
  'game-shell-failure',
  'game-shell-retry',
  'game-shell-completion',
  'game-shell-paused',
  'dashboard',
  'game-settings',
  'app-settings',
  'content',
  'recordings',
  'parent-feedback',
  'game-settings-alphabet',
  'game-settings-counting',
  'parent-help',
  'content-letters',
  'content-numbers',
  'content-phrases',
  'content-words',
  'content-praise',
  'content-word-editor',
  'content-praise-editor',
  'content-disabled-list',
  'content-recording-draft',
  'content-recording-ready',
  'recording-permission',
  'recording-active',
  'feedback-error',
  'feedback-success',
  'keyboard-focus',
  'ui-kit',
];
for (const scene of REQUIRED_RELEASE_SCENES) {
  if (!(scene in SCENES)) throw new Error(`capture.mjs must permanently register release scene "${scene}"`);
}
if (RELEASE_SCENE_NAMES.length !== REQUIRED_RELEASE_SCENES.length) {
  throw new Error('Release scene matrix must contain the complete named shipping scene inventory');
}
for (const scene of REQUIRED_RELEASE_SCENES) {
  if (!RELEASE_SCENE_NAMES.includes(scene)) throw new Error(`Release matrix must include "${scene}"`);
}

for (const viewport of Object.keys(CANONICAL_VIEWPORTS)) {
  if (!(viewport in CANONICAL_VIEWPORTS)) throw new Error(`Canonical viewport "${viewport}" missing`);
}

let threw = false;
try {
  parseArgs(['--not-a-real-flag']);
} catch {
  threw = true;
}
if (!threw) throw new Error('Unknown arguments must still throw');

const logs: string[] = [];
const originalLog = console.log;
console.log = (msg: string) => logs.push(msg);
try {
  printHelp();
} finally {
  console.log = originalLog;
}
if (!logs.some(line => line.includes('ui-kit'))) {
  throw new Error('printHelp() must list the "ui-kit" scene');
}

console.log('✓ capture.mjs scene/help/config contracts passed');
