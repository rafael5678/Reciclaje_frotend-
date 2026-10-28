import { modelLabel } from "../services/healthService";
import { readVisionMeta } from "../services/visionService";
import { refreshServerHealth, useServerHealth } from "./useServerHealth";

export function ModelView() {
  const meta = readVisionMeta();
  const health = useServerHealth();
  const ready = health.models.find((model) => model.available);
  const state = health.state === "online" ? "Conectado" : health.state === "offline" ? "Sin conexión" : "Conectando…";

  return (
    <div className="model-page">
      <header className="page-head">
        <div>
          <h1>Cómo clasifica</h1>
          <p>Gemini mira la foto y explica en qué contenedor va. Si Gemini se agota, MIRA y TrashNet clasifican en el servidor.</p>
        </div>
        <button className="cta cta-inline" onClick={() => void refreshServerHealth()}>Actualizar estado</button>
      </header>
      {health.state === "offline" ? <p className="sheet-error">{health.error}</p> : null}
      <section className="model-stats">
        <article className="panel-card"><span>Servidor</span><strong>{state}</strong></article>
        <article className="panel-card"><span>Modelo activo</span><strong>{!health.gemini ? "Solo modelos locales" : ready ? modelLabel(ready.name) : "Gemini agotado"}</strong></article>
        <article className="panel-card"><span>Peticiones este minuto</span><strong>{health.state === "online" ? `${health.usedLastMinute} de ${health.perMinute}` : "—"}</strong></article>
      </section>
      <section className="panel-card">
        <header className="section-head">
          <h2>Modelos de Gemini</h2>
          <span>{meta ? `Último análisis en este equipo: ${meta.ms} ms` : "Aún no analizas nada en este equipo"}</span>
        </header>
        {health.models.length === 0 ? (
          <p className="empty">{health.state === "online" ? "El servidor no tiene modelos configurados." : "Esperando al servidor."}</p>
        ) : (
          <ul className="model-list">
            {health.models.map((model, index) => (
              <li key={model.name} className={model.available ? "ok" : "bad"}>
                <div>
                  <strong>{modelLabel(model.name)}</strong>
                  <small>{index === 0 ? "Principal" : "Respaldo"} · {model.name}</small>
                </div>
                <span>{model.available ? "Disponible" : `Agotado${model.retryAt ? `, vuelve ${formatClock(model.retryAt)}` : ""}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel-card pipeline">
        <h2>Cómo decide</h2>
        <ol>
          <li>Subes una foto y el servidor la reduce a 384 px y la envía en resolución baja, para gastar pocos tokens.</li>
          <li>Cada escaneo hace una sola petición, al modelo principal.</li>
          <li>Si ese modelo ya no tiene cupo, la misma foto va al modelo de respaldo.</li>
          <li>Nunca se pasa de {health.perMinute || "6"} peticiones por minuto. Si se llega al límite, clasifican MIRA y TrashNet en el servidor.</li>
          <li>Si vuelves a subir la misma foto, se reutiliza el resultado y no se gasta otra petición.</li>
          <li>Con la cámara en vivo, MIRA y TrashNet corren en tu navegador y no gastan Gemini.</li>
        </ol>
      </section>
    </div>
  );
}

function formatClock(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
