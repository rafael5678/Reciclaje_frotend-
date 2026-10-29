import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initials } from "../services/format";
import { modelLabel } from "../services/healthService";
import { getApiBase, setApiBase } from "../repositories/http";
import { useSession } from "./SessionProvider";
import { refreshServerHealth, useServerHealth } from "./useServerHealth";

export function SettingsView() {
  const { session, logout } = useSession();
  const health = useServerHealth();
  const navigate = useNavigate();
  const guest = Boolean(session?.user.guest);
  const name = session?.user.name ?? "";
  const engines = health.models.map((model) => modelLabel(model.name)).join(" y ");
  const [apiInput, setApiInput] = useState(getApiBase());
  const [apiNote, setApiNote] = useState("");
  const [savingApi, setSavingApi] = useState(false);

  async function saveApi(event: FormEvent) {
    event.preventDefault();
    setSavingApi(true);
    setApiNote("");
    setApiBase(apiInput);
    await refreshServerHealth();
    setSavingApi(false);
    setApiNote("URL guardada. Si el servidor estaba dormido, espera unos segundos y pulsa Reintentar en el menú.");
  }

  return (
    <div className="settings-page">
      <header className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>{guest ? "Estás en modo invitado. Crea tu cuenta para conservar tu historial." : "Tu cuenta guarda el historial de escaneos."}</p>
        </div>
      </header>
      <section className="panel-card settings-card">
        <span className="avatar lg">{initials(name)}</span>
        <div>
          <h2>{name}</h2>
          <p>{guest ? "Invitado" : session?.user.email}</p>
        </div>
      </section>
      <section className="panel-card settings-list">
        <div><strong>Motor</strong><span>{engines ? `${engines}, con MIRA y TrashNet de respaldo` : "MIRA y TrashNet"}</span></div>
        <div><strong>Base de datos</strong><span>{health.state !== "online" ? "Sin conexión" : health.database ? "Conectada" : "No disponible"}</span></div>
        <div><strong>Privacidad</strong><span>La foto se usa para clasificar. El historial queda en tu cuenta.</span></div>
      </section>
      <form className="panel-card settings-api" onSubmit={(event) => void saveApi(event)}>
        <strong>Servidor (Render)</strong>
        <p>Si el panel dice «sin conexión», pega aquí la URL de tu API en Render, sin barra al final. Ejemplo: https://tu-servicio.onrender.com</p>
        <input
          value={apiInput}
          onChange={(event) => setApiInput(event.target.value)}
          placeholder="https://tu-api.onrender.com"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="cta cta-sm" disabled={savingApi}>{savingApi ? "Guardando…" : "Guardar URL"}</button>
        {apiNote ? <small>{apiNote}</small> : null}
      </form>
      <div className="settings-actions">
        {guest ? <Link className="cta cta-inline" to="/login?modo=registro">Crear mi cuenta</Link> : null}
        <button
          className={guest ? "ghost-btn" : "cta cta-inline"}
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
