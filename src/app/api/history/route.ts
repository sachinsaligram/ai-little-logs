import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies, sleep_logs, feed_logs, nappy_logs } from "@/db/schema";
import { eq, gte, lte, gt, and } from "drizzle-orm";

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? sevenDaysAgo();
  const to = searchParams.get("to") ?? new Date().toISOString();
  const type = searchParams.get("type") ?? "all";
  const limitParam = parseInt(searchParams.get("limit") ?? "50");
  const limit = Math.min(100, Math.max(1, isNaN(limitParam) ? 50 : limitParam));
  const cursor = searchParams.get("cursor");

  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return NextResponse.json({ items: [], next_cursor: null });
  }
  const babyId = babyRows[0].id;

  type EventItem = {
    type: "sleep" | "feed" | "nappy";
    id: string;
    event_time: string;
    [key: string]: unknown;
  };

  const items: EventItem[] = [];

  if (type === "sleep" || type === "all") {
    const conditions = [
      eq(sleep_logs.baby_id, babyId),
      gte(sleep_logs.started_at, from),
      lte(sleep_logs.started_at, to),
    ];
    if (cursor) conditions.push(gt(sleep_logs.id, cursor));
    const rows = await db
      .select()
      .from(sleep_logs)
      .where(and(...conditions))
      .limit(limit);
    rows.forEach((r) =>
      items.push({ ...r, type: "sleep", event_time: r.started_at })
    );
  }

  if (type === "feed" || type === "all") {
    const conditions = [
      eq(feed_logs.baby_id, babyId),
      gte(feed_logs.started_at, from),
      lte(feed_logs.started_at, to),
    ];
    if (cursor) conditions.push(gt(feed_logs.id, cursor));
    const rows = await db
      .select()
      .from(feed_logs)
      .where(and(...conditions))
      .limit(limit);
    rows.forEach((r) =>
      items.push({ ...r, type: "feed", event_time: r.started_at })
    );
  }

  if (type === "nappy" || type === "all") {
    const conditions = [
      eq(nappy_logs.baby_id, babyId),
      gte(nappy_logs.logged_at, from),
      lte(nappy_logs.logged_at, to),
    ];
    if (cursor) conditions.push(gt(nappy_logs.id, cursor));
    const rows = await db
      .select()
      .from(nappy_logs)
      .where(and(...conditions))
      .limit(limit);
    rows.forEach((r) =>
      items.push({ ...r, type: "nappy", event_time: r.logged_at })
    );
  }

  // Sort descending by event_time
  items.sort((a, b) => b.event_time.localeCompare(a.event_time));

  // Apply limit
  const paged = items.slice(0, limit);
  const next_cursor = paged.length === limit ? paged[paged.length - 1].id : null;

  return NextResponse.json({ items: paged, next_cursor });
}
