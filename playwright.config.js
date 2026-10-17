import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/real-*.spec.js', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', headless: true },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4175', env: { PORT: '4175', AI_PROVIDER: 'rules', SPEECH_PROVIDER:'disabled', DATABASE_PATH: ':memory:' }, reuseExistingServer: false },
  reporter: 'list'
});
