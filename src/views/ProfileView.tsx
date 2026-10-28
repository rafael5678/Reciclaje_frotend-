import { Link, useNavigate } from "react-router-dom";
import { formatKg, formatPoints, initials } from "../services/format";
import { useSession } from "./SessionProvider";
import { useImpact } from "./useImpact";

export function ProfileView() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const { impact, error } = useImpact();
  const guest = Boolean(session?.user.guest);
  const name = session?.user.name ?? "";

  return (
    <div className="profile">
      <div className="profile-hero">
        <span className="avatar lg">{initials(name)}</span>
        <h1>{name}</h1>
        <p>{guest ? "Modo invitado: si cierras sesión, pierdes estos escaneos" : session?.user.email}</p>
      </div>
      {error ? <p className="sheet-error">{error}</p> : null}
      <section className="profile-stats">
        <div><strong>{impact ? formatPoints(impact.points) : "—"}</strong><span>puntos</span></div>
        <div><strong>{impact ? impact.total : "—"}</strong><span>escaneos</span></div>
        <div><strong>{impact ? formatKg(impact.co2Kg) : "—"}</strong><span>CO₂ evitado</span></div>
      </section>
      <div className="profile-links">
        {guest ? <Link to="/login?modo=registro">Crear mi cuenta</Link> : null}
        <Link to="/panel">Abrir panel de escritorio</Link>
        <Link to="/app/guia">Ver guía de materiales</Link>
        <button
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
