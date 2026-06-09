import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies, feed_logs } from "@/db/schema";
import { newId } from "@/lib/ulid";

const FEED_TYPES = ["breast", "bottle", "solid"] as const;
const SIDES = ["L", "R", "both"] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.started_at) {
    return NextResponse.json({ error: "started_at is required" }, { status: 422 });
  }
  if (!body.type || !FEED_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "type must be breast, bottle, or solid" }, { status: 422 });
  }
  if (body.side !== undefined && body.type !== "breast") {
    return NextResponse.json({ error: "side is only valid for breast feeds" }, { status: 422 });
  }
  if (body.amount_ml !== undefined && body.type !== "bottle") {
    return NextResponse.json({ error: "amount_ml is only valid for bottle feeds" }, { status: 422 });
  }
  if (body.side && !SIDES.includes(body.side)) {
    return NextResponse.json({ error: "side must be L, R, or both" }, { status: 422 });
  }
  if (body.amount_ml !== undefined && (!Number.isInteger(body.amount_ml) || body.amount_ml <= 0)) {
    return NextResponse.json({ error: "amount_ml must be a positive integer" }, { status: 422 });
  }

  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return NextResponse.json({ error: "no_baby" }, { status: 404 });
  }
  const babyId = babyRows[0].id;

  const id = newId();
  await db.insert(feed_logs).values({
    id,
    baby_id: babyId,
    started_at: body.started_at,
    ended_at: body.ended_at ?? null,
    type: body.type,
    side: body.side ?? null,
    amount_ml: body.amount_ml ?? null,
    notes: body.notes ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
