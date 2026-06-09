"use client";

import { useState } from "react";

type NappyType = "wet" | "dirty" | "both" | "dry";

interface LogNappySheetProps {
  onClose: () => void;
  onLogged: () => void;
}

export function LogNappySheet({ onClose, onLogged }: LogNappySheetProps) {
  const [nappyType, setNappyType] = useState<NappyType | null>(null);
  const [concernFlag, setConcernFlag] = useState(false);
  const [colour, setColour] = useState("");
  const [consistency, setConsistency] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!nappyType) { setError("Select a diaper type"); return; }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        logged_at: new Date().toISOString(),
        type: nappyType,
        concern_flag: concernFlag,
      };
      if (colour) body.colour = colour;
      if (consistency) body.consistency = consistency;

      const res = await fetch("/api/nappy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onLogged();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to log diaper");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const typeButtons: { value: NappyType; label: string; emoji: string }[] = [
    { value: "wet", label: "Wet", emoji: "💧" },
    { value: "dirty", label: "Poop", emoji: "💩" },
    { value: "both", label: "Both", emoji: "💧💩" },
    { value: "dry", label: "Dry", emoji: "✓" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log diaper change"
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
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>Log diaper</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "var(--text-xl)", padding: "var(--space-1)" }}>✕</button>
        </div>

        <div>
          <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", fontWeight: 500 }}>Type</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            {typeButtons.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setNappyType(value)}
                aria-pressed={nappyType === value}
                style={{
                  padding: "var(--space-4)",
                  border: `2px solid ${nappyType === value ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: nappyType === value ? "var(--color-primary)" : "var(--color-surface)",
                  color: nappyType === value ? "var(--color-primary-fg)" : "var(--color-text)",
                  fontWeight: 500,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  transition: "var(--transition-tap)",
                }}
              >
                <span style={{ fontSize: "var(--text-xl)" }}>{emoji}</span>
                <span style={{ fontSize: "var(--text-sm)" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={concernFlag}
              onChange={(e) => setConcernFlag(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span style={{ fontSize: "var(--text-sm)", color: concernFlag ? "var(--color-concern)" : "var(--color-text)" }}>
              Flag as concern
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label htmlFor="nappy-colour" style={{ fontSize: "var(--text-sm)" }}>Colour (optional)</label>
            <input
              id="nappy-colour"
              type="text"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              placeholder="e.g. yellow"
              style={{
                padding: "var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label htmlFor="nappy-consistency" style={{ fontSize: "var(--text-sm)" }}>Consistency (optional)</label>
            <input
              id="nappy-consistency"
              type="text"
              value={consistency}
              onChange={(e) => setConsistency(e.target.value)}
              placeholder="e.g. runny"
              style={{
                padding: "var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading || !nappyType}
          style={{
            padding: "var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            opacity: loading || !nappyType ? 0.6 : 1,
            transition: "var(--transition-tap)",
          }}
        >
          {loading ? "Logging…" : "Log diaper"}
        </button>
      </div>
    </div>
  );
}
