import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Kept separate from vite.config.ts on purpose: the React Router Vite plugin is
// only valid inside an RR build, so tests run with just path resolution.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "test/**/*.test.ts"],
  },
});
