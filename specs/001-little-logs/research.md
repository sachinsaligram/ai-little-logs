# Research: Little Logs

## ULID Generation

**Decision**: Use `ulidx` npm package. Generate IDs in application code before every insert.

**Rationale**: Drizzle + libSQL has no built-in ULID default. `ulidx` is the actively maintained fork of `ulid`, ESM-compatible, works in Node.js and edge environments. IDs generated at the app layer (not DB layer) means the ID is available immediately after creation without a round-trip.

**Alternatives considered**: `ulid` (unmaintained), UUID v4 (no time-ordering, harder to debug), auto-increment integer (exposes record counts, breaks distributed inserts).

---

## Turso / libSQL Client in Vercel

**Decision**: Use `@libsql/client` HTTP mode with `createClient({ url, authToken })`. Run all API routes in the Node.js runtime (not Edge runtime).

**Rationale**: Turso's HTTP client works correctly in Vercel serverless Node.js functions. NextAuth v5 requires Node.js runtime (no edge support for JWT callbacks in v5 at time of writing). Keeping all API routes on the same runtime avoids mixed-runtime complexity. The Drizzle adapter is `drizzle-orm/libsql`.

**Alternatives considered**: Edge runtime (incompatible with NextAuth v5 middleware on some routes), direct SQLite file (not edge-accessible, not suitable for Vercel deployment).

---

## NextAuth v5 — Single-Email Whitelist

**Decision**: Use the `signIn` callback to reject any Google account whose email does not match `process.env.NEXTAUTH_EMAIL`. Use `auth()` middleware to protect all app routes under `/(auth)`.

**Rationale**: No user table is needed — the whitelist is a single env var. JWT session strategy (default in v5) stores session in a signed cookie with no DB adapter. The `signIn` callback runs server-side before the session is created, so rejected users never get a session.

**Implementation pattern**:
```ts
// src/lib/auth.ts
callbacks: {
  signIn({ account, profile }) {
    return account?.provider === "google" &&
      profile?.email === process.env.NEXTAUTH_EMAIL
  }
}
```

**Alternatives considered**: Database adapter with allowlist table (unnecessary overhead for a single user), middleware-only check (runs after session creation, still issues a token briefly).

---

## MCP Server (Phase 1 — Local stdio)

**Decision**: Standalone Node.js script at `src/mcp/server.ts`, run with `npx tsx src/mcp/server.ts`. Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`. Imports the same Drizzle schema/client used by the web API.

**Rationale**: stdio transport requires no HTTP server, no auth layer, no deployment — minimal viable MCP for Phase 1. The script shares the database module directly rather than proxying through the Next.js API, keeping it self-contained and avoiding the HTTP hop.

**Phase 3 path**: Replace `StdioServerTransport` with `StreamableHTTPServerTransport`, deploy as a Vercel function, add bearer token auth.

**Alternatives considered**: HTTP transport from day 1 (unnecessary complexity), separate DB schema (code duplication risk).

---

## Claude API — Insights Panel

**Decision**: Use `@anthropic-ai/sdk` with `claude-sonnet-4-5` (maps to `claude-sonnet-4` in user description). Non-streaming response. API route at `POST /api/insights`.

**Rationale**: Non-streaming is simpler to implement and sufficient for a summarisation use case with a 10-second budget (SC-003). The insights route fetches relevant log data from Turso, constructs a structured prompt, and returns the Claude response as JSON. The MCP `analyze_patterns` tool follows the same pattern (calls Claude internally).

**Prompt strategy**: Pass structured log data (counts, timestamps, durations) as context. Ask Claude to identify patterns and produce a plain-English summary. Do not pass raw notes (privacy).

**Alternatives considered**: Streaming (adds client complexity for marginal UX benefit in a summary panel), claude-haiku (cheaper but less capable for pattern detection).

---

## PWA Setup in Next.js 15

**Decision**: Manual `public/manifest.json` + minimal service worker in `public/sw.js` registered in the root layout. No `next-pwa` dependency.

**Rationale**: The only PWA requirement is an installable shell — no offline data sync, no background fetch. A hand-written service worker that caches the app shell (HTML, CSS, JS) is ~30 lines and avoids a build-tool dependency with its own configuration surface.

**Alternatives considered**: `next-pwa` (adds Workbox dependency, overkill for shell-only caching), `@ducanh2912/next-pwa` (same concern).

---

## Design Tokens

**Decision**: Define a minimal set of design tokens in `src/styles/tokens.css` (CSS custom properties): color palette, spacing scale (4px base), type scale, border-radius, and shadow. All component styles reference tokens; no ad-hoc values.

**Rationale**: Required by Constitution Principle IV. CSS custom properties work without a CSS-in-JS library, keep the implementation simple, and are immediately available in Tailwind via `extend.colors` / `extend.spacing` if Tailwind is adopted.

**Alternatives considered**: Tailwind default palette (not a custom token set — ad-hoc values still possible), styled-components (heavyweight for a solo project).
