import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BinPill, CategoryBars, WeeklyChart } from "../components/Charts";
import { Icon } from "../components/Icons";
import type { Impact, Scan } from "../models/types";
import { formatPercent, formatWhen } from "../services/format";
import { impactService } from "../services/impactService";
import { scanService } from "../services/scanService";
import { useSession } from "./SessionProvider";

const FILTERS = ["Todos", "Plástico", "Papel y cartón", "Vidrio", "Metal", "Orgánico", "General"];

export function ScansView() {
  const { revision } = useSession();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [filter, setFilter] = useState("Todos");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([impactService.get(), scanService.list()])
      .then(([nextImpact, nextScans]) => {
        if (!alive) return;
        setImpact(nextImpact);
        setScans(nextScans);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  const visible = useMemo(
    () => scans.filter((scan) => filter === "Todos" || scan.category === filter),
    [scans, filter],
  );

  return (
    <div className="scans-page">
      <header className="page-head">
        <div>
          <h1>Mis escaneos</h1>
          <p>Tu historial vive en tu cuenta. Aquí ves cuántos objetos llevas y cómo los separas.</p>
        </div>
        <Link className="cta cta-inline" to="/panel/escanear">
          <Icon name="camera" size={18} />
          Escanear residuo
        </Link>
      </header>
      {error ? <p className="sheet-error">{error}</p> : null}
      <section className="summary">
        <article className="panel-card big-stat">
          <div>
            <strong>{impact?.total ?? "—"}</strong>
            <span>objetos escaneados en total</span>
          </div>
          <div>
            <strong>{impact ? formatPercent(impact.wellPercent) : "—"}</strong>
            <span>bien separados</span>
          </div>
        </article>
        <article className="panel-card mini-stat"><span>Hoy</span><strong>{impact?.today ?? "—"}</strong><small>objetos</small></article>
        <article className="panel-card mini-stat"><span>Últimos 7 días</span><strong>{impact?.last7 ?? "—"}</strong><small>objetos</small></article>
        <article className="panel-card mini-stat"><span>Noche</span><strong>{impact?.night ?? "—"}</strong><small>esta semana</small></article>
      </section>
      <section className="mid-grid">
        <article className="panel-card">
          <header className="section-head">
            <h2>Últimos 7 días</h2>
            <span>{impact?.last7 ?? 0} objetos</span>
          </header>
          <WeeklyChart days={impact?.weekly ?? []} />
        </article>
        <article className="panel-card">
          <header className="section-head"><h2>Por tipo de material</h2></header>
          <CategoryBars items={impact?.categories ?? []} />
        </article>
      </section>
      <section className="panel-card hist">
        <header className="hist-head">
          <h2>Historial</h2>
          <div className="filters">
            {FILTERS.map((item) => (
              <button key={item} className={item === filter ? "is-on" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Objeto</th>
                <th>Material</th>
                <th>Contenedor</th>
                <th>Qué hacer</th>
                <th>Cuándo</th>
                <th>Certeza</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((scan) => (
                <tr key={scan.id}>
                  <td>
                    <span className="code-badge" style={{ color: scan.accent, background: `${scan.accent}22` }}>{scan.materialCode}</span>
                    {scan.objectName}
                  </td>
                  <td>{scan.category}</td>
                  <td><BinPill label={scan.container} tone={scan.tone} /></td>
                  <td><span className="action-pill">{scan.primaryAction}</span></td>
                  <td>{formatWhen(scan.createdAt)}</td>
                  <td className={scan.confidence >= 0.9 ? "cert high" : "cert"}>{Math.round(scan.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 ? <p className="empty">No hay escaneos en este filtro.</p> : null}
        </div>
      </section>
    </div>
  );
}
