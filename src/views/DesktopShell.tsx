import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Icon, type IconName } from "../components/Icons";
import { Brand } from "../components/Logo";
import { firstName, initials } from "../services/format";
import { modelLabel } from "../services/healthService";
import { useSession } from "./SessionProvider";
import { refreshServerHealth, useServerHealth } from "./useServerHealth";

const LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/panel", label: "Inicio", icon: "home", end: true },
  { to: "/panel/escanear", label: "Escanear", icon: "camera" },
  { to: "/panel/historial", label: "Historial", icon: "history" },
  { to: "/panel/estadisticas", label: "Estadísticas", icon: "chart" },
  { to: "/panel/guia", label: "Guía de materiales", icon: "book" },
  { to: "/panel/modelo", label: "Modelo", icon: "cpu" },
  { to: "/panel/configuracion", label: "Configuración", icon: "settings" },
];

export function DesktopShell() {
  return (
    <div className="desk">
      <aside className="side">
        <Link to="/panel" className="brand-link"><Brand /></Link>
        <nav>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "side-link is-on" : "side-link")}>
              <Icon name={link.icon} size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <ServerCard />
      </aside>
      <div className="desk-main">
        <Topbar />
        <Outlet />
      </div>
    </div>
  );
}

function Topbar() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const guest = Boolean(session?.user.guest);
  const name = session?.user.name ?? "";
  return (
    <header className="topbar">
      <div className="hello">
        <i />
        <div>
          <strong>¡Hola, {firstName(name)}!</strong>
          <span>{guest ? "Estás probando EcoScan como invitado." : "Sigamos haciendo un mejor planeta."}</span>
        </div>
      </div>
      <div className="top-actions">
        {guest ? <Link to="/login?modo=registro" className="cta cta-inline cta-sm">Crear mi cuenta</Link> : null}
        <div className="bell-wrap">
          <button className="bell" onClick={() => setOpen((value) => !value)} aria-label="Avisos">
            <Icon name="bell" size={18} />
          </button>
          {open ? <div className="bell-pop">Separa limpio y seco. Un solo material mal puesto puede echar a perder el lote.</div> : null}
        </div>
        <Link to="/panel/configuracion" className="userchip">
          <span className="avatar sm">{initials(name)}</span>
          {name}
          <Icon name="chevron" size={16} />
        </Link>
      </div>
    </header>
  );
}

function ServerCard() {
  const health = useServerHealth();
  const ready = health.models.find((model) => model.available);
  if (health.state === "checking") {
    return (
      <div className="side-card status-card is-wait">
        <strong><i />Conectando…</strong>
        <p>Si el servidor estaba dormido, tarda unos segundos en despertar.</p>
      </div>
    );
  }
  if (health.state === "offline") {
    return (
      <div className="side-card status-card is-off">
        <strong><i />Sin conexión</strong>
        <p>{health.error}</p>
        <button className="text-btn" onClick={() => void refreshServerHealth()}>Reintentar</button>
      </div>
    );
  }
  return (
    <div className={health.database ? "side-card status-card" : "side-card status-card is-off"}>
      <strong><i />{health.database ? "Servidor conectado" : "Base de datos caída"}</strong>
      <p>
        {!health.gemini
          ? "Gemini no está configurado. Se usan los modelos locales."
          : ready
            ? `IA: ${modelLabel(ready.name)} · ${health.usedLastMinute}/${health.perMinute} por minuto`
            : "Gemini agotado por ahora. Se usan MIRA y TrashNet."}
      </p>
    </div>
  );
}
