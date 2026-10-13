import type { HtmlTagDescriptor } from 'vite';
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
  appName: 'Mudrolíno',
  shortName: 'Mudrolíno',
  description: 'Slovenská predškolská aplikácia s hrami a rodičmi nahratým obsahom.',
  themeColor: '#F53D4C',
  backgroundColor: '#F4F1EA',
  // Link previews need absolute URLs; this is the friends-and-family address.
  siteUrl: 'https://mudrolino.vercel.app',
} as const;

export const pwaIcons = {
  standard192: '/pwa/pwa-192x192.png',
  standard512: '/pwa/pwa-512x512.png',
  maskable512: '/pwa/pwa-maskable-512x512.png',
  appleTouch: '/pwa/apple-touch-icon.png',
  faviconSvg: '/pwa/teo-icon-source.svg',
  openGraph: '/pwa/og-image.png',
} as const;

function meta(attrs: Record<string, string>): HtmlTagDescriptor {
  return { tag: 'meta', attrs, injectTo: 'head' };
}

// Shared links (WhatsApp, Messenger, iMessage) render these as a preview card.
const openGraphTags: HtmlTagDescriptor[] = [
  meta({ name: 'description', content: pwaBrand.description }),
  meta({ property: 'og:type', content: 'website' }),
  meta({ property: 'og:site_name', content: pwaBrand.appName }),
  meta({ property: 'og:title', content: pwaBrand.appName }),
  meta({ property: 'og:description', content: pwaBrand.description }),
  meta({ property: 'og:url', content: `${pwaBrand.siteUrl}/` }),
  meta({ property: 'og:image', content: `${pwaBrand.siteUrl}${pwaIcons.openGraph}` }),
  meta({ property: 'og:image:width', content: '1200' }),
  meta({ property: 'og:image:height', content: '630' }),
  meta({ property: 'og:locale', content: 'sk_SK' }),
  meta({ name: 'twitter:card', content: 'summary_large_image' }),
];

export const pwaHtmlTitle = pwaBrand.appName;

export const pwaHtmlHeadTags: HtmlTagDescriptor[] = [
  {
    tag: 'meta',
    attrs: {
      name: 'theme-color',
      content: pwaBrand.themeColor,
    },
    injectTo: 'head',
  },
  {
    tag: 'meta',
    attrs: {
      name: 'apple-mobile-web-app-title',
      content: pwaBrand.shortName,
    },
    injectTo: 'head',
  },
  {
    tag: 'meta',
    attrs: {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    injectTo: 'head',
  },
  {
    tag: 'meta',
    attrs: {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: {
      rel: 'icon',
      type: 'image/svg+xml',
      href: pwaIcons.faviconSvg,
    },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: {
      rel: 'icon',
      type: 'image/png',
      sizes: '192x192',
      href: pwaIcons.standard192,
    },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: {
      rel: 'apple-touch-icon',
      href: pwaIcons.appleTouch,
    },
    injectTo: 'head',
  },
  ...openGraphTags,
];

export const pwaControlCopy = {
  installLabel: `Pridať ${pwaBrand.shortName}`,
  installDescription: 'Uložiť aplikáciu na plochu a používať ju pohodlne.',
  iosInstallDescription: 'Zobraziť postup pridania na plochu.',
  offlineReady: `${pwaBrand.shortName} je pripravený aj offline.`,
  iosHelp: `Na iPhone otvorte Zdieľať a zvoľte Pridať na plochu.`,
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
      'pwa/**/*.svg',
    ],
    globIgnores: [
      'avatar/**/*.glb',
      // The lazily-loaded avatar renderer is useless offline without the GLBs above,
      // so precaching ~950 kB of three.js would only inflate the install.
      'assets/AvatarScene-*.js',
      '**/*.map',
      'sw.js',
      'workbox-*.js',
    ],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    // Workbox precaches `index.html`, not `/`. Point the navigation route at the
    // actual precache key so unseen game deep links also open while offline.
    navigateFallback: '/index.html',
  },
  devOptions: {
    enabled: false,
  },
};
