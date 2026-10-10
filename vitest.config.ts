import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // The no-seed guard test spawns a child process; give it room.
    testTimeout: 30000,
    globals: false,
  },
});
