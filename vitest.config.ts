import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Scoped to the pure library modules on purpose. The policy engine is the only
 * thing under test here; component and browser tests are out of this suite.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
