import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Окружение node, а не jsdom: UI не тестируется, DOM не нужен, а jsdom 27
    // не запускается на Node 22.11 (require() ESM-модуля внутри зависимости).
    // localStorage/sessionStorage подставляет полифил из setupFiles.
    environment: 'node',
    setupFiles: ['./src/test/storage-polyfill.ts'],
    include: ['src/**/*.test.ts'],
  },
});
