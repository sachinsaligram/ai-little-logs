"use client";

import { useState, useEffect } from "react";

interface InsightsData {
  summary: string;
  patterns: string[];
  generated_at: string;
}

type PanelState = "idle" | "loading" | "success" | "empty" | "error";

interface InsightsPanelProps {
  days?: number;
}

export function InsightsPanel({ days = 7 }: InsightsPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [data, setData] = useState<InsightsData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let spinnerTimer: ReturnType<typeof setTimeout>;

    async function fetchInsights() {
      // Show spinner after 300ms (SC-003)
      spinnerTimer = setTimeout(() => setState("loading"), 300);

      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days }),
        });

        clearTimeout(spinnerTimer);

        if (res.status === 204) {
          setState("empty");
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setErrorMsg(errData.message ?? "Something went wrong");
          setState("error");
          return;
        }
        const json = await res.json();
        setData(json);
        setState("success");
      } catch {
        clearTimeout(spinnerTimer);
        setErrorMsg("Failed to load insights. Please try again.");
        setState("error");
      }
    }

    fetchInsights();
    return () => clearTimeout(spinnerTimer);
  }, [days]);

  if (state === "idle") {
    return null;
  }

  if (state === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}>
        <div
          aria-label="Loading insights"
          role="status"
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div style={{
        padding: "var(--space-6)",
        backgroundColor: "var(--color-surface-elevated)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
      }}>
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>No data yet</p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Start logging to see insights here.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{
        padding: "var(--space-4)",
        backgroundColor: "#fff5f5",
        border: "1px solid var(--color-error)",
        borderRadius: "var(--radius-md)",
      }}>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-error)" }}>
          {errorMsg || "Insights unavailable right now."}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          The rest of the app is still usable.
        </p>
      </div>
    );
  }

  if (state === "success" && data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{
          padding: "var(--space-5)",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
            Last {days} days
          </h2>
          <p style={{ fontSize: "var(--text-base)", lineHeight: 1.6 }}>{data.summary}</p>
        </div>

        {data.patterns.length > 0 && (
          <div style={{
            padding: "var(--space-5)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
          }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
              Patterns
            </h3>
            <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", listStyle: "none" }}>
              {data.patterns.map((pattern, i) => (
                <li key={i} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "2px" }}>●</span>
                  <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", textAlign: "right" }}>
          Generated {new Date(data.generated_at).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  return null;
}
