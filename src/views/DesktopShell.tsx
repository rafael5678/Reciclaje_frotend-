import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon, type IconName } from "../components/Icons";
import { Brand } from "../components/Logo";
import { firstName, initials } from "../services/format";
import { readVisionMeta } from "../services/visionService";
import { useSession } from "./SessionProvider";

const DARK_LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/panel", label: "Inicio", icon: "home", end: true },
  { to: "/panel/escanear", label: "Escanear", icon: "camera" },
  { to: "/panel/historial", label: "Historial", icon: "history" },
  { to: "/panel/estadisticas", label: "Estadísticas", icon: "chart" },
  { to: "/panel/modelo", label: "Modelo", icon: "cpu" },
  { to: "/panel/configuracion", label: "Configuración", icon: "settings" },
];

const LIGHT_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: "/panel/escanear", label: "Escanear", icon: "camera" },
  { to: "/panel/historial", label: "Mis escaneos", icon: "history" },
  { to: "/panel/guia", label: "Guía de materiales", icon: "book" },
  { to: "/panel/modelo", label: "Modelo", icon: "cpu" },
];

export function DesktopShell() {
  const { pathname } = useLocation();
  const light = ["/panel/historial", "/panel/guia", "/panel/modelo"].some((path) => pathname.startsWith(path));
  if (light) {
    return (
      <div className="light-app">
        <aside className="light-side">
          <Link to="/panel" className="brand-link"><Brand tone="light" /></Link>
          <nav>
            {LIGHT_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "side-link is-on" : "side-link")}>
                <Icon name={link.icon} size={18} />
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Link className="side-back" to="/panel">Volver al inicio</Link>
        </aside>
        <div className="light-main">
          <Outlet />
        </div>
        <ModelBadge />
      </div>
    );
  }
  return (
    <div className="desk">
      <aside className="side">
        <Link to="/panel" className="brand-link"><Brand /></Link>
        <nav>
          {DARK_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "side-link is-on" : "side-link")}>
              <Icon name={link.icon} size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-card">
          <strong>Pequeñas acciones, grandes cambios</strong>
          <p>Juntos reducimos la contaminación.</p>
        </div>
      </aside>
      <div className="desk-main">
        <DarkTopbar />
        <Outlet />
      </div>
    </div>
  );
}

function DarkTopbar() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const name = session?.user.name ?? "EcoScan";
  return (
    <header className="topbar">
      <div className="hello">
        <i />
        <div>
          <strong>¡Hola, {firstName(name)}!</strong>
          <span>Sigamos haciendo un mejor planeta.</span>
        </div>
      </div>
      <div className="top-actions">
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

function ModelBadge() {
  const meta = readVisionMeta();
  return (
    <div className="model-badge">
      <i />
      <div>
        <strong>Modelo cargado</strong>
        <span>EcoScan-Lite · {meta ? `${meta.ms} ms` : "en el dispositivo"}</span>
      </div>
    </div>
  );
}
