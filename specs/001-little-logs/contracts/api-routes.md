# API Route Contracts

All routes require an authenticated session (NextAuth JWT cookie). Unauthenticated requests return `401`. Routes run in the Node.js runtime.

Base path: `/api`

---

## Sleep

### `POST /api/sleep`

Start a new sleep session, or create a completed session with both start and end times.

**Request body**
```json
{
  "started_at": "2026-06-08T21:00:00Z",   // required, ISO 8601 UTC
  "ended_at":   "2026-06-09T07:00:00Z",   // optional
  "location":   "cot",                     // optional, string
  "quality":    4,                         // optional, integer 1–5
  "notes":      "settled quickly"          // optional, string
}
```

**Responses**
- `201` — `{ "id": "<ulid>", "duration_min": 600 | null }`
- `409` — `{ "error": "open_session_exists" }` — another sleep session is already open for this baby

---

### `PATCH /api/sleep/:id`

Close an open sleep session (set `ended_at` and compute `duration_min`). Also used to edit optional fields on any session.

**Request body** (all fields optional; at least one required)
```json
{
  "ended_at":  "2026-06-09T07:00:00Z",
  "location":  "cot",
  "quality":   4,
  "notes":     "woke once at 3am"
}
```

**Responses**
- `200` — `{ "id": "<ulid>", "duration_min": 600 }`
- `404` — session not found
- `422` — `ended_at` is before `started_at`

---

## Feeds

### `POST /api/feed`

**Request body**
```json
{
  "started_at": "2026-06-08T09:00:00Z",  // required
  "ended_at":   "2026-06-08T09:20:00Z",  // optional
  "type":       "breast",                // required: "breast" | "bottle" | "solid"
  "side":       "L",                     // optional, only for type=breast: "L" | "R" | "both"
  "amount_ml":  120,                     // optional, only for type=bottle, positive integer
  "notes":      ""                       // optional
}
```

**Responses**
- `201` — `{ "id": "<ulid>" }`
- `422` — validation error (e.g., `side` provided for non-breast feed)

---

## Nappy Changes

### `POST /api/nappy`

**Request body**
```json
{
  "logged_at":    "2026-06-08T10:30:00Z",  // required
  "type":         "dirty",                  // required: "wet" | "dirty" | "both" | "dry"
  "colour":       "yellow",                 // optional
  "consistency":  "runny",                  // optional
  "concern_flag": false,                    // optional, default false
  "notes":        ""                        // optional
}
```

**Responses**
- `201` — `{ "id": "<ulid>" }`
- `422` — validation error

---

## History

### `GET /api/history`

Retrieve paginated log history across all event types.

**Query parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | ISO 8601 date | 7 days ago | Start of range (inclusive) |
| `to` | ISO 8601 date | now | End of range (inclusive) |
| `type` | `sleep\|feed\|nappy\|all` | `all` | Filter by event type |
| `limit` | integer 1–100 | 50 | Max records returned |
| `cursor` | string | — | Pagination cursor (last `id` from previous page) |

**Response**
```json
{
  "items": [
    { "type": "sleep", "id": "...", "started_at": "...", "ended_at": "...", "duration_min": 480 },
    { "type": "feed",  "id": "...", "started_at": "...", "type": "breast", "side": "L" },
    { "type": "nappy", "id": "...", "logged_at": "...", "type": "dirty", "concern_flag": false }
  ],
  "next_cursor": "<ulid or null>"
}
```

---

## Insights

### `POST /api/insights`

Fetch AI-generated pattern summary. Triggers a Claude API call.

**Request body**
```json
{
  "days": 7   // optional, integer 1–30, default 7
}
```

**Response**
```json
{
  "summary": "Over the past 7 days, the baby averaged 14.2 hours of sleep...",
  "patterns": [
    "Sleep typically starts between 7–8 pm and lasts 10–11 hours.",
    "Feeds are clustered around 6 am, 9 am, 12 pm, 3 pm, and 6 pm."
  ],
  "generated_at": "2026-06-08T18:00:00Z"
}
```

**Error responses**
- `503` — `{ "error": "ai_unavailable", "message": "..." }` — Claude call failed; app remains usable
- `204` — no data available for the requested period
