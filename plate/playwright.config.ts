import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '.env.local' });

const PORT = Number(process.env.E2E_PORT ?? 3100);
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, ...devices['iPhone 13'], browserName: 'chromium', timezoneId: 'UTC', trace: 'off' },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { FOOD_SOURCES_MOCK: '1' },
  },
});
