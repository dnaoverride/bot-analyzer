import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 60000,
  use: {headless: true},
  webServer: {
    command: 'node scripts/server.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000
  }
});
