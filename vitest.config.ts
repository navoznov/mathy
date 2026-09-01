import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // TODO: Currently using 'node' due to jsdom ES module compatibility issue
    // with @csstools/css-calc and @asamuzakjp/css-color on Node 22.11.0.
    // Will need to be switched to 'jsdom' for storage tests (Task 6).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
