import { Link } from "react-router-dom";
import { CountUp } from "../components/CountUp";
import { Icon } from "../components/Icons";
import { LoadState } from "../components/LoadState";
import { RecycleBag } from "../components/RecycleBag";
import { ScanPhoto } from "../components/ScanPhoto";
import { StatTile } from "../components/StatTile";
import { formatAgo, signedPercent } from "../services/format";
import { levelFor } from "../services/levels";
import { useImpact } from "./useImpact";

export function DashboardView() {
  const { impact, error, retry } = useImpact();

  if (!impact) return <LoadState error={error} onRetry={retry} loading="Cargando tu impacto..." />;
  const level = levelFor(impact.points);

  return (
    <div className="home">
      <header className="page-hero">
        <h1>Clasifica hoy, <em>recicla siempre</em></h1>
        <p>Sube una foto y descubre en qué contenedor va cada residuo.</p>
      </header>

      <section className="hero-trio">
        <div className="tile-stack">
          <StatTile emoji="📦" value={<CountUp value={impact.total} />} label="Objetos escaneados" />
          <StatTile emoji="⚖️" value={<CountUp value={impact.weightKg} decimals={1} suffix=" kg" />} label="Residuos clasificados" />
          <StatTile emoji="🌿" value={<CountUp value={impact.co2Kg} decimals={1} suffix=" kg" />} label="CO₂ evitado" />
        </div>
        <div className="bag-stage">
          <RecycleBag center="recycle" />
          <Link className="cta cta-glow" to="/panel/escanear">
            <Icon name="camera" size={18} />
            Escanear ahora
          </Link>
        </div>
        <div className="tile-stack">
          <section className="glass-card">
            <h2>Por material</h2>
            <ul className="material-chips">
              {impact.categories.map((item) => (
                <li key={item.name}><i style={{ background: item.color }} />{item.name} {item.percent}%</li>
              ))}
            </ul>
          </section>
          <section className="glass-card tips">
            <h2>Consejos rápidos</h2>
            <ul>
              <li><Icon name="check" size={14} /><span>Lava los envases antes</span></li>
              <li><Icon name="check" size={14} /><span>Retira tapas y etiquetas</span></li>
              <li><Icon name="check" size={14} /><span>Separa por material</span></li>
            </ul>
          </section>
        </div>
      </section>

      <section className="home-bottom">
        <section className="glass-card">
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
                  <ScanPhoto scan={scan} />
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
        <section className="glass-card level-card">
          <span className="level-emoji" aria-hidden="true">{level.emoji}</span>
          <div>
            <small>Tu nivel</small>
            <h2>{level.name}</h2>
            <div className="level-bar"><i style={{ width: `${Math.round(level.progress * 100)}%` }} /></div>
            <p>{level.next ? `${impact.points} pts · faltan ${level.next.missing} para ${level.next.name}` : `${impact.points} pts · nivel máximo`}</p>
          </div>
        </section>
        <section className="glass-card quote">
          <p>“El reciclaje no es solo una acción, es un estilo de vida”</p>
          <small>{signedPercent(impact.weekChangePercent)} de escaneos frente a la semana anterior</small>
        </section>
      </section>
    </div>
  );
}
