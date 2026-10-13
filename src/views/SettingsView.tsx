import { useNavigate } from "react-router-dom";
import { initials } from "../services/format";
import { useSession } from "./SessionProvider";

export function SettingsView() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const name = session?.user.name ?? "";

  return (
    <div className="settings-page">
      <header className="page-head light-text">
        <div>
          <h1>Configuración</h1>
          <p>Tu cuenta guarda el historial. Las fotos se analizan en la nube con Gemini.</p>
        </div>
      </header>
      <section className="panel-card settings-card">
        <span className="avatar lg">{initials(name)}</span>
        <div>
          <h2>{name}</h2>
          <p>{session?.user.email}</p>
        </div>
      </section>
      <section className="panel-card settings-list">
        <div><strong>Motor</strong><span>Gemini, con apoyo de MIRA y TrashNet</span></div>
        <div><strong>Cuenta demo</strong><span>rafael@ecoscan.app · ecoscan123</span></div>
        <div><strong>Privacidad</strong><span>La foto se usa para clasificar. El historial queda en tu cuenta.</span></div>
      </section>
      <button
        className="cta cta-inline"
        onClick={() => {
          logout();
          navigate("/");
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
