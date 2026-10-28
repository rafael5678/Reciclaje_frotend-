import { CategoryBars, Delta, StackBar, WeeklyChart } from "../components/Charts";
import { LoadState } from "../components/LoadState";
import { formatKg, formatPercent } from "../services/format";
import { useImpact } from "./useImpact";

export function StatsView() {
  const { impact, error, retry } = useImpact();

  if (!impact) return <LoadState error={error} onRetry={retry} loading="Cargando estadísticas..." />;

  return (
    <div className="stats-page">
      <header className="page-head">
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
        <article className="panel-card">
          <h2>Últimos 7 días</h2>
          <WeeklyChart days={impact.weekly} />
        </article>
        <article className="panel-card">
          <h2>Por material</h2>
          <StackBar items={impact.categories} />
          <CategoryBars items={impact.categories} />
        </article>
      </section>
    </div>
  );
}
