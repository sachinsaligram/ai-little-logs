"use client";

import { useState } from "react";
import { LogFeedSheet } from "./LogFeedSheet";

export function LogFeedSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Log a feed"
        style={{
          width: "100%",
          padding: "var(--space-4) var(--space-6)",
          backgroundColor: "var(--color-success)",
          color: "var(--color-primary-fg)",
          border: "none",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          transition: "var(--transition-tap)",
        }}
      >
        Log feed
      </button>
      {open && (
        <LogFeedSheet
          onClose={() => setOpen(false)}
          onLogged={() => setOpen(false)}
        />
      )}
    </>
  );
}
