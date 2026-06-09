# Tasks: Little Logs — Baby Tracking App

**Input**: Design documents from `/specs/001-little-logs/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — spec.md does not call for TDD or test-first tasks.

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths follow the structure defined in `plan.md`

---

## Phase 1: Setup

**Purpose**: Initialize the Next.js 15 project and shared tooling.

- [x] T001 Initialize Next.js 15 project with all plan.md dependencies (`next@15`, `drizzle-orm`, `@libsql/client`, `next-auth@5`, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `ulidx`, `tsx`, `drizzle-kit`)
- [x] T002 [P] Configure TypeScript in `tsconfig.json` (strict mode, path aliases for `@/`)
- [x] T003 [P] Create `.env.local.example` with all required variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`)
- [x] T004 [P] Add `drizzle.config.ts` (Turso dialect, points to `src/db/schema.ts`) and npm scripts `db:generate`, `db:push`, `db:seed` to `package.json`

**Checkpoint**: Project initializes; `npm run dev` starts without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Define Drizzle schema in `src/db/schema.ts` — tables: `babies`, `sleep_logs`, `feed_logs`, `nappy_logs` with all columns, constraints, and indexes from `data-model.md`
- [x] T006 Create Drizzle client in `src/db/index.ts` — `@libsql/client` HTTP mode using `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`; enable `PRAGMA foreign_keys = ON` on connection open
- [x] T007 Generate initial Drizzle migration and apply to Turso dev database (`drizzle/migrations/`)
- [x] T008 [P] Create `ulidx` wrapper in `src/lib/ulid.ts` — export a `newId(): string` function that returns a ULID
- [x] T009 Configure NextAuth v5 in `src/lib/auth.ts` — Google OAuth provider, `signIn` callback that rejects any email ≠ `process.env.NEXTAUTH_EMAIL`, JWT session strategy (no DB adapter)
- [x] T010 Create NextAuth route handler at `src/app/api/auth/[...nextauth]/route.ts` — re-export `{ GET, POST }` from `src/lib/auth.ts`
- [x] T011 Create auth middleware at `src/middleware.ts` — protect all routes under `/(auth)` and `/api` (except `/api/auth`); redirect unauthenticated requests to `/login`
- [x] T012 Create design tokens in `src/app/globals.css` — CSS custom properties: color palette (primary, surface, text, error, warning), spacing scale (4px base: `--space-1` through `--space-8`), type scale (`--text-sm` through `--text-xl`), border-radius, shadow
- [x] T013 Create root layout at `src/app/layout.tsx` — HTML shell, import `globals.css`, viewport meta (`width=device-width, initial-scale=1`), PWA manifest link (`<link rel="manifest" href="/manifest.json">`)
- [x] T014 Create sign-in page at `src/app/login/page.tsx` — Google sign-in button (calls NextAuth `signIn("google")`), app name, brief message explaining access is restricted

**Checkpoint**: `npm run dev` serves `/login`. Completing Google OAuth redirects into the app (or to `/setup` on first sign-in).

---

## Phase 3: User Story 1 — Quick Event Logging (Priority: P1) 🎯 MVP

**Goal**: Parent can log sleep, feed, and nappy events in ≤3 taps on mobile. First-time sign-in triggers baby setup before any logging.

**Independent Test**: Sign in, complete baby setup (name + DOB), start a sleep session, end it, log one feed, log one nappy, view `/history`. All three events appear in the correct order. No manual DB step required.

### Baby Profile Setup

- [x] T015 [US1] Create baby setup API route at `src/app/api/babies/route.ts` — `POST`: validate `name` (required, non-empty string) and `date_of_birth` (required, YYYY-MM-DD); insert into `babies` via Drizzle using `newId()`; return `201 { id }`; return `409` if a baby record already exists
- [x] T016 [US1] Create baby setup screen at `src/app/setup/page.tsx` — form with name and date-of-birth inputs; `POST /api/babies` on submit; redirect to `/` on success; show inline validation errors on failure; mobile-first layout using design tokens

### Sleep Logging

