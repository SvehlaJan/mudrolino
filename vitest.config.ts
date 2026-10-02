import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'e2e/support/**/*.test.ts', 'public/audio/_review/**/*.test.ts'], clearMocks: true },
});
