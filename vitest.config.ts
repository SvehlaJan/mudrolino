import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'e2e/support/**/*.test.ts', 'public/audio/_review/**/*.test.ts'], clearMocks: true },
});
