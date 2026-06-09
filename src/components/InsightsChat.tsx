"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface InsightsChatProps {
  days?: number;
}

export function InsightsChat({ days = 7 }: InsightsChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const updated: Message[] = [...messages, { role: "user", text }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, days }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([...updated, { role: "assistant", text: data.reply }]);
      } else {
        setError(data.message ?? "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      backgroundColor: "var(--color-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>Ask about your data</h2>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
          Ask questions about patterns, routines, or trends
        </p>
      </div>

      {messages.length > 0 && (
        <div style={{
          padding: "var(--space-4) var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          maxHeight: "360px",
          overflowY: "auto",
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "80%",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: m.role === "user"
                  ? "var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)"
                  : "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)",
                backgroundColor: m.role === "user" ? "var(--color-primary)" : "var(--color-surface-elevated)",
                color: m.role === "user" ? "var(--color-primary-fg)" : "var(--color-text)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)",
                backgroundColor: "var(--color-surface-elevated)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}>
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <p style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-error)",
          padding: "0 var(--space-5)",
          marginTop: messages.length === 0 ? "var(--space-3)" : 0,
        }}>
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "var(--space-2)",
          padding: "var(--space-4) var(--space-5)",
          borderTop: messages.length > 0 ? "1px solid var(--color-border)" : "none",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How long did the baby sleep yesterday?"
          disabled={loading}
          style={{
            flex: 1,
            padding: "var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            backgroundColor: "var(--color-surface)",
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          style={{
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: "var(--transition-tap)",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
