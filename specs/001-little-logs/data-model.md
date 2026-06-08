# Data Model: Little Logs

## Tables

### `babies`

Scaffolded for future multi-baby support. Single row in v1 (inserted at setup time or on first sign-in).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | ULID |
| `name` | TEXT | NOT NULL | Baby's display name |
| `date_of_birth` | TEXT | NOT NULL | ISO 8601 date (YYYY-MM-DD) |
| `created_at` | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

---

### `sleep_logs`

One row per sleep session. A session is "open" when `ended_at` is NULL.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | ULID |
| `baby_id` | TEXT | NOT NULL, FK → babies.id | |
| `started_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |
| `ended_at` | TEXT | NULLABLE | ISO 8601 UTC; NULL = session in progress |
| `duration_min` | INTEGER | NULLABLE | Computed on close: `(ended_at - started_at)` in minutes |
| `location` | TEXT | NULLABLE | Free text (e.g., "cot", "pram", "arms") |
| `quality` | INTEGER | NULLABLE, CHECK 1–5 | Parent-rated sleep quality |
| `notes` | TEXT | NULLABLE | Free text |
| `created_at` | TEXT | NOT NULL, DEFAULT now | ISO 8601 UTC |

**Constraints**:
- At most one open sleep session per `baby_id` at a time (enforced at application layer).
- `ended_at` MUST be after `started_at` when provided.
- `duration_min` MUST be set when `ended_at` is set; MUST be NULL when `ended_at` is NULL.

**State transitions**:
```
[created: ended_at=NULL] → close(ended_at, duration_min) → [closed: ended_at≠NULL]
```

---

### `feed_logs`

One row per feeding event.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | ULID |
| `baby_id` | TEXT | NOT NULL, FK → babies.id | |
| `started_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |
| `ended_at` | TEXT | NULLABLE | ISO 8601 UTC |
| `type` | TEXT | NOT NULL, CHECK IN ('breast','bottle','solid') | Feed type |
| `side` | TEXT | NULLABLE, CHECK IN ('L','R','both') | Breast feeds only |
| `amount_ml` | INTEGER | NULLABLE | Bottle feeds only; positive integer |
| `notes` | TEXT | NULLABLE | Free text |
| `created_at` | TEXT | NOT NULL, DEFAULT now | ISO 8601 UTC |

**Constraints**:
- `side` MUST be NULL when `type` ≠ `'breast'`.
- `amount_ml` MUST be NULL when `type` ≠ `'bottle'`.
- `ended_at` MUST be after `started_at` when provided.

---

### `nappy_logs`

One row per nappy change.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | ULID |
| `baby_id` | TEXT | NOT NULL, FK → babies.id | |
| `logged_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |
| `type` | TEXT | NOT NULL, CHECK IN ('wet','dirty','both','dry') | Change type |
| `colour` | TEXT | NULLABLE | Free text (e.g., "yellow", "green") |
| `consistency` | TEXT | NULLABLE | Free text (e.g., "runny", "formed") |
| `concern_flag` | INTEGER | NOT NULL, DEFAULT 0, CHECK IN (0,1) | Boolean; 1 = flagged |
| `notes` | TEXT | NULLABLE | Free text |
| `created_at` | TEXT | NOT NULL, DEFAULT now | ISO 8601 UTC |

---

## Drizzle Schema Summary

All columns typed as TEXT for timestamps (SQLite has no native timestamp type). All IDs generated with `ulidx` before insert. Foreign keys enforced via `PRAGMA foreign_keys = ON` (set on connection open).

```ts
// Pseudocode — implementation in src/db/schema.ts
babies         → id, name, date_of_birth, created_at
sleep_logs     → id, baby_id, started_at, ended_at, duration_min, location, quality, notes, created_at
feed_logs      → id, baby_id, started_at, ended_at, type, side, amount_ml, notes, created_at
nappy_logs     → id, baby_id, logged_at, type, colour, consistency, concern_flag, notes, created_at
```

## Indexes

```sql
-- Query by baby + time range (primary access pattern for all three tables)
CREATE INDEX idx_sleep_baby_started  ON sleep_logs(baby_id, started_at DESC);
CREATE INDEX idx_feed_baby_started   ON feed_logs(baby_id, started_at DESC);
CREATE INDEX idx_nappy_baby_logged   ON nappy_logs(baby_id, logged_at DESC);

-- Open sleep session lookup (checked on every log-sleep call)
CREATE INDEX idx_sleep_open ON sleep_logs(baby_id, ended_at) WHERE ended_at IS NULL;
```

## Notes

- No `users` table. Auth identity is the whitelisted email in `NEXTAUTH_EMAIL` env var.
- `baby_id` is hardcoded to the single baby's ULID for all v1 queries. Multi-baby UI is out of scope.
- All timestamp comparisons use lexicographic ordering on ISO 8601 strings (safe because format is fixed-width and UTC-normalised).
