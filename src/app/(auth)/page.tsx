"use server";

import { db } from "@/db";
import { babies, sleep_logs, feed_logs, diaper_logs } from "@/db/schema";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { handleSignOut } from "./actions";
import { LogSleepButton } from "@/components/LogSleepButton";
import { LogFeedSheetTrigger } from "@/components/LogFeedSheetTrigger";
import { LogDiaperSheetTrigger } from "@/components/LogDiaperSheetTrigger";
import { LocalTime } from "@/components/LocalTime";

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default async function HomePage() {
  const babyRows = await db.select({ id: babies.id, name: babies.name }).from(babies).limit(1);
  const baby = babyRows[0];

  let openSession: { id: string; started_at: string } | null = null;
  let recentSleep: { started_at: string; duration_min: number | null }[] = [];
  let recentFeed: { started_at: string; type: string; side: string | null }[] = [];
  let recentDiaper: { logged_at: string; type: string }[] = [];

  if (baby) {
    const [openResult, sleepResult, feedResult, diaperResult] = await Promise.all([
      db.select({ id: sleep_logs.id, started_at: sleep_logs.started_at })
        .from(sleep_logs)
        .where(and(eq(sleep_logs.baby_id, baby.id), isNull(sleep_logs.ended_at)))
        .limit(1),
      db.select({ started_at: sleep_logs.started_at, duration_min: sleep_logs.duration_min })
        .from(sleep_logs)
        .where(and(eq(sleep_logs.baby_id, baby.id), isNotNull(sleep_logs.ended_at)))
        .orderBy(desc(sleep_logs.started_at))
        .limit(5),
      db.select({ started_at: feed_logs.started_at, type: feed_logs.type, side: feed_logs.side })
        .from(feed_logs)
        .where(eq(feed_logs.baby_id, baby.id))
        .orderBy(desc(feed_logs.started_at))
        .limit(5),
      db.select({ logged_at: diaper_logs.logged_at, type: diaper_logs.type })
        .from(diaper_logs)
        .where(eq(diaper_logs.baby_id, baby.id))
        .orderBy(desc(diaper_logs.logged_at))
        .limit(5),
    ]);

    openSession = openResult[0] ?? null;
    recentSleep = sleepResult;
    recentFeed = feedResult;
    recentDiaper = diaperResult;
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const logRowStyle: React.CSSProperties = {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-secondary)",
    padding: "var(--space-2) 0",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    gap: "var(--space-2)",
  };

  return (
    <div style={{
      padding: "var(--space-5)",
      maxWidth: "480px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
    }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>Little Logs</h1>
          {baby && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              Tracking {baby.name}
            </p>
          )}
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              padding: "var(--space-1)",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              marginTop: "var(--space-1)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </form>
      </header>

      <section aria-labelledby="sleep-section-heading">
        <h2 id="sleep-section-heading" style={{ ...sectionHeadingStyle, marginBottom: "var(--space-3)" }}>
          🌙 Sleep
        </h2>
        {recentSleep.length > 0 && (
          <ul style={{ listStyle: "none", marginBottom: "var(--space-3)" }}>
            {recentSleep.map((s, i) => (
              <li key={i} style={logRowStyle}>
                <span><LocalTime iso={s.started_at} /></span>
                {s.duration_min != null && (
                  <span style={{ color: "var(--color-text)" }}>· {formatDuration(s.duration_min)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <LogSleepButton initialOpenSession={openSession} />
      </section>

      <section aria-labelledby="feed-section-heading">
        <h2 id="feed-section-heading" style={{ ...sectionHeadingStyle, marginBottom: "var(--space-3)" }}>
          🍼 Feed
        </h2>
        {recentFeed.length > 0 && (
          <ul style={{ listStyle: "none", marginBottom: "var(--space-3)" }}>
            {recentFeed.map((f, i) => (
              <li key={i} style={logRowStyle}>
                <span><LocalTime iso={f.started_at} /></span>
                <span style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                  · {f.type}{f.side ? ` (${f.side})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <LogFeedSheetTrigger />
      </section>

      <section aria-labelledby="diaper-section-heading">
        <h2 id="diaper-section-heading" style={{ ...sectionHeadingStyle, marginBottom: "var(--space-3)" }}>
          💧 Diaper
        </h2>
        {recentDiaper.length > 0 && (
          <ul style={{ listStyle: "none", marginBottom: "var(--space-3)" }}>
            {recentDiaper.map((n, i) => (
              <li key={i} style={logRowStyle}>
                <span><LocalTime iso={n.logged_at} /></span>
                <span style={{ color: "var(--color-text)" }}>· {n.type === "dirty" ? "Poop" : n.type.charAt(0).toUpperCase() + n.type.slice(1)}</span>
              </li>
            ))}
          </ul>
        )}
        <LogDiaperSheetTrigger />
      </section>
    </div>
  );
}
