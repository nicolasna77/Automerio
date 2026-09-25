import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Les tests qui nettoient derriere eux ont besoin de la base. Next charge `.env`
// lui-meme, Playwright non : sans cela le processus de test n'a pas de
// `DATABASE_URL`. En CI le fichier n'existe pas, les variables venant de
// l'environnement.
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
    // Les tests qui revoquent la session partagee passent en dernier.
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
      // L'essai telephonique s'execute jusqu'au bout sans appeler personne.
      DEMO_CALL_DRY_RUN: "true",
      DEMO_CALLS_PER_IP_PER_DAY: "1000",
      DEMO_CALLS_PER_DAY: "100000",
      CRON_SECRET: "secret-de-test-du-cron",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
