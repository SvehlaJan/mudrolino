import { defineConfig } from 'vitest/config';
import { resolveAuthoringRoot } from './tools/avatar/localArchive.mjs';

// These contracts deliberately require this MacBook's retained construction evidence.
for (const root of ['assets/avatar/catalog-a', 'assets/avatar/catalog', 'assets/avatar/concepts']) {
  resolveAuthoringRoot(process.cwd(), root, { required: true });
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'node',
    include: ['tools/avatar/verify_local_archive.ts', 'tools/avatar/*.archive.ts', 'src/avatar/*.archive.ts'],
    clearMocks: true,
    // Full private catalog scans read thousands of source-bound files; this is
    // deliberately a separate I/O gate, not the default five-second unit budget.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
