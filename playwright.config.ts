import { defineConfig } from "@playwright/test";

// Default to the dev server's standard port (3000). Override with E2E_PORT
// for CI or alternate environments. Next 16 enforces a single `next dev`
// per project directory, so we can't spawn a second one — we reuse what
// the user already has running (start it with `npm run dev:local`).
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
});
