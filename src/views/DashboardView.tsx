import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Delta, Legend, StackBar } from "../components/Charts";
import { Icon } from "../components/Icons";
import { WasteArt } from "../components/WasteArt";
import type { Impact } from "../models/types";
import { formatAgo, formatKg, signedPercent } from "../services/format";
import { impactService } from "../services/impactService";
import { useSession } from "./SessionProvider";

export function DashboardView() {
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

  if (!impact) return <p className="loading">Cargando tu impacto...</p>;

  return (
    <div className="home-grid">
      <div className="home-left">
        <section className="hero">
          <div className="hero-copy">
            <h1>Clasifica hoy,<br /><em>recicla siempre</em></h1>
            <p>Sube una foto y descubre en qué contenedor va cada residuo, con los pasos para dejarlo bien.</p>
            <Link className="cta cta-inline" to="/panel/escanear">
              <Icon name="camera" size={18} />
              Escanear ahora
            </Link>
          </div>
          <EarthSlot />
        </section>
        <section className="panel-card">
          <header className="section-head">
            <h2>Últimos escaneos</h2>
            <Link to="/panel/historial">Ver todos</Link>
          </header>
          {impact.recent.length === 0 ? (
            <p className="empty">Todavía no hay escaneos. El primero suma 10 pts.</p>
          ) : (
            <div className="recent-grid">
              {impact.recent.slice(0, 4).map((scan) => (
                <article className="mini-scan" key={scan.id}>
                  <WasteArt code={scan.materialCode} />
                  <h3>{scan.objectName}</h3>
                  <p>{formatAgo(scan.createdAt)}</p>
                  <footer>
                    <span className="code-badge" style={{ color: scan.accent, background: `${scan.accent}22` }}>{scan.materialCode}</span>
                    <Icon name="check" size={16} />
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="home-right">
        <section className="panel-card impact-card">
          <header className="section-head">
            <h2>Tu impacto ambiental</h2>
            <span className="chip">Últimos 7 días</span>
          </header>
          <div className="impact-nums">
            <div>
              <div className="num-line">
                <strong>{impact.total}</strong>
                <Delta value={impact.weekChangePercent} />
              </div>
              <span>Objetos escaneados</span>
            </div>
            <div>
              <strong>{formatKg(impact.weightKg)}</strong>
              <span>Residuos clasificados</span>
            </div>
            <div>
              <strong>{formatKg(impact.co2Kg)}</strong>
              <span>CO₂ evitado</span>
            </div>
          </div>
          <StackBar items={impact.categories} />
          <Legend items={impact.categories} />
        </section>
        <div className="split-bottom">
          <section className="panel-card tips">
            <h2>Consejos rápidos</h2>
            <ul>
              <li><Icon name="drop" size={16} /><span>Lava los envases que lo requieran (p. ej. botellas y latas).</span></li>
              <li><Icon name="cap" size={16} /><span>Retira las tapas y etiquetas cuando sea necesario.</span></li>
              <li><Icon name="spark" size={16} /><span>Separa por tipo de material para evitar la contaminación.</span></li>
            </ul>
          </section>
          <section className="quote">
            <p>“El reciclaje no es solo una acción, es un estilo de vida”</p>
            <small>{signedPercent(impact.weekChangePercent)} frente a la semana anterior</small>
          </section>
        </div>
      </div>
    </div>
  );
}

function EarthSlot() {
  return (
    <div className="hero-earth">
      <svg viewBox="0 0 360 360" aria-hidden="true">
        <EarthInline />
      </svg>
    </div>
  );
}

function EarthInline() {
  return (
    <>
      <defs>
        <radialGradient id="heroOcean" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#8fd4ff" />
          <stop offset="46%" stopColor="#1b8fe0" />
          <stop offset="100%" stopColor="#0a4f98" />
        </radialGradient>
        <linearGradient id="heroLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8ffe6" />
          <stop offset="100%" stopColor="#128a4c" />
        </linearGradient>
        <clipPath id="heroDisc"><circle cx="180" cy="176" r="104" /></clipPath>
      </defs>
      <circle cx="180" cy="176" r="132" fill="#1fe08a" opacity="0.08" />
      <circle cx="180" cy="176" r="108" fill="url(#heroOcean)" />
      <g clipPath="url(#heroDisc)">
        <ellipse cx="150" cy="146" rx="48" ry="26" fill="#3dce78" transform="rotate(-22 150 146)" />
        <ellipse cx="206" cy="168" rx="28" ry="16" fill="#8ee7a4" />
        <ellipse cx="132" cy="190" rx="30" ry="14" fill="#2fbf6c" />
        <ellipse cx="188" cy="206" rx="36" ry="14" fill="#57d888" />
      </g>
      <ellipse cx="150" cy="142" rx="36" ry="14" fill="#fff" opacity="0.2" transform="rotate(-30 150 142)" />
      <g fill="url(#heroLeaf)">
        <path d="M62 120c26-6 44 8 48 28-20 2-38-8-48-28z" transform="rotate(-30 80 130)" />
        <path d="M250 78c28-2 46 14 48 32-22 0-40-10-48-32z" />
        <path d="M268 176c24 6 36 24 30 40-18-6-32-16-30-40z" />
        <path d="M70 210c22 10 28 28 16 40-16-8-24-22-16-40z" />
      </g>
    </>
  );
}
