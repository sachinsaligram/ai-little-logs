import { EventHistory } from "@/components/EventHistory";
import { db } from "@/db";
import { babies, sleep_logs, feed_logs, diaper_logs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const DEFAULT_LIMIT = 50;

export default async function HistoryPage() {
  const babyRows = await db.select({ id: babies.id }).from(babies).limit(1);
  const baby = babyRows[0];

  if (!baby) {
    return (
      <div style={{ padding: "var(--space-5)" }}>
        <p>No baby profile found.</p>
      </div>
    );
  }

  const [sleeps, feeds, diapers] = await Promise.all([
    db.select().from(sleep_logs)
      .where(eq(sleep_logs.baby_id, baby.id))
      .orderBy(desc(sleep_logs.started_at))
      .limit(DEFAULT_LIMIT),
    db.select().from(feed_logs)
      .where(eq(feed_logs.baby_id, baby.id))
      .orderBy(desc(feed_logs.started_at))
      .limit(DEFAULT_LIMIT),
    db.select().from(diaper_logs)
      .where(eq(diaper_logs.baby_id, baby.id))
      .orderBy(desc(diaper_logs.logged_at))
      .limit(DEFAULT_LIMIT),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [
    ...sleeps.map((s) => ({ ...s, type: "sleep", event_time: s.started_at })),
    ...feeds.map((f) => ({ ...f, type: "feed", event_time: f.started_at })),
    ...diapers.map((n) => ({ ...n, type: "diaper", event_time: n.logged_at })),
  ].sort((a, b) => (a.event_time < b.event_time ? 1 : -1)).slice(0, DEFAULT_LIMIT);

  return (
    <div style={{
      padding: "var(--space-5)",
      maxWidth: "600px",
      margin: "0 auto",
    }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-5)" }}>
        History
      </h1>
      <EventHistory initialItems={items} />
    </div>
  );
}
