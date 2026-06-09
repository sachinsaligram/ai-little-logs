import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/index";
import { babies, sleep_logs, feed_logs, diaper_logs } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface InsightsResult {
  summary: string;
  patterns: string[];
}

export async function generateInsights(days: number): Promise<InsightsResult> {
  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  if (!babyRows.length) throw new Error("no_baby");
  const babyId = babyRows[0].id;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  // Fetch aggregated data (no free-text notes for privacy)
  const [sleepData, feedData, diaperData] = await Promise.all([
    db
      .select({
        started_at: sleep_logs.started_at,
        ended_at: sleep_logs.ended_at,
        duration_min: sleep_logs.duration_min,
        location: sleep_logs.location,
        quality: sleep_logs.quality,
      })
      .from(sleep_logs)
      .where(and(eq(sleep_logs.baby_id, babyId), gte(sleep_logs.started_at, sinceISO))),
    db
      .select({
        started_at: feed_logs.started_at,
        type: feed_logs.type,
        side: feed_logs.side,
        amount_ml: feed_logs.amount_ml,
      })
      .from(feed_logs)
      .where(and(eq(feed_logs.baby_id, babyId), gte(feed_logs.started_at, sinceISO))),
    db
      .select({
        logged_at: diaper_logs.logged_at,
        type: diaper_logs.type,
        concern_flag: diaper_logs.concern_flag,
      })
      .from(diaper_logs)
      .where(and(eq(diaper_logs.baby_id, babyId), gte(diaper_logs.logged_at, sinceISO))),
  ]);

  const totalSleepMin = sleepData
    .filter((s) => s.duration_min)
    .reduce((acc, s) => acc + (s.duration_min ?? 0), 0);

  const feedCounts = {
    breast: feedData.filter((f) => f.type === "breast").length,
    bottle: feedData.filter((f) => f.type === "bottle").length,
    solid: feedData.filter((f) => f.type === "solid").length,
  };

  const diaperCounts = {
    wet: diaperData.filter((n) => n.type === "wet").length,
    dirty: diaperData.filter((n) => n.type === "dirty").length,
    both: diaperData.filter((n) => n.type === "both").length,
    dry: diaperData.filter((n) => n.type === "dry").length,
    concerns: diaperData.filter((n) => n.concern_flag === 1).length,
  };

  const prompt = `You are analyzing ${days} days of baby tracking data. Here is the aggregated data:

SLEEP (${sleepData.length} sessions, ${Math.round(totalSleepMin / 60 * 10) / 10} total hours):
${sleepData.map((s) => `- Started: ${s.started_at}, Duration: ${s.duration_min ? s.duration_min + "min" : "in progress"}, Quality: ${s.quality ?? "n/a"}`).join("\n") || "No sleep logged"}

FEEDS (${feedData.length} total):
- Breast: ${feedCounts.breast}, Bottle: ${feedCounts.bottle}, Solid: ${feedCounts.solid}
${feedData.slice(0, 20).map((f) => `- ${f.started_at}: ${f.type}${f.side ? " (" + f.side + ")" : ""}${f.amount_ml ? " " + f.amount_ml + "ml" : ""}`).join("\n") || "No feeds logged"}

DIAPERS (${diaperData.length} total):
- Wet: ${diaperCounts.wet}, Poop: ${diaperCounts.dirty}, Both: ${diaperCounts.both}, Dry: ${diaperCounts.dry}, Concerns: ${diaperCounts.concerns}

Based on this data, provide:
1. A concise 2-3 sentence summary of the baby's routine over the past ${days} days
2. 2-4 specific patterns you notice (e.g. sleep timing, feed frequency, diaper trends)

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "patterns": ["...", "...", "..."]
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary ?? "Unable to generate summary.",
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
    };
  } catch {
    return {
      summary: text.slice(0, 300),
      patterns: [],
    };
  }
}
