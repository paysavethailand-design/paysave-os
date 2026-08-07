import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const externalBaseURL = process.env.PAYSAVE_E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "artifacts/playwright-output",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "artifacts/playwright-report" }],
    ["junit", { outputFile: "artifacts/test-results/playwright.junit.xml" }],
  ],
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:3107",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command:
          "node -e \"require('node:fs').rmSync('apps/web/.next',{recursive:true,force:true})\" && npm run build && node -e \"const fs=require('node:fs');fs.cpSync('apps/web/.next/static','apps/web/.next/standalone/apps/web/.next/static',{recursive:true});fs.cpSync('apps/web/public','apps/web/.next/standalone/apps/web/public',{recursive:true})\" && node apps/web/.next/standalone/apps/web/server.js",
        env: {
          HOSTNAME: "127.0.0.1",
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3107",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ci_placeholder",
          NEXT_PUBLIC_SUPABASE_URL: "https://ci-placeholder.invalid",
          PAYSAVE_ENABLE_DESIGN_PREVIEW: "true",
          PORT: "3107",
        },
        reuseExistingServer: false,
        timeout: 180_000,
        url: "http://127.0.0.1:3107/",
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
