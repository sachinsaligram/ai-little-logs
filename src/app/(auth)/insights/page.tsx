import { InsightsPanel } from "@/components/InsightsPanel";

export default function InsightsPage() {
  return (
    <div style={{
      padding: "var(--space-5)",
      maxWidth: "600px",
      margin: "0 auto",
    }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-5)" }}>
        Insights
      </h1>
      <InsightsPanel days={7} />
    </div>
  );
}
