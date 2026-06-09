"use server";

import { db } from "@/db";
import { babies, sleep_logs } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { LogSleepButton } from "@/components/LogSleepButton";
import { LogFeedSheetTrigger } from "@/components/LogFeedSheetTrigger";
import { LogNappySheetTrigger } from "@/components/LogNappySheetTrigger";

export default async function HomePage() {
  const babyRows = await db.select({ id: babies.id, name: babies.name }).from(babies).limit(1);
  const baby = babyRows[0];

  let openSession: { id: string; started_at: string } | null = null;
  if (baby) {
    const open = await db
      .select({ id: sleep_logs.id, started_at: sleep_logs.started_at })
      .from(sleep_logs)
      .where(and(eq(sleep_logs.baby_id, baby.id), isNull(sleep_logs.ended_at)))
      .limit(1);
    openSession = open[0] ?? null;
  }

  return (
    <div style={{
      padding: "var(--space-5)",
      maxWidth: "480px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
    }}>
      <header>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>Little Logs</h1>
        {baby && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
            Tracking {baby.name}
          </p>
        )}
      </header>

      <section aria-labelledby="sleep-section-heading">
        <h2 id="sleep-section-heading" style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "var(--space-3)",
        }}>
          Sleep
        </h2>
        <LogSleepButton initialOpenSession={openSession} />
      </section>

      <section aria-labelledby="feed-section-heading">
        <h2 id="feed-section-heading" style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "var(--space-3)",
        }}>
          Feed
        </h2>
        <LogFeedSheetTrigger />
      </section>

      <section aria-labelledby="nappy-section-heading">
        <h2 id="nappy-section-heading" style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "var(--space-3)",
        }}>
          Nappy
        </h2>
        <LogNappySheetTrigger />
      </section>
    </div>
  );
}
