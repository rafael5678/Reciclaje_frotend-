import { BinPill, Delta, Legend, StackBar } from "../components/Charts";
import { LoadState } from "../components/LoadState";
import { WasteArt } from "../components/WasteArt";
import { formatKg, formatWhen } from "../services/format";
import { useImpact } from "./useImpact";

export function ImpactView() {
  const { impact, error, retry } = useImpact();

  return (
    <div className="impact">
      <div className="impact-hero">
        <WasteArt code="PET" />
      </div>
      <section className="impact-sheet">
        <h1>Mi Impacto</h1>
        {!impact ? <LoadState error={error} onRetry={retry} /> : (
          <>
            <div className="metric-row">
              <div>
                <div className="num-line">
                  <strong>{impact.total}</strong>
                  <Delta value={impact.weekChangePercent} caption="esta semana" />
                </div>
                <span>Objetos escaneados</span>
              </div>
              <div>
                <strong>{formatKg(impact.weightKg)}</strong>
                <span>Residuos guiados</span>
              </div>
              <div>
                <strong>{formatKg(impact.co2Kg)}</strong>
                <span>CO₂ evitado</span>
              </div>
            </div>
            <StackBar items={impact.categories} />
            <Legend items={impact.categories} />
            <ul className="scan-list">
              {impact.recent.slice(0, 5).map((scan) => (
                <li key={scan.id}>
                  <WasteArt code={scan.materialCode} />
                  <div>
                    <strong>{scan.objectName}</strong>
                    <small>{scan.materialCode} · {formatWhen(scan.createdAt)}</small>
                  </div>
                  <BinPill label={scan.container.toUpperCase()} tone={scan.tone} />
                </li>
              ))}
            </ul>
            {impact.recent.length === 0 ? <p className="empty">Cuando registres un residuo, el impacto aparecerá aquí.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
