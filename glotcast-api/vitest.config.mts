import swc from "unplugin-swc"
import { defineConfig } from "vitest/config"

// SWC (not esbuild) so Nest's decorator metadata is emitted in tests.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.spec.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["test/**/*.e2e-spec.ts"],
          environment: "node",
          setupFiles: ["test/setup-env.ts"],
          globalSetup: ["test/global-setup.ts"],
          fileParallelism: false,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
