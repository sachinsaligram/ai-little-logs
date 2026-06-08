# Implementation Plan: Little Logs

**Branch**: `001-little-logs` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-little-logs/spec.md`

## Summary

Little Logs is a mobile-first PWA for logging baby sleep, feeds, and nappy changes, with two independent AI-powered access paths: a Next.js web UI (embedded Claude insights) and a local MCP server (natural language access via Claude Desktop). Both paths share a single Turso (SQLite) database via Drizzle ORM. Auth is Google OAuth restricted to one whitelisted email; no user table is needed.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20+

**Primary Dependencies**:
- `next` 15 (App Router)
- `drizzle-orm` + `@libsql/client` (Turso HTTP client)
- `next-auth` v5 (Google OAuth, JWT sessions)
- `@anthropic-ai/sdk` (Claude insights + MCP analyze_patterns)
- `@modelcontextprotocol/sdk` (MCP stdio server, Phase 1)
- `ulidx` (ULID generation)

**Storage**: Turso (libSQL / SQLite), edge-hosted, accessed via HTTP client

**Testing**: Vitest (unit), Playwright (E2E validation against quickstart scenarios)

**Target Platform**: Vercel (Next.js web app) + local Node.js (MCP server Phase 1)

**Project Type**: Web application (Next.js) + CLI script (MCP server)

**Performance Goals**: Home screen ≤2s interactive; insights panel ≤10s; tap feedback ≤100ms

**Constraints**: Vercel free tier (serverless functions, 10s timeout aligns with SC-003); single user; Node.js runtime required (NextAuth v5 incompatible with edge runtime)

**Scale/Scope**: 1 user, 1 baby, ~30 log events/day, 3 tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | No premature abstractions. Direct DB access from both server actions and MCP script via shared `src/db` module. No service layer. |
| II. User Experience | ✅ PASS | Mobile-first, ≤3 taps enforced in spec. WCAG 2.1 AA required (axe-cli gate in quickstart). Error messages defined in contracts — no silent failures. |
| III. Speed & Performance | ✅ PASS | SC-002 (≤2s home screen), SC-003 (≤10s insights), loading indicators required. Vercel CDN + Turso edge DB support latency targets. |
| IV. Clean Layouts | ✅ PASS | Design tokens required (CSS custom properties in `globals.css`). Single primary action per screen. No ad-hoc spacing/colour values. |

**Post-Phase 1 re-check**: All gates still pass. The dual-access architecture (web + MCP) is a required feature pair (US1 + US3), not premature complexity — see Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-little-logs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-routes.md    # Next.js API route contracts
│   └── mcp-tools.md     # MCP tool input/output schemas
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                  # Auth guard + shell layout
│   │   ├── page.tsx                    # Home screen (logging actions)
│   │   ├── history/
│   │   │   └── page.tsx               # Chronological event log
│   │   └── insights/
│   │       └── page.tsx               # AI insights panel
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts               # NextAuth handler
│   │   ├── sleep/
│   │   │   ├── route.ts               # POST /api/sleep
│   │   │   └── [id]/route.ts          # PATCH /api/sleep/:id
│   │   ├── feed/
│   │   │   └── route.ts               # POST /api/feed
│   │   ├── nappy/
│   │   │   └── route.ts               # POST /api/nappy
│   │   ├── history/
│   │   │   └── route.ts               # GET /api/history
│   │   └── insights/
│   │       └── route.ts               # POST /api/insights
│   ├── login/
│   │   └── page.tsx                   # Sign-in page
│   ├── layout.tsx                     # Root layout (manifest link, SW registration)
│   └── globals.css                    # Design tokens (CSS custom properties)
├── components/
│   ├── LogSleepButton.tsx
│   ├── LogFeedSheet.tsx               # Bottom sheet for feed logging
│   ├── LogNappySheet.tsx              # Bottom sheet for nappy logging
│   ├── EventHistory.tsx
│   └── InsightsPanel.tsx
├── db/
│   ├── index.ts                       # Drizzle client (libSQL HTTP)
│   └── schema.ts                      # Table definitions
├── lib/
│   ├── auth.ts                        # NextAuth config
│   ├── claude.ts                      # Anthropic client + prompt builder
│   └── ulid.ts                        # ulidx wrapper
└── mcp/
    └── server.ts                      # MCP stdio server (Phase 1, run locally)

public/
├── manifest.json                      # PWA manifest
└── sw.js                              # Service worker (shell cache only)

drizzle/
└── migrations/                        # Drizzle-kit generated migrations
```

**Structure Decision**: Single Next.js project. The MCP server is a co-located script (`src/mcp/server.ts`) that imports `src/db` directly. No monorepo split — the MCP script is not deployed in Phase 1.

## Complexity Tracking

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two entrypoints (web UI + MCP server) | Both are required features: US1 (web logging, P1) and US3 (MCP demo, P3) are independent user stories | Removing MCP eliminates the AI demo story — the primary differentiator of the project |
| Anthropic API called from two places (insights route + MCP `analyze_patterns`) | Both features independently need AI analysis | Routing MCP through the web API adds an HTTP hop and a deployment coupling that breaks the local-only Phase 1 architecture |
