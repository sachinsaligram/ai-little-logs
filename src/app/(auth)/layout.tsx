import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { babies } from "@/db/schema";
import Link from "next/link";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const babyRows = await db.select().from(babies).limit(1);
  if (babyRows.length === 0) redirect("/setup");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: "72px" }}>
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-around",
          padding: "var(--space-2) 0 var(--space-3)",
          zIndex: 50,
        }}
      >
        <Link
          href="/"
          aria-label="Home"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            padding: "var(--space-2) var(--space-4)",
            minWidth: "64px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </Link>

        <Link
          href="/history"
          aria-label="History"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            padding: "var(--space-2) var(--space-4)",
            minWidth: "64px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          History
        </Link>

        <Link
          href="/insights"
          aria-label="Insights"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            padding: "var(--space-2) var(--space-4)",
            minWidth: "64px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Insights
        </Link>
      </nav>
    </div>
  );
}
