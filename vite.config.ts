import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaHtmlHeadTags, pwaHtmlTitle, pwaPluginOptions } from './src/pwa/pwaConfig';
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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), pwaHtmlMetadataPlugin(), VitePWA(pwaPluginOptions), identityPlugin(mode)],
    build: { outDir: mode === 'test' ? 'dist-e2e' : 'dist' },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
    },
  };
});
