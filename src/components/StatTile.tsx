import type { ReactNode } from "react";

export function StatTile({ emoji, value, label }: { emoji: string; value: ReactNode; label: string }) {
  return (
    <article className="stat-tile glass">
      <span className="stat-emoji" aria-hidden="true">{emoji}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}
