import { pwaBrand, pwaHtmlHeadTags, pwaHtmlTitle, pwaIcons, pwaManifest, pwaPluginOptions } from './pwaConfig';
import { GAME_DEFINITIONS } from '../shared/gameCatalog';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(pwaManifest.name === 'Mudrolíno', 'manifest name is Mudrolíno');
assert(pwaManifest.short_name === 'Mudrolíno', 'manifest short_name is Mudrolíno, short enough for a home-screen label');
assert(pwaManifest.lang === 'sk', 'manifest lang is sk');
assert(pwaManifest.start_url === '/', 'manifest starts at home');
assert(pwaManifest.scope === '/', 'manifest scope is root');
assert(pwaManifest.display === 'standalone', 'manifest uses standalone display');
assert(pwaManifest.orientation === 'portrait-primary', 'manifest uses portrait-primary orientation');
assert(Boolean(pwaManifest.theme_color?.startsWith('#')), 'theme_color is a solid hex color');
assert(Boolean(pwaManifest.background_color?.startsWith('#')), 'background_color is a solid hex color');

assert(pwaHtmlTitle === pwaBrand.appName, 'html title uses centralized app name');
assert(
  pwaHtmlHeadTags.some((tag) => tag.tag === 'meta' && tag.attrs?.name === 'theme-color' && tag.attrs.content === pwaBrand.themeColor),
  'html head tags include theme-color',
);
assert(
  pwaHtmlHeadTags.some((tag) => tag.tag === 'meta' && tag.attrs?.name === 'apple-mobile-web-app-title' && tag.attrs.content === pwaBrand.shortName),
  'html head tags include Apple web app title',
);
assert(
  pwaHtmlHeadTags.some((tag) => tag.tag === 'meta' && tag.attrs?.name === 'mobile-web-app-capable' && tag.attrs.content === 'yes'),
  'html head tags include mobile web app capable',
);
assert(
  pwaHtmlHeadTags.some((tag) => tag.tag === 'meta' && tag.attrs?.name === 'apple-mobile-web-app-capable' && tag.attrs.content === 'yes'),
  'html head tags include Apple standalone capable',
);
assert(
  pwaHtmlHeadTags.some((tag) => tag.tag === 'link' && tag.attrs?.rel === 'apple-touch-icon' && tag.attrs.href === pwaIcons.appleTouch),
  'html head tags include Apple touch icon',
);
assert(
  pwaHtmlHeadTags.some(
    (tag) => tag.tag === 'link' && tag.attrs?.rel === 'icon' && tag.attrs.href === pwaIcons.faviconSvg,
  ),
  'html head tags include an SVG favicon so browsers stop requesting a missing /favicon.ico',
);
assert(
  pwaHtmlHeadTags.some(
    (tag) => tag.tag === 'link' && tag.attrs?.rel === 'icon' && tag.attrs.href === pwaIcons.standard192,
  ),
  'html head tags include a PNG favicon fallback',
);

const metaContent = (key: 'name' | 'property', value: string) =>
  pwaHtmlHeadTags.find((tag) => tag.tag === 'meta' && tag.attrs?.[key] === value)?.attrs?.content;
assert(pwaBrand.siteUrl.startsWith('https://') && !pwaBrand.siteUrl.endsWith('/'), 'site URL is absolute https without a trailing slash');
assert(metaContent('property', 'og:title') === pwaBrand.appName, 'link previews show the app name');
assert(metaContent('property', 'og:description') === pwaBrand.description, 'link previews show the app description');
assert(metaContent('name', 'description') === pwaBrand.description, 'html head has a description');
assert(
  metaContent('property', 'og:image') === `${pwaBrand.siteUrl}${pwaIcons.openGraph}`,
  'link preview image is an absolute URL, since preview crawlers do not resolve relative paths',
);
assert(metaContent('property', 'og:url') === `${pwaBrand.siteUrl}/`, 'link previews point at the app root');

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
assert(globPatterns.some((pattern) => pattern.includes('js')), 'workbox precaches lazy game chunks');
assert(globPatterns.includes('audio/**/*.{mp3,ogg,wav}'), 'workbox precaches built-in audio');
assert(globPatterns.includes('fonts/**/*.woff2'), 'workbox precaches local fonts');
assert(globPatterns.includes('pwa/**/*.svg'), 'workbox precaches the SVG icon');
assert(GAME_DEFINITIONS.length === 11, 'offline route inventory covers all eleven games');
assert(new Set(GAME_DEFINITIONS.map((game) => game.path)).size === GAME_DEFINITIONS.length, 'offline game routes are unique');

const globIgnores = pwaPluginOptions.workbox?.globIgnores ?? [];
assert(globIgnores.includes('avatar/**/*.glb'), 'workbox skips large avatar glbs in first pass');
assert(globIgnores.includes('**/*.map'), 'workbox skips source maps');
assert(
  globIgnores.includes('assets/AvatarScene-*.js'),
  'workbox skips the lazy avatar renderer chunk, which cannot render without the skipped glbs',
);
assert(pwaPluginOptions.workbox?.navigateFallback === '/index.html', 'offline navigation falls back to the precached app shell');
for (const icon of [pwaIcons.appleTouch, pwaIcons.standard192, pwaIcons.standard512, pwaIcons.maskable512]) {
  assert(Boolean(pwaPluginOptions.includeAssets?.includes(icon.slice(1))), `workbox includes ${icon}`);
}

console.log('pwaConfig checks passed');
