import { Link, useNavigate } from "react-router-dom";
import { initials } from "../services/format";
import { modelLabel } from "../services/healthService";
import { useSession } from "./SessionProvider";
import { useServerHealth } from "./useServerHealth";

export function SettingsView() {
  const { session, logout } = useSession();
  const health = useServerHealth();
  const navigate = useNavigate();
  const guest = Boolean(session?.user.guest);
  const name = session?.user.name ?? "";
  const engines = health.models.map((model) => modelLabel(model.name)).join(" y ");

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
