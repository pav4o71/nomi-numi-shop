import { defineConfig } from "@playwright/test";

/**
 * Playwright starts the E2E app on :3101. When local auth E2E runs (non-CI),
 * override BETTER_AUTH_URL to the E2E origin so verification/reset links and
 * trustedOrigins align with the browser. .env.local still supplies secret,
 * DATABASE_URL (DEV), and Mailpit transport keys.
 */
const isCi = Boolean(process.env.CI);
const e2eAuthOrigin = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: isCi ? 30_000 : 90_000,
  expect: {
    timeout: isCi ? 5_000 : 15_000,
  },
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  use: {
    baseURL: e2eAuthOrigin,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: "pnpm dev:e2e",
    url: e2eAuthOrigin,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      // Keep portable CI smoke green without requiring auth secrets.
      // CI gets non-secret dummy stubs; local E2E overrides BETTER_AUTH_URL only.
      ...(isCi
        ? {
            BETTER_AUTH_SECRET: "ci-stub-secret-not-for-production-0123456789abcdef",
            BETTER_AUTH_URL: e2eAuthOrigin,
          }
        : {
            BETTER_AUTH_URL: e2eAuthOrigin,
          }),
    },
  },
});
