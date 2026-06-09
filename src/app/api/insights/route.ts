import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies, sleep_logs, feed_logs, diaper_logs } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { generateInsights } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const days = Math.min(30, Math.max(1, Number(body.days) || 7));

  // Check if there's any data
  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return new NextResponse(null, { status: 204 });
  }
  const babyId = babyRows[0].id;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [sleepCount, feedCount, diaperCount] = await Promise.all([
    db.select({ id: sleep_logs.id }).from(sleep_logs)
      .where(and(eq(sleep_logs.baby_id, babyId), gte(sleep_logs.started_at, sinceISO))),
    db.select({ id: feed_logs.id }).from(feed_logs)
      .where(and(eq(feed_logs.baby_id, babyId), gte(feed_logs.started_at, sinceISO))),
    db.select({ id: diaper_logs.id }).from(diaper_logs)
      .where(and(eq(diaper_logs.baby_id, babyId), gte(diaper_logs.logged_at, sinceISO))),
  ]);

  const total = sleepCount.length + feedCount.length + diaperCount.length;
  if (total === 0) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const result = await generateInsights(days);
    return NextResponse.json({
      ...result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Insights generation failed:", err);
    return NextResponse.json(
      { error: "ai_unavailable", message: "AI insights are temporarily unavailable." },
      { status: 503 }
    );
  }
}
