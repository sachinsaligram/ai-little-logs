"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [errors, setErrors] = useState<{ name?: string; dob?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!dob) errs.dob = "Date of birth is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/babies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date_of_birth: dob }),
      });
      if (res.ok) {
        router.push("/");
      } else if (res.status === 409) {
        router.push("/");
      } else {
        const data = await res.json();
        setErrors({ general: data.error || "Something went wrong" });
      }
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: "var(--space-6)",
      gap: "var(--space-6)",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          Set up your baby&apos;s profile
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          You only need to do this once.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <label htmlFor="baby-name" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
            Baby&apos;s name
          </label>
          <input
            id="baby-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Olivia"
            style={{
              padding: "var(--space-3) var(--space-4)",
              border: `1px solid ${errors.name ? "var(--color-error)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-base)",
              outline: "none",
            }}
          />
          {errors.name && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{errors.name}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <label htmlFor="baby-dob" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
            Date of birth
          </label>
          <input
            id="baby-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={{
              padding: "var(--space-3) var(--space-4)",
              border: `1px solid ${errors.dob ? "var(--color-error)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-base)",
              outline: "none",
            }}
          />
          {errors.dob && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{errors.dob}</span>
          )}
        </div>

        {errors.general && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            opacity: submitting ? 0.7 : 1,
            transition: "var(--transition-tap)",
          }}
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
