@AGENTS.md

# CLAUDE.md — glotcast-admin

The GlotCast admin panel: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (radix-nova),
zustand, zod, axios, `@supabase/ssr`. Read `README.md` for the pages and the run / deploy steps. Conventions mirror
`../../pokemon/admin` (same developer), translated to Next.js. Package manager: **npm**.

## Hard rules

- **The API contract is binding**: `../glotcast-api/docs/contract-v1.md` (admin appendix) and
  `../glotcast-api/openapi.json`. Never edit `src/schemas/api.gen.ts`: regenerate with `npm run gen:schemas` after
  `npm run openapi` in the API, then adjust `src/schemas/admin.ts` (the picks and types every screen uses).
- **Do not modify** `../glotcast-api` (another project; report contract gaps instead) or the other sibling projects,
  and never read their real `.env` files.
- Layering: route → screen → controller → `src/api/*` → zod parse → store. Screens never call axios; controllers
  never render; services never know a store; `src/domain/` stays pure (and tested).
- English copy lives in `src/copy/`, not in components. Destructive actions go through `ConfirmDialog`. Forms
  validate with the zod schemas in `src/schemas/forms.ts` and show inline errors.
- `src/components/ui/` and `src/hooks/` are shadcn output: add with the CLI, don't hand-edit.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` must pass before a commit.

## Commands

`npm run dev` (port 3001, `/v1` forwarded to `API_PROXY_URL` or http://localhost:3000), `npm run build`,
`npm start`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run gen:schemas`.

## Gotchas

- **Next 16**: the request gate is `src/proxy.ts` (`export function proxy`), the renamed `middleware.ts`. It only
  refreshes the Supabase session (`getClaims()`) and redirects to `/login`; admin access is the API's call
  (`GET /v1/admin/me` in `AuthController.checkAccess`). Its matcher skips `/v1` (the dev rewrite: large bodies).
- `NEXT_PUBLIC_*` are inlined at build time (Docker build args), in the proxy too.
- Every panel page is a client component behind the gate; the server only renders the splash. Read URL filters with
  `useUrlQuery` (pages are wrapped in `<Suspense>` by the panel layout for `useSearchParams`).
- Level drafts (`useLevelEditorStore`, keyed `${episodeId}:${level}`) outlive the tab: unsaved edits and a running
  transcription survive tab switches. `LevelEditorController.sync` resets only clean drafts when the episode reloads.
  The Details tab is force-mounted for the same reason.
- `GET /admin/home-config` holds ids only: the slider's episodes are found by paging `GET /admin/episodes`.
- R2 uploads are a plain axios PUT without the bearer (`UploadService`); the bucket's CORS must allow the origin.
- `next dev` maintains `AGENTS.md` (Next's agent rules block) — commit it as is.
