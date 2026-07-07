import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Kept separate from vite.config.ts on purpose: the React Router Vite plugin is
// only valid inside an RR build, so tests run with just path resolution.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "test/**/*.test.ts"],
    // Each DB test spins up a fresh PGLite and replays every migration. With the
    // full suite cold-starting PGLite across many files in parallel, that first
    // per-file setup can exceed Vitest's default 5s, so give it real headroom.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
