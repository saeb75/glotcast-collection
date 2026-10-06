import path from "node:path"
import { defineConfig } from "vitest/config"

// Pure logic only (src/domain): no DOM, no React.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: { include: ["src/**/*.test.ts"] },
})
