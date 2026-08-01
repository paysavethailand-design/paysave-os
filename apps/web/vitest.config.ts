import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: "automatic",
  } as never,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    coverage: {
      enabled: false,
      exclude: ["**/*.d.ts", "**/*.integration.test.ts", "**/*.test.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 65,
        statements: 60,
      },
    },
    environment: "node",
  },
});
