/** Explains Gemini, MIRA, and TrashNet. */
import { RecycleBag } from "../components/RecycleBag";
import { StatTile } from "../components/StatTile";
import { modelLabel } from "../services/format";
import { readVisionMeta } from "../services/visionService";
import { visionWorker } from "../services/visionWorker";
import { refreshServerHealth, useServerHealth } from "../hooks/useServerHealth";

export function ModelView() {
  const meta = readVisionMeta();
  const health = useServerHealth();
  const ready = health.models.find((model) => model.available);
  const state = health.state === "online" ? "Conectado" : health.state === "offline" ? "Sin conexión" : "Conectando…";
  const steps = [
    "Subes una foto y el servidor la reduce a 384 px y la envía en resolución baja, para gastar pocos tokens.",
    "Cada escaneo hace una sola petición, al modelo principal.",
    "Si ese modelo ya no tiene cupo, la misma foto va al modelo de respaldo.",
    `Nunca se pasa de ${health.perMinute || 6} peticiones Gemini por minuto. Si Gemini se agota, entra Claude Haiku 5.5. Si Haiku también falla, clasifican MIRA y TrashNet.`,
    "Si vuelves a subir la misma foto, se reutiliza el resultado y no se gasta otra petición.",
    "Con la cámara en vivo, MIRA y TrashNet corren en tu navegador y no gastan Gemini.",
    visionWorker.active()
      ? "La forma y el color de la foto se analizan en un Web Worker, en otro hilo, para que la pantalla no se congele. Si el Worker no arranca, se usa el mismo código en el hilo principal."
      : "En este navegador el Web Worker no está activo; la clasificación local sigue en el hilo principal, igual que antes.",
  ];

  return (
    <div className="model-page">
      <header className="page-hero">
        <h1>Cómo <em>clasifica</em></h1>
        <p>Gemini mira la foto y explica en qué contenedor va. Si Gemini se agota, entra Claude Haiku 5.5. Si no, clasifican MIRA y TrashNet.</p>
      </header>
      {health.state === "offline" ? <p className="sheet-error">{health.error}</p> : null}
      <section className="hero-trio">
        <div className="tile-stack">
          <StatTile emoji={health.state === "online" ? "🟢" : health.state === "offline" ? "🔴" : "🟡"} value={state} label="Servidor" />
          <StatTile emoji="🧠" value={activeModel(health, ready)} label="Modelo activo" />
          <StatTile emoji="🧵" value={visionWorker.active() ? "Web Worker" : "Hilo principal"} label="Análisis local" />
        </div>
        <div className="bag-stage">
          <RecycleBag center="network" />
        </div>
        <div className="tile-stack">
          <section className="glass-card">
            <h2>Modelos de Gemini</h2>
            {health.models.length === 0 && !health.anthropic ? (
              <p className="empty">{health.state === "online" ? "El servidor no tiene modelos configurados." : "Esperando al servidor."}</p>
            ) : (
              <ul className="model-list">
                {health.models.map((model, index) => (
                  <li key={model.name} className={model.available ? "ok" : "bad"}>
                    <div>
                      <strong>{modelLabel(model.name)}</strong>
                      <small>{index === 0 ? "Principal" : "Respaldo Gemini"}</small>
                    </div>
                    <span>{model.available ? "Disponible" : `Agotado${model.retryAt ? ` hasta ${formatClock(model.retryAt)}` : ""}`}</span>
                  </li>
                ))}
                {health.anthropic ? (
                  <li className="ok">
                    <div>
                      <strong>{modelLabel(health.anthropicModel || "claude-haiku-5-5")}</strong>
                      <small>Respaldo si Gemini falla</small>
                    </div>
                    <span>Listo</span>
                  </li>
                ) : null}
              </ul>
            )}
            <p className="hint-dim">
              {meta ? `Último análisis en este equipo: ${meta.ms} ms` : "Aún no analizas nada en este equipo."}
              {visionWorker.active() ? " · Worker activo." : ""}
            </p>
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

function activeModel(health: { gemini: boolean; anthropic: boolean; anthropicModel: string | null }, ready: { name: string } | undefined) {
  if (ready) return modelLabel(ready.name);
  if (health.anthropic) return modelLabel(health.anthropicModel || "claude-haiku-5-5");
  if (health.gemini) return "Gemini agotado";
  return "Solo locales";
}
