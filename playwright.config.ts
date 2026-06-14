import { defineConfig, devices } from "@playwright/test";

// Web E2E. The webServer boots the Expo web dev server with a placeholder
// Convex URL so the app renders without a live backend.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8081",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { EXPO_PUBLIC_CONVEX_URL: "https://placeholder.convex.cloud" },
  },
});
