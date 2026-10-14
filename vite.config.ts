import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaHtmlHeadTags, pwaHtmlTitle, pwaPluginOptions } from './src/pwa/pwaConfig';
import { catalogPreviewPlugin } from './tools/avatar/catalogPreviewServer';
import { buildIdentity } from './tools/verification/identity.mjs';

function identityPlugin(mode: string): Plugin {
  return {
    name: 'teo-build-identity',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-identity.json', source: JSON.stringify(buildIdentity(mode)) });
    },
  };
}

function pwaHtmlMetadataPlugin(): Plugin {
  return {
    name: 'teo-pwa-html-metadata',
    transformIndexHtml(html) {
      return {
        html: html.replace(/<title>.*<\/title>/, `<title>${pwaHtmlTitle}</title>`),
        tags: pwaHtmlHeadTags,
      };
    },
  };
}

// Short commit shown to parents and attached to feedback and error reports.
// Vercel provides the commit; local builds read it from git.
function appVersion(env: Record<string, string>): string {
  let commit = env.VERCEL_GIT_COMMIT_SHA ?? '';
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    } catch {
      commit = '';
    }
  }
  return commit ? commit.slice(0, 7) : 'dev';
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const version = appVersion(env);
  // Source maps are built and uploaded only when a Sentry token is configured
  // (the Vercel production build), then deleted so they are never served.
  const uploadSourceMaps = mode === 'production' && Boolean(env.SENTRY_AUTH_TOKEN);
  return {
    plugins: [
      catalogPreviewPlugin(),
      react(),
      tailwindcss(),
      pwaHtmlMetadataPlugin(),
      VitePWA(pwaPluginOptions),
      identityPlugin(mode),
      ...(uploadSourceMaps
        ? [sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
          // EU organizations upload to https://de.sentry.io/; unset means the US server.
          url: env.SENTRY_URL || undefined,
          release: { name: version },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
          // A failed upload (say, a mistyped token) must not block a deploy; errors still
          // reach Sentry, only without readable stack traces.
          errorHandler: error => console.warn(`[sentry] Source map upload failed: ${error.message}`),
        })]
        : []),
    ],
    build: { outDir: mode === 'test' ? 'dist-e2e' : 'dist', sourcemap: uploadSourceMaps ? 'hidden' : false },
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: { ignored: ['**/dist/**', '**/dist-e2e/**', '**/artifacts/**'] },
    },
  };
});
