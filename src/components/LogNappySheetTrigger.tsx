"use client";

import { useState } from "react";
import { LogNappySheet } from "./LogNappySheet";

export function LogNappySheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Log a diaper change"
        style={{
          width: "100%",
          padding: "var(--space-4) var(--space-6)",
          backgroundColor: "var(--color-warning)",
          color: "var(--color-primary-fg)",
          border: "none",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          transition: "var(--transition-tap)",
        }}
      >
        Log diaper
      </button>
      {open && (
        <LogNappySheet
          onClose={() => setOpen(false)}
          onLogged={() => setOpen(false)}
        />
      )}
    </>
  );
}
