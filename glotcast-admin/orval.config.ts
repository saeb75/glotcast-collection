import { defineConfig } from "orval"

// Zod schemas for the admin API (tag `admin` of ../glotcast-api/openapi.json, written by `npm run openapi` in
// the API). Never edit src/schemas/api.gen.ts by hand: feature schema files in src/schemas/ pick from it, and
// types come from z.infer.
export default defineConfig({
  admin: {
    input: { target: "../glotcast-api/openapi.json", filters: { tags: ["admin"] } },
    output: {
      client: "zod",
      mode: "single",
      target: "src/schemas/api.gen.ts",
      override: {
        zod: {
          generate: { param: false, query: false, header: false, body: true, response: true },
          generateEachHttpStatus: true,
        },
      },
    },
  },
})
