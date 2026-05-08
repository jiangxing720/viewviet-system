# ViewViet

Your trusted cross-border content hub for Chinese expats and travelers in Southeast Asia — combining Vietnamese language learning, travel guides, legal resources, and community events in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/viewviet run dev` — run the frontend (port 20108, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-spec/orval.config.ts` — Orval codegen config (zod: mode single, target generated/api.ts)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM table schemas (words, sentences, legal, travel, lawyers, activities)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/viewviet/src/pages/` — React page components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React hooks and Zod validators
- Orval zod config uses `mode: "single"` to avoid barrel file conflicts (NOT split mode)
- All API hooks imported from `@workspace/api-client-react`; all Zod schemas from `@workspace/api-zod`
- DB uses serial PKs (not UUID) for simplicity; text arrays for specialties/tags/languages
- Routes split by domain: words.ts, sentences.ts, legal.ts, travel.ts, lawyers.ts, activities.ts, dashboard.ts

## Product

- `/` — Homepage with hero, featured guides, legal articles, lawyers, upcoming activities
- `/learn` — Language hub (Vietnamese, English, Chinese, Korean)
- `/learn/:lang/words` — Vocabulary with category sidebar, TTS, difficulty stars
- `/learn/:lang/scenes` — Scene sentences with scene name tabs
- `/learn/:lang/complex` — Complex sentences with grammar notes
- `/guides` — Travel guides with featured banner carousel + category filters
- `/guides/:id` — Guide detail with full content
- `/legal` — Legal blog with category sidebar + country filter
- `/legal/:slug` — Article detail with related articles sidebar + "Find a Lawyer" CTA
- `/lawyers` — Lawyer directory with search/country/city filters
- `/community` — Activity listings with category filter + upcoming toggle
- `/community/:id` — Activity detail with organizer info + join button
- `/admin` — Admin dashboard with stats row + bar chart + recent content
- `/admin/words` — Word management table with create/delete
- `/admin/legal` — Legal article CRUD with publish/featured toggles
- `/admin/guides` — Travel guide CRUD
- `/admin/lawyers` — Lawyer management
- `/admin/activities` — Activity moderation (approve/reject pending)

## User preferences

- Brand: teal primary `#0D7377`, gold accent `#F2A900`
- No emojis in UI (language flags as characters are OK)
- Chinese content is the primary language for data (users are Chinese expats)
- TTS via Web Speech API (window.speechSynthesis)

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use individual artifact workflows
- Orval zod output MUST use `mode: "single"` — split mode overwrites `lib/api-zod/src/index.ts`
- After schema changes: run `pnpm --filter @workspace/db run push` then restart API server
- After OpenAPI changes: run `pnpm --filter @workspace/api-spec run codegen` then restart frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
