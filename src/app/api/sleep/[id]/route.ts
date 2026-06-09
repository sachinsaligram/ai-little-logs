import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { sleep_logs } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // At least one field required
  if (!body.ended_at && !body.location && !body.quality && !body.notes) {
    return NextResponse.json({ error: "at least one field required" }, { status: 422 });
  }

  // Find the open session
  const rows = await db
    .select()
    .from(sleep_logs)
    .where(and(eq(sleep_logs.id, id), isNull(sleep_logs.ended_at)))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "session not found or already closed" }, { status: 404 });
  }

  const session = rows[0];
  const updates: Partial<typeof session> = {};

  if (body.location !== undefined) updates.location = body.location;
  if (body.quality !== undefined) updates.quality = body.quality;
  if (body.notes !== undefined) updates.notes = body.notes;

  let duration_min: number | null = session.duration_min;

  if (body.ended_at) {
    const start = new Date(session.started_at).getTime();
    const end = new Date(body.ended_at).getTime();
    if (end <= start) {
      return NextResponse.json({ error: "ended_at must be after started_at" }, { status: 422 });
    }
    duration_min = Math.round((end - start) / 60000);
    updates.ended_at = body.ended_at;
    updates.duration_min = duration_min;
  }

  await db.update(sleep_logs).set(updates).where(eq(sleep_logs.id, id));

  return NextResponse.json({ id, duration_min });
}
