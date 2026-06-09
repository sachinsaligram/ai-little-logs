# Little Logs

A mobile-first baby tracking app with AI-powered insights and dual access — a web UI for fast one-handed logging, and natural language access via Claude Desktop using the Model Context Protocol (MCP).

Both paths read from and write to the same database, so a feed logged in the app appears immediately when you ask Claude for a summary — and vice versa.

---

## What it does

- **Log in ≤3 taps** — sleep sessions, feeds, and nappy changes from the home screen
- **AI insights** — Claude summarises the last 7 days of data in plain English
- **MCP tools** — log events and query data through Claude Desktop in natural language
- **PWA** — install to your phone home screen; works like a native app

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Turso (SQLite-compatible edge DB) |
| ORM | Drizzle ORM |
| Auth | NextAuth v5 (Google OAuth, single whitelisted email) |
| AI | Anthropic Claude (insights + MCP pattern analysis) |
| MCP | `@modelcontextprotocol/sdk` — local stdio server |
| Deploy | Vercel |

---

## Getting started

See **[quickstart.md](quickstart.md)** for the full end-to-end setup and validation guide.

### Quick local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in your values
cp .env.local.example .env.local

# 3. Push the schema to Turso
npm run db:push

# 4. Seed a baby profile
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the Google account set in `NEXTAUTH_EMAIL`.

### Environment variables

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://<db-name>.turso.io` |
| `TURSO_AUTH_TOKEN` | Auth token from `turso db tokens create <db-name>` |
| `NEXTAUTH_URL` | Full public URL — `http://localhost:3000` for local dev |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_EMAIL` | The single Google email address allowed to sign in |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console |
| `ANTHROPIC_API_KEY` | Anthropic API key (insights panel + MCP analysis) |

---

## MCP — natural language access

The MCP server lets Claude Desktop interact with your database directly. Once configured, you can say things like:

> "Log a 10-minute breastfeed from the left side."
> "How did the baby sleep last night?"
> "Are there any patterns in the feeds this week?"

**One-time setup** — add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

Restart Claude Desktop. The `little-logs` tools will appear automatically.

Available tools: `log_sleep`, `log_feed`, `log_nappy`, `get_summary`, `get_events`, `analyze_patterns`.

---

## Documentation

| Document | What's in it |
|---|---|
| [quickstart.md](quickstart.md) | Full setup, deployment, and end-to-end validation guide |
| [docs/how-it-works.md](docs/how-it-works.md) | Architecture, data model, auth flow, and design decisions |

---

## NPM scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to Turso |
| `npm run db:seed` | Seed a baby profile |
| `npm run mcp:start` | Run the MCP server standalone |