- [x] T017 [US1] Create `POST /api/sleep` route at `src/app/api/sleep/route.ts` — validate `started_at` (required ISO 8601 UTC); query `sleep_logs` for an open session (`ended_at IS NULL`) for this baby; return `409 { error: "open_session_exists" }` if one exists; insert row with `ended_at = NULL`; return `201 { id, duration_min: null }`
- [x] T018 [US1] Create `PATCH /api/sleep/[id]` route at `src/app/api/sleep/[id]/route.ts` — accept `ended_at`, `location`, `quality`, `notes` (at least one required); if `ended_at` provided, validate it is after `started_at` (return `422` if not), compute `duration_min`; update the row; return `200 { id, duration_min }`. Scoped to closing open sessions only — closed sessions are immutable per spec clarification.
- [x] T019 [P] [US1] Create `LogSleepButton` component at `src/components/LogSleepButton.tsx` — idle state: single "Start sleep" button (`POST /api/sleep` with `started_at = now`); active state: elapsed timer display + optional location/quality inputs + "End sleep" button (`PATCH /api/sleep/:id`); ≤2 taps to start, ≤2 taps to end; 100ms tap feedback per constitution

### Feed Logging

- [x] T020 [US1] Create `POST /api/feed` route at `src/app/api/feed/route.ts` — validate `started_at` (required) and `type` (required, `"breast" | "bottle" | "solid"`); reject `side` when `type ≠ "breast"`, reject `amount_ml` when `type ≠ "bottle"`; insert `feed_logs`; return `201 { id }` or `422` with field-level error
- [x] T021 [P] [US1] Create `LogFeedSheet` component at `src/components/LogFeedSheet.tsx` — bottom sheet triggered from home; three feed type buttons (breast/bottle/solid) as primary selection; conditional side toggle (L/R/both) for breast; optional amount field for bottle; confirm button; ≤3 taps to log; calls `POST /api/feed`

### Nappy Logging

- [x] T022 [US1] Create `POST /api/nappy` route at `src/app/api/nappy/route.ts` — validate `logged_at` (required) and `type` (required, `"wet" | "dirty" | "both" | "dry"`); `concern_flag` defaults to `0`; insert `nappy_logs`; return `201 { id }` or `422`
- [x] T023 [P] [US1] Create `LogNappySheet` component at `src/components/LogNappySheet.tsx` — bottom sheet triggered from home; four type buttons (wet/dirty/both/dry) as primary selection; concern flag toggle; optional colour and consistency fields; confirm button; ≤3 taps to log; calls `POST /api/nappy`

### History

- [x] T024 [US1] Create `GET /api/history` route at `src/app/api/history/route.ts` — query params: `from` (default 7 days ago), `to` (default now), `type` (`sleep|feed|nappy|all`, default `all`), `limit` (1–100, default 50), `cursor` (last `id` for pagination); union-query all relevant log tables sorted by event time descending; return `{ items, next_cursor }`
- [x] T025 [P] [US1] Create `EventHistory` component at `src/components/EventHistory.tsx` — renders chronological list of all event types; `concern_flag = 1` nappy entries rendered with visually distinct colour/icon per FR-014; load-more pagination button; empty state for no results

### Screens & Navigation

- [x] T026 [US1] Create `(auth)` group layout at `src/app/(auth)/layout.tsx` — server component: call `auth()` from NextAuth, redirect to `/login` if no session; query `babies` table and redirect to `/setup` if empty (FR-004a); render page shell with bottom navigation (Home, History, Insights)
- [x] T027 [US1] Create home screen at `src/app/(auth)/page.tsx` — renders `LogSleepButton`, feed sheet trigger button, nappy sheet trigger button; queries for open sleep session on load and passes state to `LogSleepButton`; each primary action reachable in ≤3 taps (SC-001)
- [x] T028 [US1] Create history screen at `src/app/(auth)/history/page.tsx` — renders `EventHistory`, fetches `GET /api/history` with default params

**Checkpoint**: Full US1 loop verified on a mobile browser. All 6 acceptance scenarios from spec.md pass (first-time setup, sleep start/end, feed, nappy, auth gate, setup redirect). SC-001 and SC-006 verified.

---

## Phase 4: User Story 2 — In-App AI Insights (Priority: P2)

**Goal**: Insights panel shows AI-generated daily/weekly summary and detected patterns. Degrades gracefully on failure or empty data.

**Independent Test**: With ≥3 days of logged data, open `/insights`. Summary and at least one pattern appear within 10 seconds. With no data, friendly empty state is shown. With an invalid `ANTHROPIC_API_KEY`, error state renders and the rest of the app remains usable.

