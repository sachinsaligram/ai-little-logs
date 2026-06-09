"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogDiaperSheet } from "./LogDiaperSheet";

export function LogDiaperSheetTrigger() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
        <LogDiaperSheet
          onClose={() => setOpen(false)}
          onLogged={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}
