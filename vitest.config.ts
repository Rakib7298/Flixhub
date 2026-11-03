import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@mediamatrix/database": path.resolve(__dirname, "packages/database/src/index.ts"),
      "@": path.resolve(__dirname, "apps/web"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts", "services/**/*.test.ts", "apps/web/lib/**/*.test.ts"],
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/**/src/**", "services/**/src/**", "apps/web/lib/**"],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