- [x] T029 [US2] Create Anthropic client and prompt builder in `src/lib/claude.ts` — initialise `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`; export `generateInsights(days: number): Promise<{ summary: string, patterns: string[] }>` that fetches aggregated log counts and durations from Turso, builds a structured prompt (counts, durations, timestamps — no free-text notes for privacy), calls `claude-sonnet-4-5` non-streaming, returns parsed result
- [x] T030 [US2] Create `POST /api/insights` route at `src/app/api/insights/route.ts` — accept `{ days?: number }` (default 7, clamp 1–30); return `204` if no log data for the period; call `generateInsights`; return `{ summary, patterns, generated_at }`; catch errors and return `503 { error: "ai_unavailable", message: "..." }`
- [x] T031 [P] [US2] Create `InsightsPanel` component at `src/components/InsightsPanel.tsx` — loading state: spinner shown after 300ms (SC-003); success state: summary paragraph + bulleted patterns list; empty state: friendly "Start logging to see insights" message; error state: graceful degradation message without blocking the rest of the app
- [x] T032 [US2] Create insights screen at `src/app/(auth)/insights/page.tsx` — renders `InsightsPanel`; calls `POST /api/insights` on mount; passes loading/success/error/empty state to panel

**Checkpoint**: `/insights` displays AI summary. Loading indicator appears during fetch. SC-003 (≤10s, rest of app usable) verified. Empty and error states render correctly.

---

## Phase 5: User Story 3 — Natural Language Access via MCP (Priority: P3)

**Goal**: Local MCP stdio server exposes 6 tools accessible from Claude Desktop. Shares the same Turso database as the web UI — no HTTP hop.

**Independent Test**: `npm run mcp:start`; configure Claude Desktop with the stdio server; log one bottle feed via chat; ask for today's summary via chat. Both succeed without using the web UI. SC-004 verified.

- [x] T033 [US3] Create MCP server scaffold at `src/mcp/server.ts` — initialise `Server` from `@modelcontextprotocol/sdk/server`; use `StdioServerTransport`; set server name `"little-logs"` and version; register all 6 tool definitions with input schemas from `contracts/mcp-tools.md` and placeholder handlers; call `server.connect(transport)`
- [x] T034 [US3] Implement `log_sleep` tool handler in `src/mcp/server.ts` — `action=start`: check for open session, insert `sleep_logs`; `action=end`: find open session, set `ended_at`, compute `duration_min`; return plain-text confirmation or error per contract output format
- [x] T035 [US3] Implement `log_feed` tool handler in `src/mcp/server.ts` — validate `type`, enforce `side`/`amount_ml` conditional rules; insert `feed_logs`; return confirmation with feed details
- [x] T036 [US3] Implement `log_nappy` tool handler in `src/mcp/server.ts` — validate `type`; insert `nappy_logs` with `concern_flag` (default false); return confirmation
- [x] T037 [US3] Implement `get_summary` tool handler in `src/mcp/server.ts` — `period=day`: aggregate last 24h; `period=week`: aggregate last 7 days; return formatted plain-text summary (sleep totals, feed counts by type, nappy counts by type)
- [x] T038 [US3] Implement `get_events` tool handler in `src/mcp/server.ts` — query `sleep_logs`, `feed_logs`, or `nappy_logs` (or all) filtered by `from`/`to` date range; return formatted list of ≤`limit` records (default 20)
- [x] T039 [US3] Implement `analyze_patterns` tool handler in `src/mcp/server.ts` — fetch `days` days of aggregated log data; call `@anthropic-ai/sdk` with same structured prompt strategy as `src/lib/claude.ts`; return analysis text; return no-data message if insufficient logs; return unavailable message on API error
- [x] T040 [US3] Add `"mcp:start": "npx tsx src/mcp/server.ts"` to `package.json` scripts

**Checkpoint**: MCP demo loop passes — all 5 acceptance scenarios from spec.md US3 verified via Claude Desktop.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: PWA installability, accessibility compliance, and end-to-end production validation.

