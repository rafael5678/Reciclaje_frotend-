import { useEffect, useState } from "react";
import { CategoryBars, Delta, StackBar, WeeklyChart } from "../components/Charts";
import type { Impact } from "../models/types";
import { formatKg, formatPercent } from "../services/format";
import { impactService } from "../services/impactService";
import { useSession } from "./SessionProvider";

export function StatsView() {
  const { revision } = useSession();
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    let alive = true;
    impactService.get().then((data) => {
      if (alive) setImpact(data);
    });
    return () => {
      alive = false;
    };
  }, [revision]);

  if (!impact) return <p className="loading">Cargando estadísticas...</p>;

  return (
    <div className="stats-page">
      <header className="page-head light-text">
        <div>
          <h1>Estadísticas</h1>
          <p>Lo que ya separaste, comparado con la semana anterior.</p>
        </div>
        <Delta value={impact.weekChangePercent} caption="esta semana" />
      </header>
      <section className="stats-nums">
        <article><span>Objetos</span><strong>{impact.total}</strong></article>
        <article><span>Bien separados</span><strong>{formatPercent(impact.wellPercent)}</strong></article>
        <article><span>Peso guiado</span><strong>{formatKg(impact.weightKg)}</strong></article>
        <article><span>CO₂ evitado</span><strong>{formatKg(impact.co2Kg)}</strong></article>
      </section>
      <section className="mid-grid">
        <article className="panel-card dark-card">
          <h2>Últimos 7 días</h2>
          <WeeklyChart days={impact.weekly} tone="dark" />
        </article>
        <article className="panel-card dark-card">
          <h2>Por material</h2>
          <StackBar items={impact.categories} />
          <CategoryBars items={impact.categories} />
        </article>
      </section>
    </div>
  );
}
