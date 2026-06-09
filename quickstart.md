# Little Logs — Quickstart & Validation Guide

End-to-end guide: deploy a fresh instance, validate all six success criteria, and run the MCP demo loop.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥20 | `node --version` |
| [Turso CLI](https://docs.turso.tech/cli/introduction) | `brew install tursodatabase/tap/turso` |
| [Vercel CLI](https://vercel.com/docs/cli) | `npm i -g vercel` |
| [Claude Desktop](https://claude.ai/download) | Required for MCP demo |
| Google Cloud project | OAuth 2.0 credentials needed |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) |

---

## Step 1 — Turso database

```bash
turso auth login
turso db create little-logs
turso db show little-logs          # note URL
turso db tokens create little-logs # note token
```

Push the schema:

```bash
# Copy .env.local.example → .env.local and fill in TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
cp .env.local.example .env.local
# edit .env.local with the values above
npm run db:push
```

---

## Step 2 — Google OAuth credentials

1. Open [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. Create an OAuth 2.0 Client ID (Web application).
3. Add authorised redirect URI: `https://<your-vercel-domain>/api/auth/callback/google`
4. Copy **Client ID** and **Client Secret**.

---

## Step 3 — Vercel deployment

```bash
vercel            # follow prompts to link/create project
```

Add the following environment variables in the Vercel dashboard (or via `vercel env add`):

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://<db-name>.turso.io` |
| `TURSO_AUTH_TOKEN` | token from step 1 |
| `NEXTAUTH_URL` | `https://<your-vercel-domain>` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_EMAIL` | your whitelisted Google email |
| `GOOGLE_CLIENT_ID` | from step 2 |
| `GOOGLE_CLIENT_SECRET` | from step 2 |
| `ANTHROPIC_API_KEY` | from Anthropic console |

Deploy:

```bash
vercel --prod
```

---

## Step 4 — First-time user flow (SC-005)

> **SC-005**: A first-time user can sign in, log one event of each type, and view the insights panel within 5 minutes of first opening the app.

1. Open `https://<your-vercel-domain>` on a mobile device or browser.
2. Tap **Sign in with Google** and authenticate with your whitelisted account.
3. On the setup screen, enter the baby's name and date of birth, tap **Continue**.
4. You are redirected to the home screen. Confirm home screen loads within 2 seconds (SC-002, see below).
5. Log all three event types:
   - **Sleep**: Tap **Start sleep** (1 tap). Then tap **End sleep** (1 tap). ✓ SC-001
   - **Feed**: Tap **Log feed** → select a type (e.g. Solid) → tap **Log feed** confirm. ✓ SC-001 (3 taps)
   - **Nappy**: Tap **Log nappy** → select a type (e.g. Wet) → tap **Log nappy** confirm. ✓ SC-001 (3 taps)
6. Navigate to **Insights** via the bottom nav. Verify spinner appears while loading, and a summary is returned within 10 seconds. ✓ SC-003
7. Total time from opening the URL should be ≤5 minutes. ✓ SC-005

---

## Step 5 — SC-006 sleep session persistence

> **SC-006**: An in-progress sleep session survives an app close and reopen with no data loss.

1. Tap **Start sleep** on the home screen.
2. Close the browser tab (or lock the phone screen).
3. Reopen `https://<your-vercel-domain>`.
4. Confirm the home screen shows "Sleep in progress" with the elapsed timer. ✓ SC-006

---

## Step 6 — MCP demo loop (SC-004)

> **SC-004**: The complete MCP demo loop — log an event via Claude chat, then retrieve a summary via Claude chat — works end-to-end without manual database intervention.

### 6a — Configure Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "little-logs": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/ai-bootcamp-demo/src/mcp/server.ts"],
      "env": {
        "TURSO_DATABASE_URL": "libsql://<db-name>.turso.io",
        "TURSO_AUTH_TOKEN": "<your-token>",
        "ANTHROPIC_API_KEY": "<your-key>"
      }
    }
  }
}
```

Alternatively, run the MCP server manually and point Claude Desktop to it:

```bash
npm run mcp:start
```

### 6b — Demo loop

1. Open Claude Desktop. Verify the Little Logs tools appear in the tool list.
2. Say: **"Log a 10-minute breastfeed from the left side."**
   - Claude calls `log_feed` → feed entry created in the database.
   - Claude confirms the logged event.
3. Say: **"Give me a summary of today's logs."**
   - Claude calls `get_summary` with `period: "day"` → returns a natural-language summary.
   - No manual database access required. ✓ SC-004

Available MCP tools: `log_sleep`, `log_feed`, `log_nappy`, `get_summary`, `get_events`, `analyze_patterns`.

---

## Performance benchmarks (SC-001, SC-002, SC-003)

### SC-001 — ≤3 taps for any event type

| Event | Tap sequence | Count |
|---|---|---|
| Sleep start | Home → **Start sleep** | 1 |
| Sleep end | Home → **End sleep** | 1 |
| Feed (any type, minimal) | Home → **Log feed** → select type → **Log feed** | 3 |
| Nappy (any type) | Home → **Log nappy** → select type → **Log nappy** | 3 |

All event types complete in ≤3 taps. ✓ SC-001

### SC-002 — Home screen ≤2s interactive on mobile connection

The home screen is a Next.js server component that performs a single indexed DB query (Turso edge replica). There are no blocking client-side bundles on the critical path. Vercel CDN serves static assets globally.

**Validate**: Open the home screen on a mobile device with the browser DevTools Network panel (or use Lighthouse). Confirm Time to Interactive ≤2s. On Vercel free tier with Turso edge, this is expected to pass.

### SC-003 — Insights ≤10s, spinner shown

The `InsightsPanel` component shows a loading spinner after a 300ms delay. The insights API calls Claude claude-haiku-4-5 with the last 7 days of events (bounded dataset). The Vercel function timeout is 10 seconds.

**Validate**: Navigate to `/insights`. The spinner appears almost immediately. The summary loads within the 10s window. If the AI call times out, the error state is shown and the rest of the app remains navigable.

---

## Validation checklist

- [ ] SC-001: All three event types logged in ≤3 taps on a real mobile device
- [ ] SC-002: Home screen interactive in ≤2s (Lighthouse or DevTools)
- [ ] SC-003: Insights spinner visible; summary returned within 10s
- [ ] SC-004: MCP demo loop complete (log via Claude → retrieve summary via Claude)
- [ ] SC-005: First-time user onboarding completed within 5 minutes
- [ ] SC-006: In-progress sleep session persists across app close/reopen
