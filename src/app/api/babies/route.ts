import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { babies } from "@/db/schema";
import { newId } from "@/lib/ulid";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }
  if (!body.date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth)) {
    return NextResponse.json({ error: "date_of_birth must be YYYY-MM-DD" }, { status: 422 });
  }

  // Return 409 if a baby already exists
  const existing = await db.select({ id: babies.id }).from(babies).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "baby_already_exists" }, { status: 409 });
  }

  const id = newId();
  await db.insert(babies).values({
    id,
    name: body.name.trim(),
    date_of_birth: body.date_of_birth,
  });

  return NextResponse.json({ id }, { status: 201 });
}
