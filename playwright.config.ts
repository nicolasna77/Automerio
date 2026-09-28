import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "fin",
      testMatch: /\.last\.ts$/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: BASE_URL,
    env: {
      BETTER_AUTH_URL: BASE_URL,
      DEMO_CALL_DRY_RUN: "true",
      DEMO_CALLS_PER_IP_PER_DAY: "1000",
      DEMO_CALLS_PER_DAY: "100000",
      CRON_SECRET: "secret-de-test-du-cron",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
