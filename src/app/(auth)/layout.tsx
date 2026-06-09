import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { babies } from "@/db/schema";
import { NavBar } from "@/components/NavBar";

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

      <NavBar />
    </div>
  );
}
