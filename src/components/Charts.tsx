import type { CategoryStat, DayStat } from "../models/types";

export function WeeklyChart({ days, tone = "light" }: { days: DayStat[]; tone?: "light" | "dark" }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <div className={tone === "dark" ? "chart is-dark" : "chart"}>
      {days.map((day) => (
        <div className="chart-col" key={day.label}>
          <span>{day.count}</span>
          <div className="chart-track">
            <i className={day.isToday ? "is-today" : ""} style={{ height: `${Math.max(8, (day.count / max) * 100)}%` }} />
          </div>
          <small>{day.label}</small>
        </div>
      ))}
    </div>
  );
}

export function CategoryBars({ items }: { items: CategoryStat[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="bars">
      {items.map((item) => (
        <li key={item.name}>
          <span className="bars-name"><i style={{ background: item.color }} />{item.name}</span>
          <span className="bars-track"><b style={{ width: `${(item.count / max) * 100}%`, background: item.color }} /></span>
          <strong>{item.count}</strong>
        </li>
      ))}
    </ul>
  );
}

export function StackBar({ items }: { items: CategoryStat[] }) {
  const visible = items.filter((item) => item.percent > 0);
  return (
    <div className="stackbar" aria-hidden="true">
      {visible.map((item) => (
        <span key={item.name} style={{ width: `${item.percent}%`, background: item.color }} />
      ))}
    </div>
  );
}

export function Legend({ items }: { items: CategoryStat[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.name}>
          <i style={{ background: item.color }} />
          {item.name} ({item.percent}%)
        </li>
      ))}
    </ul>
  );
}

export function Delta({ value, caption }: { value: number; caption?: string }) {
  const up = value >= 0;
  return (
    <span className={up ? "delta up" : "delta down"}>
      {up ? "+" : ""}
      {value}%{caption ? <small> {caption}</small> : null}
    </span>
  );
}

export function BinPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`bin-pill tone-${tone}`}>{label}</span>;
}
