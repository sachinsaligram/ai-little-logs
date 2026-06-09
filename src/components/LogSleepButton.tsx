"use client";

import { useState, useEffect, useRef } from "react";

type OpenSession = { id: string; started_at: string } | null;

interface LogSleepButtonProps {
  initialOpenSession?: OpenSession;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function LogSleepButton({ initialOpenSession }: LogSleepButtonProps) {
  const [openSession, setOpenSession] = useState<OpenSession>(initialOpenSession ?? null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [location, setLocation] = useState("");
  const [quality, setQuality] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (openSession) {
      const startTime = new Date(openSession.started_at).getTime();
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [openSession]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_at: new Date().toISOString() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpenSession({ id: data.id, started_at: new Date().toISOString() });
      } else {
        setError(data.error || "Failed to start sleep");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    if (!openSession) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        ended_at: new Date().toISOString(),
      };
      if (location) body.location = location;
      if (quality !== "") body.quality = quality;

      const res = await fetch(`/api/sleep/${openSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setOpenSession(null);
        setLocation("");
        setQuality("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to end sleep");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!openSession) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "stretch" }}>
        <button
          onClick={handleStart}
          disabled={loading}
          aria-label="Start sleep session"
          style={{
            padding: "var(--space-4) var(--space-6)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-lg)",
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            opacity: loading ? 0.7 : 1,
            transition: "var(--transition-tap)",
          }}
        >
          {loading ? "Starting…" : "Start sleep"}
        </button>
        {error && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{
        padding: "var(--space-4)",
        backgroundColor: "var(--color-surface-elevated)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
      }}>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>
          Sleep in progress
        </p>
        <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {formatElapsed(elapsed)}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <label htmlFor="sleep-location" style={{ fontSize: "var(--text-sm)" }}>Location (optional)</label>
        <input
          id="sleep-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. cot, pram"
          style={{
            padding: "var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <label htmlFor="sleep-quality" style={{ fontSize: "var(--text-sm)" }}>Quality (optional, 1–5)</label>
        <input
          id="sleep-quality"
          type="number"
          min={1}
          max={5}
          value={quality}
          onChange={(e) => setQuality(e.target.value ? parseInt(e.target.value) : "")}
          placeholder="1–5"
          style={{
            padding: "var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            width: "80px",
          }}
        />
      </div>

      <button
        onClick={handleEnd}
        disabled={loading}
        aria-label="End sleep session"
        style={{
          padding: "var(--space-4) var(--space-6)",
          backgroundColor: "var(--color-success)",
          color: "var(--color-primary-fg)",
          border: "none",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
          transition: "var(--transition-tap)",
        }}
      >
        {loading ? "Saving…" : "End sleep"}
      </button>
      {error && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{error}</p>}
    </div>
  );
}