- [x] T041 [P] Create PWA manifest at `public/manifest.json` — `name: "Little Logs"`, `short_name: "LittleLogs"`, `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `icons` array (at minimum 192×192 and 512×512 PNG entries)
- [x] T042 [P] Create service worker at `public/sw.js` — `install` event: pre-cache app shell (HTML, CSS, JS bundles); `activate` event: purge stale caches; `fetch` handler: cache-first for shell assets, network-first for `/api/*` calls
- [x] T043 Register service worker in `src/app/layout.tsx` — add `<script>` that calls `navigator.serviceWorker.register('/sw.js')` after load; guard with `'serviceWorker' in navigator` check
- [x] T044 Audit and fix accessibility across all screens — WCAG 2.1 AA: focus-visible rings on all interactive elements, ARIA labels on icon-only buttons, `<label>` for all form inputs, colour contrast ≥4.5:1 for text, keyboard navigation for sheets and modals
- [x] T045 Validate performance benchmarks — SC-001 (≤3 taps for any event type on real device), SC-002 (home screen ≤2s interactive on mobile connection), SC-003 (insights ≤10s, spinner shown); document any deviation with remediation plan
- [x] T046 Run `quickstart.md` validation end-to-end — fresh Vercel deploy, Google OAuth sign-in, first-time baby setup, log all three event types, view insights, run MCP demo loop via Claude Desktop; confirm SC-004, SC-005, SC-006 all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — **BLOCKS all user stories**
- **US1 (Phase 3)**: Requires Phase 2 complete; no cross-story dependencies
- **US2 (Phase 4)**: Requires Phase 2 (DB + auth); reads data written by US1 but does not depend on US1 code
- **US3 (Phase 5)**: Requires Phase 2 (DB schema + Drizzle client); imports `src/db` directly — does not call Next.js API routes
- **Polish (Phase 6)**: Requires all desired stories complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on US2 or US3.
- **US2 (P2)**: Starts after Phase 2. Reads log data seeded by US1 but no code dependency.
- **US3 (P3)**: Starts after Phase 2. Shares `src/db` and `src/lib/ulid.ts` with US1 but is independently runnable.

### Within Phase 3 (US1)

T015–T016 (setup), T017–T019 (sleep), T020–T021 (feed), T022–T023 (nappy), T024–T025 (history) can proceed as parallel groups once T005–T007 (schema + DB + migration) are done. T026–T028 (screens) depend on their respective routes and components.

---

## Parallel Opportunities

### Phase 1
```
After T001:  T002, T003, T004 in parallel
```

### Phase 2
```
T005 → T006 → T007  (sequential: schema before client before migration)
T008                 (independent: ulid.ts, start any time after T001)
T009                 (independent: after T005 schema exists for type imports)
T010, T011           (parallel: after T009)
T012                 (independent: pure CSS, start any time after T001)
T013                 (after T012: needs globals.css import)
T014                 (after T009-T010: needs NextAuth signIn)
```

### Phase 3 (US1) — after T005–T007
```
Group A (Setup):   T015 → T016
Group B (Sleep):   T017 → T018, T019 [P]
Group C (Feed):    T020 → T021 [P]
Group D (Nappy):   T022 → T023 [P]
Group E (History): T024 → T025 [P]
Groups A–E run in parallel with each other
T026 (layout)   after Group A (needs setup redirect logic)
T027 (home)     after Groups B, C, D (needs all three components)
T028 (history)  after Group E
```

### Phase 5 (US3)
```
T034–T040 are sequential in src/mcp/server.ts — implement in order after T033 scaffold
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical — blocks everything**)
3. Complete Phase 3: User Story 1 (baby setup + all three event types + history)
4. **Validate**: Open on phone, sign in, complete setup, log one of each event type, view history
5. Deploy to Vercel — MVP is live and SC-001/002/005/006 pass

### Incremental Delivery

1. Setup + Foundational → project compiles, auth works, DB connected
2. US1 → full logging MVP, works on phone
3. US2 → AI insights added, insights screen live
4. US3 → MCP demo loop functional, SC-004 verified
5. Polish → PWA installable, accessibility audited, quickstart fully validated

---

## Notes

- [P] tasks operate on different files with no dependency on incomplete tasks in the same phase
- [Story] label maps each task to its user story for traceability
- Log entries are immutable once saved — `PATCH /api/sleep/:id` (T018) closes open sessions only
- `(auth)/layout.tsx` (T026) handles both the auth redirect and the baby-setup redirect (FR-004a)
- MCP server (Phase 5) imports `src/db` directly — does NOT proxy through the Next.js API routes
- All spacing, colour, and type values MUST use design tokens from `globals.css` — no ad-hoc CSS values (Constitution IV)
- Use `claude-sonnet-4-5` for both `src/lib/claude.ts` (T029) and MCP `analyze_patterns` (T039)
