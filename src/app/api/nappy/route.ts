import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies, nappy_logs } from "@/db/schema";
import { newId } from "@/lib/ulid";

const NAPPY_TYPES = ["wet", "dirty", "both", "dry"] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.logged_at) {
    return NextResponse.json({ error: "logged_at is required" }, { status: 422 });
  }
  if (!body.type || !NAPPY_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "type must be wet, dirty, both, or dry" }, { status: 422 });
  }

  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return NextResponse.json({ error: "no_baby" }, { status: 404 });
  }
  const babyId = babyRows[0].id;

  const id = newId();
  await db.insert(nappy_logs).values({
    id,
    baby_id: babyId,
    logged_at: body.logged_at,
    type: body.type,
    colour: body.colour ?? null,
    consistency: body.consistency ?? null,
    concern_flag: body.concern_flag ? 1 : 0,
    notes: body.notes ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
