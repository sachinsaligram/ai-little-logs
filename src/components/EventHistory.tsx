"use client";

import { useState, useCallback } from "react";

type EventType = "sleep" | "feed" | "nappy";

interface BaseEvent {
  type: EventType;
  id: string;
  event_time: string;
}
interface SleepEvent extends BaseEvent {
  type: "sleep";
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  location: string | null;
  quality: number | null;
}
interface FeedEvent extends BaseEvent {
  type: "feed";
  started_at: string;
  feed_type: string;
  side: string | null;
  amount_ml: number | null;
}
interface NappyEvent extends BaseEvent {
  type: "nappy";
  logged_at: string;
  nappy_type: string;
  concern_flag: number;
  colour: string | null;
}

type AnyEvent = SleepEvent | FeedEvent | NappyEvent;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function formatDuration(min: number | null): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function SleepCard({ event }: { event: SleepEvent }) {
  return (
    <div style={{
      padding: "var(--space-4)",
      backgroundColor: "var(--color-surface)",
      borderRadius: "var(--radius-md)",
      borderLeft: "4px solid var(--color-primary)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Sleep</span>
          {event.location && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginLeft: "var(--space-2)" }}>
              {event.location}
            </span>
          )}
        </div>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{formatTime(event.started_at)}</span>
      </div>
      <div style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
        {event.ended_at
          ? `${formatTime(event.started_at)} – ${formatTime(event.ended_at)}${event.duration_min ? ` · ${formatDuration(event.duration_min)}` : ""}`
          : `Started ${formatTime(event.started_at)} · in progress`}
        {event.quality && ` · ★${event.quality}`}
      </div>
    </div>
  );
}

function FeedCard({ event }: { event: FeedEvent }) {
  const detail = event.side ? ` (${event.side})` : event.amount_ml ? ` · ${event.amount_ml}ml` : "";
  return (
    <div style={{
      padding: "var(--space-4)",
      backgroundColor: "var(--color-surface)",
      borderRadius: "var(--radius-md)",
      borderLeft: "4px solid var(--color-success)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Feed — {event.feed_type}{detail}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{formatTime(event.started_at)}</span>
      </div>
    </div>
  );
}

function NappyCard({ event }: { event: NappyEvent }) {
  const isConcern = event.concern_flag === 1;
  return (
    <div style={{
      padding: "var(--space-4)",
      backgroundColor: isConcern ? "#fff5f5" : "var(--color-surface)",
      borderRadius: "var(--radius-md)",
      borderLeft: `4px solid ${isConcern ? "var(--color-concern)" : "var(--color-warning)"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            Nappy — {event.nappy_type}
          </span>
          {isConcern && (
            <span style={{
              fontSize: "var(--text-xs)",
              backgroundColor: "var(--color-concern)",
              color: "white",
              padding: "1px var(--space-2)",
              borderRadius: "var(--radius-full)",
            }}>concern</span>
          )}
        </div>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{formatTime(event.logged_at)}</span>
      </div>
      {event.colour && (
        <div style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          {event.colour}
        </div>
      )}
    </div>
  );
}

interface EventHistoryProps {
  initialItems?: AnyEvent[];
  initialCursor?: string | null;
}

export function EventHistory({ initialItems = [], initialCursor = null }: EventHistoryProps) {
  const [items, setItems] = useState<AnyEvent[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/history?${params}`);
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setCursor(data.next_cursor ?? null);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  // Group by date
  const grouped: Map<string, AnyEvent[]> = new Map();
  for (const item of items) {
    const date = formatDate(item.event_time);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(item);
  }

  if (items.length === 0 && !loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-secondary)" }}>
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>No events yet</p>
        <p style={{ fontSize: "var(--text-sm)" }}>Start logging to see your history here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {Array.from(grouped.entries()).map(([date, dayItems]) => (
        <div key={date}>
          <h3 style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-3)",
            paddingBottom: "var(--space-2)",
            borderBottom: "1px solid var(--color-border)",
          }}>
            {date}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {dayItems.map((item) => {
              if (item.type === "sleep") return <SleepCard key={item.id} event={item as SleepEvent} />;
              if (item.type === "feed") {
                const fe = item as any;
                return <FeedCard key={item.id} event={{ ...fe, feed_type: fe.type }} />;
              }
              if (item.type === "nappy") {
                const ne = item as any;
                return <NappyCard key={item.id} event={{ ...ne, nappy_type: ne.type, logged_at: ne.logged_at ?? ne.event_time }} />;
              }
              return null;
            })}
          </div>
        </div>
      ))}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          style={{
            padding: "var(--space-3) var(--space-6)",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
