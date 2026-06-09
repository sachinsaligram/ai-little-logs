import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, isNull, gte, lte, and, desc } from "drizzle-orm";
import { ulid } from "ulidx";
import Anthropic from "@anthropic-ai/sdk";
import * as schema from "../db/schema";

// Initialize DB directly (not via the shared db module, to load env vars from process)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

function newId(): string {
  return ulid();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getBabyId(): Promise<string | null> {
  const rows = await db.select({ id: schema.babies.id }).from(schema.babies).limit(1);
  return rows.length ? rows[0].id : null;
}

function formatDuration(min: number | null): string {
  if (!min) return "unknown duration";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} hours ${m} minutes` : `${m} minutes`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleLogSleep(args: Record<string, unknown>): Promise<string> {
  const action = args.action as string;
  if (!action || !["start", "end"].includes(action)) {
    return "Error: action must be 'start' or 'end'";
  }

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found. Set up via the web app first.";

  if (action === "start") {
    // Check for open session
    const open = await db
      .select({ id: schema.sleep_logs.id, started_at: schema.sleep_logs.started_at })
      .from(schema.sleep_logs)
      .where(and(eq(schema.sleep_logs.baby_id, babyId), isNull(schema.sleep_logs.ended_at)))
      .limit(1);

    if (open.length > 0) {
      return `Error: An open sleep session already exists (started at ${formatTime(open[0].started_at)}). Use action=end to close it first.`;
    }

    const startedAt = (args.started_at as string) ?? new Date().toISOString();
    const id = newId();
    await db.insert(schema.sleep_logs).values({
      id,
      baby_id: babyId,
      started_at: startedAt,
      ended_at: null,
      duration_min: null,
      location: (args.location as string) ?? null,
      quality: (args.quality as number) ?? null,
      notes: (args.notes as string) ?? null,
    });
    return `Started sleep session at ${formatTime(startedAt)}. Session ID: ${id}`;
  }

  // action === "end"
  const open = await db
    .select()
    .from(schema.sleep_logs)
    .where(and(eq(schema.sleep_logs.baby_id, babyId), isNull(schema.sleep_logs.ended_at)))
    .limit(1);

  if (!open.length) {
    return "Error: No open sleep session found. Use action=start to begin one.";
  }

  const session = open[0];
  const endedAt = (args.ended_at as string) ?? new Date().toISOString();
  const durationMin = Math.round(
    (new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 60000
  );

  const updates: Record<string, unknown> = {
    ended_at: endedAt,
    duration_min: durationMin,
  };
  if (args.location) updates.location = args.location;
  if (args.quality) updates.quality = args.quality;
  if (args.notes) updates.notes = args.notes;

  await db.update(schema.sleep_logs).set(updates).where(eq(schema.sleep_logs.id, session.id));
  return `Ended sleep session. Duration: ${formatDuration(durationMin)}. Session ID: ${session.id}`;
}

async function handleLogFeed(args: Record<string, unknown>): Promise<string> {
  const feedType = args.type as string;
  if (!feedType || !["breast", "bottle", "solid"].includes(feedType)) {
    return "Error: type must be 'breast', 'bottle', or 'solid'";
  }

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found.";

  const startedAt = (args.started_at as string) ?? new Date().toISOString();
  const id = newId();

  await db.insert(schema.feed_logs).values({
    id,
    baby_id: babyId,
    started_at: startedAt,
    ended_at: (args.ended_at as string) ?? null,
    type: feedType,
    side: feedType === "breast" ? ((args.side as string) ?? null) : null,
    amount_ml: feedType === "bottle" ? ((args.amount_ml as number) ?? null) : null,
    notes: (args.notes as string) ?? null,
  });

  const detail =
    feedType === "breast" && args.side
      ? ` (${args.side === "L" ? "left" : args.side === "R" ? "right" : "both"} side)`
      : feedType === "bottle" && args.amount_ml
      ? `: ${args.amount_ml} ml`
      : "";
  return `Logged ${feedType} feed${detail} starting at ${formatTime(startedAt)}. ID: ${id}`;
}

async function handleLogNappy(args: Record<string, unknown>): Promise<string> {
  const nappyType = args.type as string;
  if (!nappyType || !["wet", "dirty", "both", "dry"].includes(nappyType)) {
    return "Error: type must be 'wet', 'dirty', 'both', or 'dry'";
  }

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found.";

  const loggedAt = (args.logged_at as string) ?? new Date().toISOString();
  const id = newId();

  await db.insert(schema.nappy_logs).values({
    id,
    baby_id: babyId,
    logged_at: loggedAt,
    type: nappyType,
    colour: (args.colour as string) ?? null,
    consistency: (args.consistency as string) ?? null,
    concern_flag: args.concern_flag ? 1 : 0,
    notes: (args.notes as string) ?? null,
  });

  return `Logged ${nappyType} nappy at ${formatTime(loggedAt)}. ID: ${id}`;
}

async function handleGetSummary(args: Record<string, unknown>): Promise<string> {
  const period = args.period as string;
  if (!period || !["day", "week"].includes(period)) {
    return "Error: period must be 'day' or 'week'";
  }

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found.";

  const anchor = args.date ? new Date(args.date as string) : new Date();
  const hours = period === "day" ? 24 : 168;
  const since = new Date(anchor.getTime() - hours * 3600000).toISOString();
  const dateStr = anchor.toISOString().slice(0, 10);

  const [sleepRows, feedRows, nappyRows] = await Promise.all([
    db
      .select({ started_at: schema.sleep_logs.started_at, ended_at: schema.sleep_logs.ended_at, duration_min: schema.sleep_logs.duration_min })
      .from(schema.sleep_logs)
      .where(and(eq(schema.sleep_logs.baby_id, babyId), gte(schema.sleep_logs.started_at, since))),
    db
      .select({ type: schema.feed_logs.type })
      .from(schema.feed_logs)
      .where(and(eq(schema.feed_logs.baby_id, babyId), gte(schema.feed_logs.started_at, since))),
    db
      .select({ type: schema.nappy_logs.type })
      .from(schema.nappy_logs)
      .where(and(eq(schema.nappy_logs.baby_id, babyId), gte(schema.nappy_logs.logged_at, since))),
  ]);

  const totalSleepMin = sleepRows
    .filter((s) => s.duration_min)
    .reduce((acc, s) => acc + (s.duration_min ?? 0), 0);
  const sleepSessionCount = sleepRows.length;
  const breastFeeds = feedRows.filter((f) => f.type === "breast").length;
  const bottleFeeds = feedRows.filter((f) => f.type === "bottle").length;
  const solidFeeds = feedRows.filter((f) => f.type === "solid").length;
  const wetNappies = nappyRows.filter((n) => n.type === "wet").length;
  const dirtyNappies = nappyRows.filter((n) => n.type === "dirty").length;
  const bothNappies = nappyRows.filter((n) => n.type === "both").length;

  const label = period === "day" ? `${dateStr} (past 24 hours)` : `week ending ${dateStr}`;

  return `Summary for ${label}:
• Sleep: ${formatDuration(totalSleepMin)} across ${sleepSessionCount} session${sleepSessionCount !== 1 ? "s" : ""}
• Feeds: ${feedRows.length} total (${breastFeeds} breast, ${bottleFeeds} bottle, ${solidFeeds} solid)
• Nappies: ${nappyRows.length} changes (${wetNappies} wet, ${dirtyNappies} dirty, ${bothNappies} both)`;
}

async function handleGetEvents(args: Record<string, unknown>): Promise<string> {
  const eventType = args.type as string;
  const from = args.from as string;
  if (!eventType || !["sleep", "feed", "nappy", "all"].includes(eventType)) {
    return "Error: type must be 'sleep', 'feed', 'nappy', or 'all'";
  }
  if (!from) return "Error: from is required";

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found.";

  const to = (args.to as string) ?? new Date().toISOString();
  const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));

  const lines: string[] = [];

  if (eventType === "sleep" || eventType === "all") {
    const rows = await db
      .select()
      .from(schema.sleep_logs)
      .where(and(eq(schema.sleep_logs.baby_id, babyId), gte(schema.sleep_logs.started_at, from), lte(schema.sleep_logs.started_at, to)))
      .orderBy(desc(schema.sleep_logs.started_at))
      .limit(limit);
    rows.forEach((r) => {
      const end = r.ended_at ? ` -> ${r.ended_at.slice(0, 16).replace("T", " ")}` : " -> in progress";
      const dur = r.duration_min ? ` · ${formatDuration(r.duration_min)}` : "";
      lines.push(`[sleep] ${r.started_at.slice(0, 16).replace("T", " ")}${end}${dur}${r.location ? " · " + r.location : ""}${r.quality ? " · quality " + r.quality : ""}`);
    });
  }

  if (eventType === "feed" || eventType === "all") {
    const rows = await db
      .select()
      .from(schema.feed_logs)
      .where(and(eq(schema.feed_logs.baby_id, babyId), gte(schema.feed_logs.started_at, from), lte(schema.feed_logs.started_at, to)))
      .orderBy(desc(schema.feed_logs.started_at))
      .limit(limit);
    rows.forEach((r) => {
      const detail = r.side ? ` (${r.side})` : r.amount_ml ? ` ${r.amount_ml}ml` : "";
      lines.push(`[feed] ${r.started_at.slice(0, 16).replace("T", " ")} · ${r.type}${detail}`);
    });
  }

  if (eventType === "nappy" || eventType === "all") {
    const rows = await db
      .select()
      .from(schema.nappy_logs)
      .where(and(eq(schema.nappy_logs.baby_id, babyId), gte(schema.nappy_logs.logged_at, from), lte(schema.nappy_logs.logged_at, to)))
      .orderBy(desc(schema.nappy_logs.logged_at))
      .limit(limit);
    rows.forEach((r) => {
      const concern = r.concern_flag ? " [!]" : "";
      lines.push(`[nappy] ${r.logged_at.slice(0, 16).replace("T", " ")} · ${r.type}${concern}${r.colour ? " · " + r.colour : ""}`);
    });
  }

  if (!lines.length) return `No ${eventType} events found between ${from} and ${to}`;

  lines.sort();
  lines.reverse();
  const shown = lines.slice(0, limit);
  return `${eventType === "all" ? "All" : eventType.charAt(0).toUpperCase() + eventType.slice(1)} events from ${from.slice(0, 10)} to ${to.slice(0, 10)} (${shown.length} records):\n${shown.map((l, i) => `${i + 1}. ${l}`).join("\n")}`;
}

async function handleAnalyzePatterns(args: Record<string, unknown>): Promise<string> {
  const days = Math.min(30, Math.max(1, Number(args.days) || 7));
  const focus = (args.focus as string) ?? "all";

  const babyId = await getBabyId();
  if (!babyId) return "Error: No baby profile found.";

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [sleepRows, feedRows, nappyRows] = await Promise.all([
    db.select({ started_at: schema.sleep_logs.started_at, duration_min: schema.sleep_logs.duration_min, quality: schema.sleep_logs.quality })
      .from(schema.sleep_logs)
      .where(and(eq(schema.sleep_logs.baby_id, babyId), gte(schema.sleep_logs.started_at, sinceISO))),
    db.select({ started_at: schema.feed_logs.started_at, type: schema.feed_logs.type, amount_ml: schema.feed_logs.amount_ml })
      .from(schema.feed_logs)
      .where(and(eq(schema.feed_logs.baby_id, babyId), gte(schema.feed_logs.started_at, sinceISO))),
    db.select({ logged_at: schema.nappy_logs.logged_at, type: schema.nappy_logs.type, concern_flag: schema.nappy_logs.concern_flag })
      .from(schema.nappy_logs)
      .where(and(eq(schema.nappy_logs.baby_id, babyId), gte(schema.nappy_logs.logged_at, sinceISO))),
  ]);

  const total = sleepRows.length + feedRows.length + nappyRows.length;
  if (total === 0) {
    return `Not enough data to identify patterns for the past ${days} days. Try logging consistently for at least 3 days.`;
  }

  const prompt = `Analyze ${days} days of baby tracking data and identify patterns.
Focus: ${focus}

Sleep (${sleepRows.length} sessions):
${sleepRows.slice(0, 30).map((s) => `  ${s.started_at.slice(0, 16)}: ${s.duration_min ? s.duration_min + "min" : "in progress"}${s.quality ? " quality:" + s.quality : ""}`).join("\n")}

Feeds (${feedRows.length} total):
- breast: ${feedRows.filter((f) => f.type === "breast").length}, bottle: ${feedRows.filter((f) => f.type === "bottle").length}, solid: ${feedRows.filter((f) => f.type === "solid").length}
${feedRows.slice(0, 30).map((f) => `  ${f.started_at.slice(0, 16)}: ${f.type}${f.amount_ml ? " " + f.amount_ml + "ml" : ""}`).join("\n")}

Nappies (${nappyRows.length} total):
- wet: ${nappyRows.filter((n) => n.type === "wet").length}, dirty: ${nappyRows.filter((n) => n.type === "dirty").length}, both: ${nappyRows.filter((n) => n.type === "both").length}

Provide a concise plain-text pattern analysis. Note any timing patterns, frequency patterns, or correlations you observe.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "Unable to generate analysis.";
    return `Pattern analysis for the past ${days} days:\n\n${text}`;
  } catch {
    return "Pattern analysis is temporarily unavailable. Raw data is still accessible via get_events.";
  }
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "little-logs", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "log_sleep",
      description: "Start or end a sleep session",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["start", "end"], description: "Start a new session or end the current open one" },
          started_at: { type: "string", description: "ISO 8601 UTC. Required for start. Defaults to now." },
          ended_at: { type: "string", description: "ISO 8601 UTC. Required for end if not using current time." },
          location: { type: "string", description: "Optional. e.g. 'cot', 'pram'" },
          quality: { type: "integer", minimum: 1, maximum: 5 },
          notes: { type: "string" },
        },
        required: ["action"],
      },
    },
    {
      name: "log_feed",
      description: "Log a feeding event",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["breast", "bottle", "solid"] },
          started_at: { type: "string", description: "ISO 8601 UTC. Defaults to now." },
          ended_at: { type: "string" },
          side: { type: "string", enum: ["L", "R", "both"], description: "For breast feeds" },
          amount_ml: { type: "integer", minimum: 1, description: "For bottle feeds" },
          notes: { type: "string" },
        },
        required: ["type"],
      },
    },
    {
      name: "log_nappy",
      description: "Log a nappy change",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["wet", "dirty", "both", "dry"] },
          logged_at: { type: "string", description: "ISO 8601 UTC. Defaults to now." },
          colour: { type: "string" },
          consistency: { type: "string" },
          concern_flag: { type: "boolean" },
          notes: { type: "string" },
        },
        required: ["type"],
      },
    },
    {
      name: "get_summary",
      description: "Get a daily or weekly summary of all event types",
      inputSchema: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["day", "week"] },
          date: { type: "string", description: "ISO 8601 date anchor. Defaults to today." },
        },
        required: ["period"],
      },
    },
    {
      name: "get_events",
      description: "Query raw log entries by type and date range",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["sleep", "feed", "nappy", "all"] },
          from: { type: "string", description: "ISO 8601. Start of range. Required." },
          to: { type: "string", description: "ISO 8601. End of range. Defaults to now." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Default 20." },
        },
        required: ["type", "from"],
      },
    },
    {
      name: "analyze_patterns",
      description: "AI-powered pattern analysis over a configurable number of days",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 30, description: "Days to analyse. Default 7." },
          focus: { type: "string", enum: ["sleep", "feed", "nappy", "all"], description: "Default 'all'." },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = (args ?? {}) as Record<string, unknown>;

  let result: string;
  switch (name) {
    case "log_sleep":        result = await handleLogSleep(toolArgs); break;
    case "log_feed":         result = await handleLogFeed(toolArgs); break;
    case "log_nappy":        result = await handleLogNappy(toolArgs); break;
    case "get_summary":      result = await handleGetSummary(toolArgs); break;
    case "get_events":       result = await handleGetEvents(toolArgs); break;
    case "analyze_patterns": result = await handleAnalyzePatterns(toolArgs); break;
    default:                 result = `Unknown tool: ${name}`;
  }

  return {
    content: [{ type: "text", text: result }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
