import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/index";
import { babies, sleep_logs, feed_logs, nappy_logs } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const days = Math.min(30, Math.max(1, Number(body.days) || 7));

  if (messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }

  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) {
    return NextResponse.json({ error: "no_baby" }, { status: 404 });
  }
  const babyId = babyRows[0].id;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [sleepData, feedData, nappyData] = await Promise.all([
    db.select({
      started_at: sleep_logs.started_at,
      ended_at: sleep_logs.ended_at,
      duration_min: sleep_logs.duration_min,
      location: sleep_logs.location,
      quality: sleep_logs.quality,
    }).from(sleep_logs).where(and(eq(sleep_logs.baby_id, babyId), gte(sleep_logs.started_at, sinceISO))),
    db.select({
      started_at: feed_logs.started_at,
      type: feed_logs.type,
      side: feed_logs.side,
      amount_ml: feed_logs.amount_ml,
    }).from(feed_logs).where(and(eq(feed_logs.baby_id, babyId), gte(feed_logs.started_at, sinceISO))),
    db.select({
      logged_at: nappy_logs.logged_at,
      type: nappy_logs.type,
      concern_flag: nappy_logs.concern_flag,
    }).from(nappy_logs).where(and(eq(nappy_logs.baby_id, babyId), gte(nappy_logs.logged_at, sinceISO))),
  ]);

  const totalSleepMin = sleepData
    .filter((s) => s.duration_min)
    .reduce((acc, s) => acc + (s.duration_min ?? 0), 0);

  const systemPrompt = `You are a helpful assistant for a baby tracking app called Little Logs.
You have access to the last ${days} days of tracking data for this baby. Answer questions about patterns, routines, and trends based on the data below.
Be concise and friendly. If asked something outside the data (e.g. medical advice), politely decline and suggest consulting a healthcare professional.

DATA SNAPSHOT (last ${days} days):

SLEEP — ${sleepData.length} sessions, ${Math.round((totalSleepMin / 60) * 10) / 10} total hours:
${sleepData.slice(0, 30).map((s) => `  ${s.started_at}: ${s.duration_min ? s.duration_min + "min" : "in progress"}, quality: ${s.quality ?? "n/a"}, location: ${s.location ?? "n/a"}`).join("\n") || "  No sleep logged"}

FEEDS — ${feedData.length} total:
${feedData.slice(0, 30).map((f) => `  ${f.started_at}: ${f.type}${f.side ? " (" + f.side + ")" : ""}${f.amount_ml ? " " + f.amount_ml + "ml" : ""}`).join("\n") || "  No feeds logged"}

NAPPIES — ${nappyData.length} total:
${nappyData.slice(0, 30).map((n) => `  ${n.logged_at}: ${n.type}${n.concern_flag ? " ⚠️" : ""}`).join("\n") || "  No nappies logged"}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "ai_unavailable", message: "Chat is temporarily unavailable." },
      { status: 503 }
    );
  }
}
