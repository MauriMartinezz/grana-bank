import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/env";

/**
 * End-to-end tests (`pnpm test:e2e`), local only for now. They run against a
 * production build on its own port and its own database (`vuelto_e2e`), so
 * neither the dev server on :3000 nor the dev database are touched.
 */
export default defineConfig({
  testDir: "e2e",
  // Every spec signs in as seeded users of one shared database: one worker
  // keeps them from racing on the same rows.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Prepare the database first (the build reads it), then a production
    // build: closer to a deploy than `next dev`, with Cache Components and
    // prerendering as they really run, and no clash with a `next dev` already
    // running in this checkout.
    command: `tsx e2e/setup-db.ts && next build && next start --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    // Always a fresh server, so each run re-seeds the database and never
    // tests an unrelated server that happens to use the port.
    reuseExistingServer: false,
    timeout: 300_000,
    // The build log is long; errors still show through stderr.
    stdout: "ignore",
    stderr: "pipe",
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
});
