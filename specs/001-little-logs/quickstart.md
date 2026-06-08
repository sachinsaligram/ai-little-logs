# Quickstart & Validation Guide: Little Logs

## Prerequisites

- Node.js 20+
- Turso account + database created (`turso db create little-logs`)
- Google Cloud project with OAuth 2.0 credentials (Web application type)
- Anthropic API key
- Vercel account (free tier) — for the deployed URL

## URLs

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:3000` |
| Deployed (Vercel) | `https://<project-name>.vercel.app` |

Vercel assigns a permanent `*.vercel.app` URL automatically on first deploy — no paid plan needed. Use the deployed URL for mobile testing and the MCP server's production config. Both environments share the same Turso database via environment variables.

## Environment Variables

### Local (`.env.local`)

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_EMAIL=your.email@gmail.com
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
ANTHROPIC_API_KEY=sk-ant-...
```

### Vercel (set in Project → Settings → Environment Variables)

Same keys as above, with `NEXTAUTH_URL=https://<project-name>.vercel.app`.

### Google OAuth setup

In Google Cloud Console → OAuth 2.0 credentials, add **both** URLs to "Authorized redirect URIs":

```
http://localhost:3000/api/auth/callback/google
https://<project-name>.vercel.app/api/auth/callback/google
```

## Setup

```bash
npm install
npm run db:push        # push Drizzle schema to Turso
npm run db:seed        # insert single baby record
npm run dev            # starts at http://localhost:3000
```

## Validation Scenarios

### US1 — Quick event logging (P1)

**Goal**: Verify any event type can be logged in ≤3 taps from the home screen on a phone.

Run against the deployed URL (`https://<project-name>.vercel.app`) on a real phone for the most accurate tap-count test; DevTools mobile view is acceptable for development.

1. Open the app URL on a mobile browser
2. Sign in with the whitelisted Google account
3. **Sleep**: Tap "Start sleep" → confirm → timer should appear. Count: 2 taps. ✓
4. **Sleep end**: Tap "End sleep" → duration shown. Count: 1 tap. ✓
5. **Feed**: Tap "Log feed" → select "Breast" → tap "Left" → confirm. Count: 3 taps. ✓
6. **Nappy**: Tap "Log nappy" → select "Wet" → confirm. Count: 2 taps. ✓
7. Reload page — in-progress sleep session (if any) must still show the running timer. ✓

**Expected**: All events appear in the history list with correct timestamps and types.

---

### US1 — Auth guard

1. Open app in an incognito window
2. Try to access `/` directly
3. **Expected**: Redirected to `/login`
4. Sign in with a non-whitelisted Google account
5. **Expected**: Access denied; not redirected to home screen

---

### US2 — In-app AI insights (P2)

**Prerequisites**: At least 3 days of logged data (can seed with `npm run db:seed:demo`).

1. Navigate to `/insights`
2. **Expected**: Insights panel loads within 10 seconds showing:
   - Daily summary (sleep total, feed count, nappy count)
   - Weekly summary
   - At least one detected pattern in plain English
3. Disconnect your network, then reload
4. **Expected**: App shell loads; insights panel shows a friendly "unavailable" message (not an error/blank)

---

### US3 — MCP natural language access (P3)

**Prerequisites**: Claude Desktop installed.

#### One-time setup (Claude Desktop config)

Add to `~/.claude_desktop_config.json` (create if it doesn't exist):

```json
{
  "mcpServers": {
    "little-logs": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/project/src/mcp/server.ts"]
    }
  }
}
```

Restart Claude Desktop once. After that, Claude Desktop spawns the MCP server automatically every time it launches — no manual start needed. The `little-logs` tools will appear in Claude Desktop's tool list.

> **Dev/test only**: To run the server in isolation (e.g., to check for startup errors), you can run `npx tsx src/mcp/server.ts` directly in a terminal.

#### Validation steps

In a new Claude Desktop conversation:

1. **Log via chat**: Say "Log a 10-minute breastfeed on the left side"
   - **Expected**: Claude confirms; new feed_log row exists in Turso
2. **Query via chat**: Ask "How much did the baby sleep last night?"
   - **Expected**: Claude returns a human-readable answer using `get_summary`
3. **Pattern analysis**: Ask "Are there any patterns in the baby's feeds over the past week?"
   - **Expected**: Claude uses `analyze_patterns` and returns plain-English observations
4. **No data case**: Ask "What happened on 1 January 2020?"
   - **Expected**: Claude responds "no data for that period", not an error

---

## Performance Checks

Run against the deployed Vercel URL for accurate network conditions.

- [ ] Home screen (logged in) loads and is interactive in ≤2 seconds on a 4G connection (throttle in DevTools)
- [ ] Insights panel returns in ≤10 seconds; loading indicator visible during AI call
- [ ] Any tap/button interaction produces visible feedback in ≤100 ms

## Accessibility Check

```bash
npx axe-cli http://localhost:3000 --include main
```

**Expected**: 0 critical or serious violations.

## PWA Install Check

1. Open the deployed URL (`https://<project-name>.vercel.app`) in Chrome on Android or Safari on iOS
2. Tap "Add to Home Screen" (or browser install prompt)
3. Launch from home screen icon
4. **Expected**: App opens without browser chrome; manifest icon visible
