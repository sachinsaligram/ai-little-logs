"use client";

import { useState } from "react";

type FeedType = "breast" | "bottle" | "solid";
type Side = "L" | "R" | "both";

interface LogFeedSheetProps {
  onClose: () => void;
  onLogged: () => void;
}

export function LogFeedSheet({ onClose, onLogged }: LogFeedSheetProps) {
  const [feedType, setFeedType] = useState<FeedType | null>(null);
  const [side, setSide] = useState<Side | null>(null);
  const [amountMl, setAmountMl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!feedType) { setError("Select a feed type"); return; }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        started_at: new Date().toISOString(),
        type: feedType,
      };
      if (feedType === "breast" && side) body.side = side;
      if (feedType === "bottle" && amountMl) body.amount_ml = parseInt(amountMl);

      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onLogged();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to log feed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const typeButtons: { value: FeedType; label: string }[] = [
    { value: "breast", label: "Breast" },
    { value: "bottle", label: "Bottle" },
    { value: "solid", label: "Solid" },
  ];

  const sideButtons: { value: Side; label: string }[] = [
    { value: "L", label: "Left" },
    { value: "R", label: "Right" },
    { value: "both", label: "Both" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log feed"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--color-surface-overlay)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        padding: "var(--space-6)",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>Log feed</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "var(--text-xl)", padding: "var(--space-1)" }}>✕</button>
        </div>

        <div>
          <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", fontWeight: 500 }}>Feed type</p>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {typeButtons.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setFeedType(value); setSide(null); setAmountMl(""); }}
                aria-pressed={feedType === value}
                style={{
                  flex: 1,
                  padding: "var(--space-3)",
                  border: `2px solid ${feedType === value ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: feedType === value ? "var(--color-primary)" : "var(--color-surface)",
                  color: feedType === value ? "var(--color-primary-fg)" : "var(--color-text)",
                  fontWeight: 500,
                  transition: "var(--transition-tap)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {feedType === "breast" && (
          <div>
            <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", fontWeight: 500 }}>Side (optional)</p>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              {sideButtons.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSide(value)}
                  aria-pressed={side === value}
                  style={{
                    flex: 1,
                    padding: "var(--space-3)",
                    border: `2px solid ${side === value ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: side === value ? "var(--color-primary)" : "var(--color-surface)",
                    color: side === value ? "var(--color-primary-fg)" : "var(--color-text)",
                    fontWeight: 500,
                    transition: "var(--transition-tap)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {feedType === "bottle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label htmlFor="amount-ml" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Amount (ml, optional)</label>
            <input
              id="amount-ml"
              type="number"
              min={1}
              value={amountMl}
              onChange={(e) => setAmountMl(e.target.value)}
              placeholder="e.g. 120"
              style={{
                padding: "var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-base)",
                width: "120px",
              }}
            />
          </div>
        )}

        {error && <p style={{ fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading || !feedType}
          style={{
            padding: "var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            opacity: loading || !feedType ? 0.6 : 1,
            transition: "var(--transition-tap)",
          }}
        >
          {loading ? "Logging…" : "Log feed"}
        </button>
      </div>
    </div>
  );
}
