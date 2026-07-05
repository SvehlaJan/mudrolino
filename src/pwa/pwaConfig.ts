import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa';

type PwaManifest = Partial<ManifestOptions> & {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: ManifestOptions['display'];
  orientation: string;
  theme_color: string;
  background_color: string;
  icons: NonNullable<ManifestOptions['icons']>;
};

export const pwaBrand = {
  appName: 'Teo Learn',
  shortName: 'Teo',
  description: 'Slovenská predškolská aplikácia s hrami a rodičmi nahratým obsahom.',
  themeColor: '#F53D4C',
  backgroundColor: '#F4F1EA',
} as const;

export const pwaIcons = {
  standard192: '/pwa/pwa-192x192.png',
  standard512: '/pwa/pwa-512x512.png',
  maskable512: '/pwa/pwa-maskable-512x512.png',
  appleTouch: '/pwa/apple-touch-icon.png',
} as const;

export const pwaManifest: PwaManifest = {
  id: '/',
  name: pwaBrand.appName,
  short_name: pwaBrand.shortName,
  description: pwaBrand.description,
  lang: 'sk',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: pwaBrand.themeColor,
  background_color: pwaBrand.backgroundColor,
  categories: ['education', 'kids', 'games'],
  icons: [
    {
      src: pwaIcons.standard192,
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: pwaIcons.standard512,
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: pwaIcons.maskable512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export const pwaPluginOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  injectRegister: null,
  includeAssets: [
    'pwa/apple-touch-icon.png',
    'pwa/pwa-192x192.png',
    'pwa/pwa-512x512.png',
    'pwa/pwa-maskable-512x512.png',
  ],
  manifest: pwaManifest,
  workbox: {
    globPatterns: [
      '**/*.{js,css,html,webmanifest}',
      'audio/**/*.{mp3,ogg,wav}',
      'fonts/**/*.woff2',
      'pwa/**/*.{png,svg}',
    ],
    globIgnores: [
      'avatar/**/*.glb',
      '**/*.map',
      'sw.js',
      'workbox-*.js',
    ],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    navigateFallback: '/',
  },
  devOptions: {
    enabled: false,
  },
};
