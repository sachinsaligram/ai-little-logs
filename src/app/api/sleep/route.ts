import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies, sleep_logs } from "@/db/schema";
import { newId } from "@/lib/ulid";
import { and, eq, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.started_at) {
    return NextResponse.json({ error: "started_at is required" }, { status: 422 });
  }

  // Get the single baby
  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return NextResponse.json({ error: "no_baby" }, { status: 404 });
  }
  const babyId = babyRows[0].id;

  // Check for open session
  const openSessions = await db
    .select({ id: sleep_logs.id })
    .from(sleep_logs)
    .where(and(eq(sleep_logs.baby_id, babyId), isNull(sleep_logs.ended_at)))
    .limit(1);

  if (openSessions.length > 0) {
    return NextResponse.json({ error: "open_session_exists" }, { status: 409 });
  }

  const id = newId();
  let duration_min: number | null = null;

  // Support creating a completed session if both times provided
  let ended_at: string | null = null;
  if (body.ended_at) {
    const start = new Date(body.started_at).getTime();
    const end = new Date(body.ended_at).getTime();
    if (end <= start) {
      return NextResponse.json({ error: "ended_at must be after started_at" }, { status: 422 });
    }
    ended_at = body.ended_at;
    duration_min = Math.round((end - start) / 60000);
  }

  await db.insert(sleep_logs).values({
    id,
    baby_id: babyId,
    started_at: body.started_at,
    ended_at,
    duration_min,
    location: body.location ?? null,
    quality: body.quality ?? null,
    notes: body.notes ?? null,
  });

  return NextResponse.json({ id, duration_min }, { status: 201 });
}
