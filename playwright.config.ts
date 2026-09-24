import { defineConfig } from "@playwright/test";
import { loadValidatedCredentials } from "./scripts/drizzle-credentials.mjs";

/**
 * Playwright starts the E2E app on :3101. When local auth E2E runs (non-CI),
 * override BETTER_AUTH_URL to the E2E origin so verification/reset links and
 * trustedOrigins align with the browser. We also override DATABASE_URL to target
 * the TEST database (nomi_numi_shop_test) to protect DEV data from test pollution.
 */
const isCi = Boolean(process.env.CI);
const e2eAuthOrigin = "http://127.0.0.1:3101";

let localTestDbUrl = "";
if (!isCi) {
  const creds = loadValidatedCredentials("test");
  localTestDbUrl = `postgresql://${creds.user}:${creds.password}@${creds.host}:${creds.port}/${creds.database}`;
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: isCi ? undefined : "./tests/e2e/global-setup.ts",
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
      NOMI_ALLOW_TEST_DB: "1",
      // Keep portable CI smoke green without requiring auth secrets.
      // CI gets non-secret dummy stubs; local E2E overrides BETTER_AUTH_URL and DATABASE_URL.
      ...(isCi
        ? {
            BETTER_AUTH_SECRET: "ci-stub-secret-not-for-production-0123456789abcdef",
            BETTER_AUTH_URL: e2eAuthOrigin,
            MOCK_PAYMENT_WEBHOOK_SECRET: "ci-mock-payment-secret-0123456789abcdef",
            MOCK_PAYMENT_OUTCOME: "success",
          }
        : {
            BETTER_AUTH_URL: e2eAuthOrigin,
            DATABASE_URL: localTestDbUrl,
            MOCK_PAYMENT_WEBHOOK_SECRET:
              process.env.MOCK_PAYMENT_WEBHOOK_SECRET ??
              "local-e2e-mock-payment-secret-0123456789abcdef",
            MOCK_PAYMENT_OUTCOME: "success",
          }),
    },
  },
});
