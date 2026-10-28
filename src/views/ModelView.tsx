import { RecycleBag } from "../components/RecycleBag";
import { StatTile } from "../components/StatTile";
import { modelLabel } from "../services/healthService";
import { readVisionMeta } from "../services/visionService";
import { refreshServerHealth, useServerHealth } from "./useServerHealth";

export function ModelView() {
  const meta = readVisionMeta();
  const health = useServerHealth();
  const ready = health.models.find((model) => model.available);
  const state = health.state === "online" ? "Conectado" : health.state === "offline" ? "Sin conexión" : "Conectando…";
  const steps = [
    "Subes una foto y el servidor la reduce a 384 px y la envía en resolución baja, para gastar pocos tokens.",
    "Cada escaneo hace una sola petición, al modelo principal.",
    "Si ese modelo ya no tiene cupo, la misma foto va al modelo de respaldo.",
    `Nunca se pasa de ${health.perMinute || 6} peticiones por minuto. Si se llega al límite, clasifican MIRA y TrashNet en el servidor.`,
    "Si vuelves a subir la misma foto, se reutiliza el resultado y no se gasta otra petición.",
    "Con la cámara en vivo, MIRA y TrashNet corren en tu navegador y no gastan Gemini.",
  ];

  return (
    <div className="model-page">
      <header className="page-hero">
        <h1>Cómo <em>clasifica</em></h1>
        <p>Gemini mira la foto y explica en qué contenedor va. Si Gemini se agota, MIRA y TrashNet clasifican en el servidor.</p>
      </header>
      {health.state === "offline" ? <p className="sheet-error">{health.error}</p> : null}
      <section className="hero-trio">
        <div className="tile-stack">
          <StatTile emoji={health.state === "online" ? "🟢" : health.state === "offline" ? "🔴" : "🟡"} value={state} label="Servidor" />
          <StatTile emoji="🧠" value={!health.gemini ? "Solo locales" : ready ? modelLabel(ready.name) : "Gemini agotado"} label="Modelo activo" />
          <StatTile emoji="⏱️" value={health.state === "online" ? `${health.usedLastMinute} de ${health.perMinute}` : "—"} label="Peticiones este minuto" />
        </div>
        <div className="bag-stage">
          <RecycleBag center="network" />
        </div>
        <div className="tile-stack">
          <section className="glass-card">
            <h2>Modelos de Gemini</h2>
            {health.models.length === 0 ? (
              <p className="empty">{health.state === "online" ? "El servidor no tiene modelos configurados." : "Esperando al servidor."}</p>
            ) : (
              <ul className="model-list">
                {health.models.map((model, index) => (
                  <li key={model.name} className={model.available ? "ok" : "bad"}>
                    <div>
                      <strong>{modelLabel(model.name)}</strong>
                      <small>{index === 0 ? "Principal" : "Respaldo"}</small>
                    </div>
                    <span>{model.available ? "Disponible" : `Agotado${model.retryAt ? ` hasta ${formatClock(model.retryAt)}` : ""}`}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint-dim">{meta ? `Último análisis en este equipo: ${meta.ms} ms` : "Aún no analizas nada en este equipo."}</p>
            <button className="cta cta-glow cta-sm" onClick={() => void refreshServerHealth()}>Actualizar estado</button>
          </section>
        </div>
      </section>
      <section className="glass-card timeline">
        <h2>Cómo decide</h2>
        <ol>
          {steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function formatClock(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
