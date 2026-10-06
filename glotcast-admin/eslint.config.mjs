import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated: shadcn CLI output and orval's schemas.
    "src/components/ui/**",
    "src/hooks/**",
    "src/schemas/api.gen.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Covers, banners and generated images come from R2 / any URL an admin pastes: plain <img>.
      "@next/next/no-img-element": "off",
    },
  },
])
