# MCP Tool Contracts

Phase 1: local stdio transport. Run with `npx tsx src/mcp/server.ts`.

Server name: `little-logs`
Protocol: MCP 1.0

All tools share the same Turso database as the web UI via the `src/db` module.

---

## `log_sleep`

Start or end a sleep session. If no open session exists, starts one. If an open session exists and `action` is `"end"`, closes it.

**Input schema**
```json
{
  "action": {
    "type": "string",
    "enum": ["start", "end"],
    "description": "Whether to start a new sleep session or end the current open one"
  },
  "started_at": {
    "type": "string",
    "description": "ISO 8601 UTC timestamp. Required for action=start. Defaults to now if omitted."
  },
  "ended_at": {
    "type": "string",
    "description": "ISO 8601 UTC timestamp. Required for action=end if not using current time."
  },
  "location": { "type": "string", "description": "Optional. e.g. 'cot', 'pram'" },
  "quality":  { "type": "integer", "minimum": 1, "maximum": 5, "description": "Optional sleep quality 1–5" },
  "notes":    { "type": "string", "description": "Optional free text" }
}
```
Required: `action`

**Output (success)**
```
Started sleep session at 21:00 UTC. Session ID: 01HXYZ...
— or —
Ended sleep session. Duration: 10 hours 23 minutes. Session ID: 01HXYZ...
```

**Output (error)**
```
Error: An open sleep session already exists (started at 21:00 UTC). Use action=end to close it first.
```

---

## `log_feed`

Log a feeding event.

**Input schema**
```json
{
  "type": {
    "type": "string",
    "enum": ["breast", "bottle", "solid"],
    "description": "Type of feed"
  },
  "started_at": {
    "type": "string",
    "description": "ISO 8601 UTC timestamp. Defaults to now if omitted."
  },
  "ended_at":   { "type": "string", "description": "Optional end time" },
  "side":       { "type": "string", "enum": ["L", "R", "both"], "description": "Required for type=breast" },
  "amount_ml":  { "type": "integer", "minimum": 1, "description": "Optional for type=bottle" },
  "notes":      { "type": "string" }
}
```
Required: `type`

**Output (success)**
```
Logged breast feed (left side) starting at 06:00 UTC. ID: 01HXYZ...
— or —
Logged bottle feed: 120 ml at 09:00 UTC. ID: 01HXYZ...
```

---

## `log_nappy`

Log a nappy change.

**Input schema**
```json
{
  "type": {
    "type": "string",
    "enum": ["wet", "dirty", "both", "dry"],
    "description": "Type of nappy change"
  },
  "logged_at":    { "type": "string", "description": "ISO 8601 UTC timestamp. Defaults to now." },
  "colour":       { "type": "string", "description": "Optional. e.g. 'yellow', 'green'" },
  "consistency":  { "type": "string", "description": "Optional. e.g. 'runny', 'formed'" },
  "concern_flag": { "type": "boolean", "description": "Optional. Default false." },
  "notes":        { "type": "string" }
}
```
Required: `type`

**Output (success)**
```
Logged dirty nappy at 10:30 UTC. ID: 01HXYZ...
```

---

## `get_summary`

Return a daily or weekly rollup of all three event types.

**Input schema**
```json
{
  "period": {
    "type": "string",
    "enum": ["day", "week"],
    "description": "Summarise the last 24 hours or last 7 days"
  },
  "date": {
    "type": "string",
    "description": "Optional. ISO 8601 date (YYYY-MM-DD) for the summary anchor. Defaults to today."
  }
}
```
Required: `period`

**Output (success)**
```
Summary for 2026-06-08 (past 24 hours):
• Sleep: 10h 23min across 1 session
• Feeds: 6 total (4 breast, 1 bottle, 1 solid)
• Nappies: 8 changes (5 wet, 2 dirty, 1 both)
```

---

## `get_events`

Query raw log entries by type and date range.

**Input schema**
```json
{
  "type": {
    "type": "string",
    "enum": ["sleep", "feed", "nappy", "all"],
    "description": "Event type to retrieve"
  },
  "from": {
    "type": "string",
    "description": "ISO 8601 date or datetime. Start of range (inclusive). Required."
  },
  "to": {
    "type": "string",
    "description": "ISO 8601 date or datetime. End of range (inclusive). Defaults to now."
  },
  "limit": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "description": "Max records to return. Default 20."
  }
}
```
Required: `type`, `from`

**Output (success)**
```
Sleep sessions from 2026-06-01 to 2026-06-08 (3 records):
1. 2026-06-06 21:05 → 2026-06-07 07:10 · 10h 5min · cot · quality 4
2. 2026-06-07 20:55 → 2026-06-08 07:00 · 10h 5min · cot
3. 2026-06-08 21:00 → in progress
```

---

## `analyze_patterns`

Run Claude-powered pattern analysis over a configurable number of days. The tool fetches log data and calls the Anthropic API internally.

**Input schema**
```json
{
  "days": {
    "type": "integer",
    "minimum": 1,
    "maximum": 30,
    "description": "Number of days to analyse. Default 7."
  },
  "focus": {
    "type": "string",
    "enum": ["sleep", "feed", "nappy", "all"],
    "description": "Which event type to focus the analysis on. Default 'all'."
  }
}
```
Required: none (all optional)

**Output (success)**
```
Pattern analysis for the past 7 days:

Sleep: The baby consistently starts sleeping between 7–8 pm and wakes around 6:30–7 am, 
averaging 11 hours 15 minutes per night. One short nap (~45 min) appears most afternoons.

Feeds: Six feeds per day is the clear pattern. Morning feeds (6 am, 9 am) are breast; 
midday and afternoon alternate breast and bottle.

Nappies: 7–9 changes per day. Dirty nappies occur most frequently in the morning (6–10 am).
```

**Output (no data)**
```
Not enough data to identify patterns for the past 7 days. Try logging consistently for at least 3 days.
```

**Output (AI unavailable)**
```
Pattern analysis is temporarily unavailable. Raw data is still accessible via get_events.
```
