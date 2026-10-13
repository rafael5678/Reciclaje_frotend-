import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Icon, type IconName } from "../components/Icons";

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: "/app/escaner", label: "Escáner", icon: "scan" },
  { to: "/app/impacto", label: "Impacto", icon: "impact" },
  { to: "/app/guia", label: "Guía", icon: "guide" },
  { to: "/app/perfil", label: "Perfil", icon: "user" },
];

const DESKTOP_ROUTE: Record<string, string> = {
  "/app": "/panel/escanear",
  "/app/escaner": "/panel/escanear",
  "/app/impacto": "/panel",
  "/app/guia": "/panel/guia",
  "/app/perfil": "/panel/configuracion",
  "/app/resultado": "/panel/resultado",
};

export function PhoneShell() {
  const { pathname } = useLocation();
  const wide = useWideScreen();
  if (wide) return <Navigate to={DESKTOP_ROUTE[pathname] ?? "/panel/escanear"} replace />;
  const hideNav = pathname.includes("escaner") || pathname.includes("resultado");
  return (
    <div className="stage">
      <div className="phone">
        <div className={hideNav ? "phone-screen is-full" : "phone-screen"}>
          <Outlet />
        </div>
        {hideNav ? null : (
          <nav className="tabbar">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "tab is-on" : "tab")}>
                <Icon name={tab.icon} size={20} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function useWideScreen() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 960px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 960px)");
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}
