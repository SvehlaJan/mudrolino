import { readFileSync, readdirSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entry = html.match(/<script[^>]+src="\/assets\/([^"/]+\.js)"/);
if (!entry) throw new Error('Unable to find the production entry script');

const assets = new URL('assets/', dist);
const main = readFileSync(new URL(entry[1], assets), 'utf8');
// The entry legitimately names the lazy AvatarScene chunk in a dynamic import.
// Check for renderer code itself, then require that renderer's own chunk below.
for (const forbidden of ['__E2E__', 'three.module', '@react-three/fiber']) {
  if (main.includes(forbidden)) throw new Error(`Production entry contains ${forbidden}`);
}

const chunks = readdirSync(assets).filter((file) => file.endsWith('.js'));
const avatar = chunks.filter((file) => /^AvatarScene-.*\.js$/.test(file));
if (avatar.length !== 1) throw new Error(`Expected one lazy AvatarScene chunk; found ${avatar.length}`);
if (avatar[0] === entry[1]) throw new Error('AvatarScene entered the production entry chunk');

console.log('✓ production bundle boundaries passed');
