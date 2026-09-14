import { defineConfig, devices } from '@playwright/test';

const processEnvironment =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};
const webServerEnvironment = Object.fromEntries(
  Object.entries(processEnvironment).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  ),
);
const localChromeExecutable = processEnvironment.PLAYWRIGHT_CHROME_EXECUTABLE?.trim();
const allBrowsers = processEnvironment.PLAYWRIGHT_ALL_BROWSERS === 'true';

const chromiumProject = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    ...(localChromeExecutable
      ? { launchOptions: { executablePath: localChromeExecutable } }
      : {}),
  },
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4181',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: allBrowsers
    ? [
        chromiumProject,
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : [chromiumProject],
  webServer: {
    // Compile lazy routes before Playwright starts the first test's timeout.
    // Keep the test build separate from dist's production artifacts and env mode.
    command:
      'node ./node_modules/vite/bin/vite.js build --mode e2e --outDir dist/e2e && node ./node_modules/vite/bin/vite.js preview --mode e2e --outDir dist/e2e --host 127.0.0.1 --port 4181 --strictPort',
    env: { ...webServerEnvironment, VITE_E2E_DIRECT_API: 'true' },
    url: 'http://127.0.0.1:4181',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
