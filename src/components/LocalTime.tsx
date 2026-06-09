"use client";

interface LocalTimeProps {
  iso: string;
  showDate?: boolean;
}

export function LocalTime({ iso, showDate = false }: LocalTimeProps) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {showDate ? `${dateStr}, ${time}` : time}
    </time>
  );
}
