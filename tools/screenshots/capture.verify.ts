import { parseArgs, printHelp, SCENES } from './capture.mjs';
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
