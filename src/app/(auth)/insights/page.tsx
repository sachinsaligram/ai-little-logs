import { InsightsPanel } from "@/components/InsightsPanel";
import { InsightsChat } from "@/components/InsightsChat";

export default function InsightsPage() {
  return (
    <div style={{
      padding: "var(--space-5)",
      maxWidth: "600px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
    }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>
        Insights
      </h1>
      <InsightsPanel days={7} />
      <InsightsChat days={7} />
    </div>
  );
}
