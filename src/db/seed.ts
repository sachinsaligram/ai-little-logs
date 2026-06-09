import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { ulid } from "ulidx";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

function id() {
  return ulid();
}

function daysAgo(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function seed() {
  // ── Baby ──────────────────────────────────────────────────────────────────
  const babyId = id();
  await db.insert(schema.babies).values({
    id: babyId,
    name: "Mia",
    date_of_birth: "2025-12-01",
  }).onConflictDoNothing();

  // ── 7 days of data ────────────────────────────────────────────────────────
  // Pattern: ~3 sleeps/day (night + 2 naps), ~7 feeds/day, ~6 nappies/day

  type SleepRow = typeof schema.sleep_logs.$inferInsert;
  type FeedRow = typeof schema.feed_logs.$inferInsert;
  type NappyRow = typeof schema.nappy_logs.$inferInsert;

  const sleeps: SleepRow[] = [];
  const feeds: FeedRow[] = [];
  const nappies: NappyRow[] = [];

  for (let day = 7; day >= 2; day--) {
    // ── Night sleep (previous evening → morning) ──────────────────────────
    const nightStart = daysAgo(day, 20, 30);           // 8:30 PM
    const nightEnd   = daysAgo(day - 1, 6, 15);        // 6:15 AM next day
    sleeps.push({
      id: id(), baby_id: babyId,
      started_at: nightStart, ended_at: nightEnd,
      duration_min: Math.round((new Date(nightEnd).getTime() - new Date(nightStart).getTime()) / 60000),
      location: "cot", quality: day % 3 === 0 ? 3 : 4,
    });

    // ── Morning nap ────────────────────────────────────────────────────────
    const napAStart = daysAgo(day - 1, 9, 0);
    const napAEnd   = daysAgo(day - 1, 9, 45);
    sleeps.push({
      id: id(), baby_id: babyId,
      started_at: napAStart, ended_at: napAEnd,
      duration_min: 45, location: "pram",
    });

    // ── Afternoon nap ──────────────────────────────────────────────────────
    const napBStart = daysAgo(day - 1, 13, 0);
    const napBEnd   = daysAgo(day - 1, 14, 30);
    sleeps.push({
      id: id(), baby_id: babyId,
      started_at: napBStart, ended_at: napBEnd,
      duration_min: 90, location: "cot", quality: 5,
    });

    // ── Feeds (7 per day) ─────────────────────────────────────────────────
    const feedTimes = [6, 9, 11, 13, 16, 19, 22];
    const feedTypes: Array<{ type: "breast" | "bottle" | "solid"; side?: "L" | "R" | "both"; amount_ml?: number }> = [
      { type: "breast", side: "L" },
      { type: "breast", side: "both" },
      { type: "solid" },
      { type: "breast", side: "R" },
      { type: "bottle", amount_ml: 120 },
      { type: "breast", side: "L" },
      { type: "breast", side: "both" },
    ];
    for (let i = 0; i < feedTimes.length; i++) {
      const { type, side, amount_ml } = feedTypes[i];
      feeds.push({
        id: id(), baby_id: babyId,
        started_at: daysAgo(day - 1, feedTimes[i]),
        ended_at: daysAgo(day - 1, feedTimes[i], 20),
        type, side, amount_ml,
      });
    }

    // ── Nappies (6 per day) ───────────────────────────────────────────────
    const nappyTimes = [7, 9, 11, 14, 17, 20];
    const nappyTypes: Array<{ type: "wet" | "dirty" | "both" | "dry"; colour?: string; concern_flag?: number }> = [
      { type: "wet" },
      { type: "dirty", colour: "yellow" },
      { type: "wet" },
      { type: "both", colour: "yellow" },
      { type: "wet" },
      { type: "wet" },
    ];
    // Flag one nappy mid-week as a concern for demo purposes
    if (day === 4) nappyTypes[3].concern_flag = 1;

    for (let i = 0; i < nappyTimes.length; i++) {
      const { type, colour, concern_flag } = nappyTypes[i];
      nappies.push({
        id: id(), baby_id: babyId,
        logged_at: daysAgo(day - 1, nappyTimes[i]),
        type, colour, concern_flag: concern_flag ?? 0,
      });
    }
  }

  await db.insert(schema.sleep_logs).values(sleeps).onConflictDoNothing();
  await db.insert(schema.feed_logs).values(feeds).onConflictDoNothing();
  await db.insert(schema.nappy_logs).values(nappies).onConflictDoNothing();

  console.log(`Seeded baby "${babyId}" (Mia) with:`);
  console.log(`  ${sleeps.length} sleep sessions`);
  console.log(`  ${feeds.length} feed events`);
  console.log(`  ${nappies.length} nappy changes`);
  console.log("Done.");
}

seed().catch((err) => { console.error(err); process.exit(1); });
