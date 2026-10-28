import type { Impact } from "../models/types";
import { CountUp, Ring } from "./CountUp";
import { Icon } from "./Icons";

const EMPTY_CATEGORIES = [
  { name: "Plástico", color: "#1f9d5a" },
  { name: "Papel y cartón", color: "#3b82f6" },
  { name: "Vidrio", color: "#65a33a" },
  { name: "Metal", color: "#8b949e" },
  { name: "Orgánico", color: "#c4956a" },
  { name: "General", color: "#5c6764" },
];

type Props = {
  impact: Impact | null;
  note: string;
  onClose: () => void;
};

export function ImpactPanel({ impact, note, onClose }: Props) {
  const categories = impact?.categories ?? EMPTY_CATEGORIES.map((item) => ({ ...item, count: 0, percent: 0 }));
  return (
    <aside className="impact-panel glass" aria-label="Tu impacto">
      <header>
        <h2>🌍 Tu impacto</h2>
        <button className="panel-close" onClick={onClose} aria-label="Cerrar panel">
          <Icon name="close" size={16} />
        </button>
      </header>
      <p className="impact-note">{note}</p>
      <div className="impact-counters">
        <div><strong><CountUp value={impact?.total ?? 0} /></strong><span>objetos reciclados</span></div>
        <div><strong><CountUp value={impact?.weightKg ?? 0} decimals={1} /></strong><span>kg clasificados</span></div>
        <div><strong><CountUp value={impact?.co2Kg ?? 0} decimals={1} /></strong><span>kg CO₂ evitado</span></div>
      </div>
      <div className="impact-rings">
        {categories.map((item) => (
          <Ring key={item.name} percent={item.percent} color={item.color} label={item.name} />
        ))}
      </div>
    </aside>
  );
}
