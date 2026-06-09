import {
  sqliteTable,
  text,
  integer,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const babies = sqliteTable("babies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date_of_birth: text("date_of_birth").notNull(),
  created_at: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});

export const sleep_logs = sqliteTable(
  "sleep_logs",
  {
    id: text("id").primaryKey(),
    baby_id: text("baby_id")
      .notNull()
      .references(() => babies.id),
    started_at: text("started_at").notNull(),
    ended_at: text("ended_at"),
    duration_min: integer("duration_min"),
    location: text("location"),
    quality: integer("quality"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("idx_sleep_baby_started").on(table.baby_id, table.started_at),
    index("idx_sleep_open").on(table.baby_id, table.ended_at),
    check("quality_range", sql`${table.quality} IS NULL OR (${table.quality} >= 1 AND ${table.quality} <= 5)`),
  ]
);

export const feed_logs = sqliteTable(
  "feed_logs",
  {
    id: text("id").primaryKey(),
    baby_id: text("baby_id")
      .notNull()
      .references(() => babies.id),
    started_at: text("started_at").notNull(),
    ended_at: text("ended_at"),
    type: text("type").notNull(),
    side: text("side"),
    amount_ml: integer("amount_ml"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("idx_feed_baby_started").on(table.baby_id, table.started_at),
    check("feed_type_check", sql`${table.type} IN ('breast','bottle','solid')`),
    check("feed_side_check", sql`${table.side} IS NULL OR ${table.side} IN ('L','R','both')`),
  ]
);

export const nappy_logs = sqliteTable(
  "nappy_logs",
  {
    id: text("id").primaryKey(),
    baby_id: text("baby_id")
      .notNull()
      .references(() => babies.id),
    logged_at: text("logged_at").notNull(),
    type: text("type").notNull(),
    colour: text("colour"),
    consistency: text("consistency"),
    concern_flag: integer("concern_flag").notNull().default(0),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("idx_nappy_baby_logged").on(table.baby_id, table.logged_at),
    check("nappy_type_check", sql`${table.type} IN ('wet','dirty','both','dry')`),
    check("concern_flag_check", sql`${table.concern_flag} IN (0,1)`),
  ]
);
