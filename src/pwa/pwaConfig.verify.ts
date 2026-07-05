import { pwaManifest, pwaPluginOptions } from './pwaConfig';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(pwaManifest.name === 'Teo Learn', 'manifest name is temporary Teo identity');
assert(pwaManifest.short_name === 'Teo', 'manifest short_name is Teo');
assert(pwaManifest.lang === 'sk', 'manifest lang is sk');
assert(pwaManifest.start_url === '/', 'manifest starts at home');
assert(pwaManifest.scope === '/', 'manifest scope is root');
assert(pwaManifest.display === 'standalone', 'manifest uses standalone display');
assert(pwaManifest.orientation === 'portrait-primary', 'manifest uses portrait-primary orientation');
assert(Boolean(pwaManifest.theme_color?.startsWith('#')), 'theme_color is a solid hex color');
assert(Boolean(pwaManifest.background_color?.startsWith('#')), 'background_color is a solid hex color');

const iconSources = new Set(pwaManifest.icons.map((icon) => icon.src));
assert(iconSources.has('/pwa/pwa-192x192.png'), 'manifest includes 192 icon');
assert(iconSources.has('/pwa/pwa-512x512.png'), 'manifest includes 512 icon');
assert(iconSources.has('/pwa/pwa-maskable-512x512.png'), 'manifest includes maskable icon');
assert(
  pwaManifest.icons.some((icon) => icon.src === '/pwa/pwa-maskable-512x512.png' && icon.purpose === 'maskable'),
  'maskable icon uses maskable purpose',
);

assert(pwaPluginOptions.registerType === 'prompt', 'service worker updates are prompt-based');
assert(pwaPluginOptions.injectRegister === null, 'manual React registration avoids duplicate registration');
assert(pwaPluginOptions.manifest === pwaManifest, 'plugin uses centralized manifest');

const globPatterns = pwaPluginOptions.workbox?.globPatterns ?? [];
assert(globPatterns.includes('**/*.{js,css,html,webmanifest}'), 'workbox precaches shell assets');
assert(globPatterns.includes('audio/**/*.{mp3,ogg,wav}'), 'workbox precaches built-in audio');
assert(globPatterns.includes('fonts/**/*.woff2'), 'workbox precaches local fonts');

const globIgnores = pwaPluginOptions.workbox?.globIgnores ?? [];
assert(globIgnores.includes('avatar/**/*.glb'), 'workbox skips large avatar glbs in first pass');

console.log('pwaConfig checks passed');
