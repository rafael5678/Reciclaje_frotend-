/** Account, server status, and AI models. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initials } from "../services/format";
import { modelLabel } from "../services/format";
import { useSession } from "../context/SessionProvider";
import { useServerHealth } from "../hooks/useServerHealth";
import { api } from "../repositories/http";

type PasswordStorage = {
  algorithm: string;
  iterations: number;
  salt_bytes: number;
  salted: boolean;
  returned_to_client: boolean;
};

export function SettingsView() {
  const { session, logout } = useSession();
  const health = useServerHealth();
  const navigate = useNavigate();
  const guest = Boolean(session?.user.guest);
  const name = session?.user.name ?? "";
  const engines = health.models.map((model) => modelLabel(model.name)).join(" y ");
  const [storage, setStorage] = useState<PasswordStorage | null>(null);

  useEffect(() => {
    api<PasswordStorage>("/api/auth/security", {}, null, { retries: [] })
      .then(setStorage)
      .catch(() => setStorage(null));
  }, []);

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
        <div>
          <strong>Contraseñas</strong>
          <span>
            {storage
              ? `Cifradas en el servidor con ${storage.algorithm} (${storage.iterations.toLocaleString("es-CO")} iteraciones, sal de ${storage.salt_bytes} bytes). Nunca se devuelven al navegador.`
              : "Se guardan con PBKDF2-SHA256 y sal. El navegador no recibe el hash."}
          </span>
        </div>
      </section>
      <p className="hint-dim">
        Para comprobarlo en F12: pestaña Red → entra o regístrate → la respuesta de <code>/api/auth/login</code> solo trae token, nombre y correo. En Aplicación → Local Storage → <code>ecoscan.session</code> tampoco hay contraseña.
      </p>
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
