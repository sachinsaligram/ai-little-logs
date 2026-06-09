# How Little Logs Works

Little Logs is a mobile-first baby tracking app with two independent ways to interact with your data: a web UI you can open on any device, and a natural language interface via Claude Desktop. Both paths read from and write to the same database, so a feed logged through the app appears immediately when you ask Claude for a summary — and vice versa.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication](#authentication)
3. [Data Storage](#data-storage)
4. [Web UI — Logging Events](#web-ui--logging-events)
5. [AI Insights](#ai-insights)
6. [MCP — Natural Language Access via Claude Desktop](#mcp--natural-language-access-via-claude-desktop)
7. [Environment Variables](#environment-variables)
8. [Architecture Diagram](#architecture-diagram)

---

## System Overview

There are two access paths into Little Logs:

| Path | Interface | Best for |
|---|---|---|
| **Web UI** | Browser on any device | Quick logging on mobile while caring for baby |
| **MCP (Claude Desktop)** | Natural language chat | Asking questions, getting summaries, demo |

Both paths hit the same Turso database. There is no sync, no conflict, and no separate copy of the data.

---

## Authentication

Access is restricted to **one pre-configured Google account** (`NEXTAUTH_EMAIL`). Anyone else who attempts to sign in is rejected before reaching the app.

**Sign-in flow:**
1. Visit the app URL → redirected to the login screen.
2. Tap **Sign in with Google** → Google OAuth prompt.
3. After successful authentication, your session is stored in a secure cookie. You will not be asked to sign in again unless you clear your cookies.

**First-time setup:** If no baby profile exists yet, you are redirected to a one-time setup screen to enter the baby's name and date of birth. This only happens once.

---

## Data Storage

All data is stored in a **Turso** database — a SQLite-compatible, edge-hosted database. There are four tables:

### `babies`
One row per baby. Stores name and date of birth. Little Logs currently supports a single baby profile.

### `sleep_logs`
One row per sleep session. A session is "open" (in-progress) when `ended_at` is `NULL`. When the session ends, `ended_at` is set and `duration_min` is calculated automatically.

| Field | Description |
|---|---|
| `started_at` | When the sleep began (UTC) |
| `ended_at` | When the sleep ended (NULL if in progress) |
| `duration_min` | Calculated duration in minutes |
| `location` | Optional — e.g. "cot", "pram" |
| `quality` | Optional — rating 1–5 |

### `feed_logs`
One row per feeding event.

| Field | Description |
|---|---|
| `type` | `breast`, `bottle`, or `solid` |
| `started_at` | When the feed began |
| `side` | Optional — `L`, `R`, or `both` (breast only) |
| `amount_ml` | Optional — volume consumed (bottle only) |

### `nappy_logs`
One row per nappy change.

| Field | Description |
|---|---|
| `type` | `wet`, `dirty`, `both`, or `dry` |
| `logged_at` | When the change occurred |
| `concern_flag` | Boolean — flagged for medical attention |
| `colour` | Optional |
| `consistency` | Optional |

All records use **ULID** identifiers — sortable, collision-resistant, no auto-increment.

---

## Web UI — Logging Events

The web app is a **Progressive Web App (PWA)** — it can be installed to your home screen on iOS or Android and works like a native app.

### Home Screen
The home screen presents three primary actions, each reachable in ≤3 taps from opening the app:

**Sleep**
- Tap **Start sleep** → session begins, timestamp recorded, elapsed timer starts.
- Tap **End sleep** → session closes, duration calculated automatically.
- Optional fields (location, quality) are shown on the end-sleep screen.
- An open sleep session survives closing and reopening the app — the timer resumes where it left off.

**Feed**
- Tap **Log feed** → bottom sheet opens.
- Select feed type: Breast, Bottle, or Solid.
- For breast: optionally select side (Left / Right / Both).
- For bottle: optionally enter amount in ml.
- Tap **Log feed** → saved.

**Nappy**
- Tap **Log nappy** → bottom sheet opens.
- Select type: Wet, Dirty, Both, or Dry.
- Optionally flag as a concern, add colour or consistency notes.
- Tap **Log nappy** → saved.

### History Screen
Shows a chronological feed of all logged events across all types. Nappy entries flagged as a concern are highlighted. Paginated — tap **Load more** to go further back.

### Insights Screen
See [AI Insights](#ai-insights) below.

### Navigation
A fixed bottom navigation bar gives one-tap access to Home, History, and Insights from anywhere in the app.

---

## AI Insights

The **Insights** screen surfaces AI-generated summaries of the last 7 days of logged data, powered by Claude (Anthropic).

### How it works
1. You navigate to **Insights**.
2. The app calls its own `/api/insights` endpoint.
3. The server queries Turso for aggregated counts and durations across all event types for the past 7 days.
4. That structured data (no free-text notes — privacy first) is sent to Claude as a prompt.
5. Claude returns a plain-language summary and a list of observed patterns.
6. The result is displayed in the panel.

### What you see
- A **summary** paragraph describing the overall picture (e.g. average sleep duration, feed frequency).
- A **Patterns** list highlighting notable observations (e.g. longer sleep stretches overnight, consistent feeding intervals).

### Loading behaviour
- A spinner appears within 300ms of opening the screen.
- The rest of the app remains fully navigable while insights load.
- If the AI call takes longer than 10 seconds or fails, a graceful error message is shown — no data is lost and logging still works.
- If there is no logged data yet, a friendly empty state is shown.

---

## MCP — Natural Language Access via Claude Desktop

The **MCP (Model Context Protocol) server** is a local process that runs alongside Claude Desktop. It connects Claude directly to your Turso database, letting you log events and ask questions in plain English.

### What you can do
- **Log events**: "Log a 10-minute breastfeed from the left side."
- **End a sleep session**: "Baby just woke up, end the sleep session."
- **Ask for summaries**: "How did the baby sleep last night?"
- **Query raw data**: "Show me all nappy changes from this morning."
- **Get AI analysis**: "Are there any patterns in the last week?"

### Available tools

| Tool | What it does |
|---|---|
| `log_sleep` | Start or end a sleep session |
| `log_feed` | Log a feeding event |
| `log_nappy` | Log a nappy change |
| `get_summary` | Daily or weekly summary of all event types |
| `get_events` | Query raw log entries by type and date range |
| `analyze_patterns` | AI-powered pattern analysis over a configurable period |

### How it works
1. Claude Desktop is configured to launch the MCP server as a local stdio process.
2. When you ask a question or give an instruction, Claude selects the appropriate tool and calls the MCP server.
3. The MCP server connects directly to Turso and executes the query or write.
4. Results are returned to Claude, which formats them as a natural language response.

### Setup
See [quickstart.md](../quickstart.md#step-6--mcp-demo-loop-sc-004) for configuration instructions.

---

## Environment Variables

All configuration is managed through environment variables. For local development these live in `.env.local`; for production they are set in the Vercel dashboard.

| Variable | Required by | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Web app + MCP server | libSQL connection URL for your Turso database — format: `libsql://<db-name>.turso.io` |
| `TURSO_AUTH_TOKEN` | Web app + MCP server | Auth token for the Turso database, generated via `turso db tokens create <db-name>` |
| `NEXTAUTH_URL` | Web app | Full public URL of the deployed app — e.g. `https://ai-little-logs.vercel.app`. Used by NextAuth to construct OAuth callback URLs. |
| `NEXTAUTH_SECRET` | Web app | Random secret used to sign session cookies — generate with `openssl rand -base64 32` |
| `NEXTAUTH_EMAIL` | Web app | The single Google email address permitted to sign in — all other accounts are rejected |
| `GOOGLE_CLIENT_ID` | Web app | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Web app | OAuth 2.0 Client Secret from Google Cloud Console |
| `ANTHROPIC_API_KEY` | Web app + MCP server | Anthropic API key used for the insights panel and the MCP `analyze_patterns` tool |

> The MCP server reads `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `ANTHROPIC_API_KEY` directly from the environment when started. These are passed via the `env` block in the Claude Desktop config — see [quickstart.md](../quickstart.md#6a--configure-claude-desktop).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Access Paths                             │
│                                                                 │
│   ┌──────────────────┐            ┌──────────────────────┐      │
│   │   Browser / PWA  │            │    Claude Desktop     │      │
│   │  (any device)    │            │  (desktop/laptop)     │      │
│   └────────┬─────────┘            └──────────┬───────────┘      │
│            │ HTTPS                           │ stdin/stdout      │
│            ▼                                 ▼                   │
│   ┌──────────────────┐            ┌──────────────────────┐      │
│   │   Next.js App    │            │    MCP Server         │      │
│   │   (Vercel)       │            │  src/mcp/server.ts    │      │
│   │                  │            │  (local Node process) │      │
│   │  /api/sleep      │            │                       │      │
│   │  /api/feed       │            │  log_sleep            │      │
│   │  /api/nappy      │            │  log_feed             │      │
│   │  /api/insights ──┼──Claude────│  log_nappy            │      │
│   │  /api/history    │  API       │  get_summary          │      │
│   └────────┬─────────┘            │  get_events           │      │
│            │                      │  analyze_patterns ────┼──Claude API
│            │                      └──────────┬───────────┘      │
│            │ libSQL (HTTP)                    │ libSQL (HTTP)     │
│            └──────────────┬──────────────────┘                   │
│                           ▼                                      │
│                  ┌────────────────┐                              │
│                  │  Turso (SQLite)│                              │
│                  │                │                              │
│                  │  babies        │                              │
│                  │  sleep_logs    │                              │
│                  │  feed_logs     │                              │
│                  │  nappy_logs    │                              │
│                  └────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key design points

- **One database, two clients** — both the Next.js app and the MCP server use Drizzle ORM over the same Turso connection. There is no replication or sync layer.
- **Auth is independent per path** — the web UI uses Google OAuth (NextAuth). The MCP server is local-only in Phase 1; access is controlled by who can run the process on their machine.
- **AI runs in two places** — the web insights panel calls the Anthropic API from a Vercel serverless function. The MCP `analyze_patterns` tool calls the same API from the local MCP server process.
- **No user table** — identity is a single whitelisted email in an environment variable. There are no user accounts, passwords, or user rows in the database.
