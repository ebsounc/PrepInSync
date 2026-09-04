import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` is a marker package whose default export is a bare `throw`
      // (node_modules/server-only/index.js). Next resolves it to an empty module via
      // the `react-server` export condition; Vitest doesn't, so importing any
      // server-only module (lib/rate-limits, lib/images/validate, lib/translation/cache)
      // would fail at import time. Alias it to a local empty stub instead of
      // `server-only/empty.js`, which isn't listed in that package's `exports` map.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Scoped to tests/ so Playwright's specs under tests/e2e (run by `npm run e2e`)
    // are never picked up here.
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
})
