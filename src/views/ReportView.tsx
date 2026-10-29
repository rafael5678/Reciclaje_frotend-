import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LoadState } from "../components/LoadState";
import { Logo } from "../components/Logo";
import type { Impact, Scan } from "../models/types";
import { formatKg, formatPercent } from "../services/format";
import { impactService } from "../services/impactService";
import { scanService } from "../services/scanService";
import { useSession } from "./SessionProvider";

export function ReportView() {
  const { session } = useSession();
  const [data, setData] = useState<{ impact: Impact; scans: Scan[] } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const printed = useRef(false);

  useEffect(() => {
    let alive = true;
    setError("");
    Promise.all([impactService.get(), scanService.list()])
      .then(([impact, scans]) => {
        if (alive) setData({ impact, scans });
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!data || printed.current) return;
    printed.current = true;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (!data) {
    return (
      <main className="report-page">
        <LoadState error={error} onRetry={() => setAttempt((value) => value + 1)} loading="Preparando tu informe..." />
      </main>
    );
  }

  const { impact, scans } = data;
  const generated = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

  return (
    <main className="report-page">
      <div className="report-actions">
        <button className="cta cta-inline" onClick={() => window.print()}>Descargar PDF</button>
        <Link className="ghost-link" to="/panel/historial">Volver al historial</Link>
        <span>En el diálogo elige «Guardar como PDF».</span>
      </div>
      <article className="report">
        <header className="report-head">
          <Logo size={48} />
          <div>
            <h1>Informe de reciclaje</h1>
            <p>{session?.user.guest ? "Invitado" : session?.user.name} · generado el {generated}</p>
          </div>
        </header>
        <section className="report-stats">
          <div><strong>{impact.total}</strong><span>objetos escaneados</span></div>
          <div><strong>{formatPercent(impact.wellPercent)}</strong><span>bien separados</span></div>
          <div><strong>{formatKg(impact.weightKg)}</strong><span>residuos clasificados</span></div>
          <div><strong>{formatKg(impact.co2Kg)}</strong><span>CO₂ evitado</span></div>
          <div><strong>{impact.points}</strong><span>puntos</span></div>
        </section>
        <h2>Por material</h2>
        <table className="report-table">
          <thead><tr><th>Material</th><th>Objetos</th><th>Porcentaje</th></tr></thead>
          <tbody>
            {impact.categories.map((item) => (
              <tr key={item.name}><td><i style={{ background: item.color }} />{item.name}</td><td>{item.count}</td><td>{item.percent}%</td></tr>
            ))}
          </tbody>
        </table>
        <h2>Historial completo ({scans.length})</h2>
        {scans.length === 0 ? (
          <p className="report-empty">Todavía no hay escaneos registrados.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr><th>Fecha</th><th>Objeto</th><th>Material</th><th>Contenedor</th><th>Certeza</th><th>Puntos</th><th>CO₂</th></tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td>{new Date(scan.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{scan.objectName}</td>
                  <td>{scan.category}</td>
                  <td>{scan.container}</td>
                  <td>{Math.round(scan.confidence * 100)}%</td>
                  <td>{scan.points}</td>
                  <td>{formatKg(scan.co2Kg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer className="report-foot">EcoScan · Recicla con inteligencia</footer>
      </article>
    </main>
  );
}
