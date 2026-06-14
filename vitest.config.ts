import { defineConfig } from "vitest/config";

// Unit + backend tests (*.test.ts). Convex function tests opt into the
// edge-runtime environment per file with `// @vitest-environment edge-runtime`.
// Playwright E2E lives in e2e/ and is excluded here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", ".expo/**", "e2e/**", "convex/_generated/**"],
    server: { deps: { inline: ["convex-test"] } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["convex/**", "lib/**", "hooks/**", "components/**", "app/**", "theme/**"],
      exclude: ["convex/_generated/**", "**/*.test.ts", "e2e/**"],
    },
  },
});
