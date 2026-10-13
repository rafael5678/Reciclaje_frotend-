import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Impact } from "../models/types";
import { formatKg, formatPoints, initials } from "../services/format";
import { impactService } from "../services/impactService";
import { useSession } from "./SessionProvider";

export function ProfileView() {
  const { session, logout, revision } = useSession();
  const navigate = useNavigate();
  const [impact, setImpact] = useState<Impact | null>(null);
  const name = session?.user.name ?? "";

  useEffect(() => {
    let alive = true;
    impactService.get().then((data) => {
      if (alive) setImpact(data);
    });
    return () => {
      alive = false;
    };
  }, [revision]);

  return (
    <div className="profile">
      <div className="profile-hero">
        <span className="avatar lg">{initials(name)}</span>
        <h1>{name}</h1>
        <p>{session?.user.email}</p>
        <span className="badge badge-live">Clasificación en el dispositivo</span>
      </div>
      <section className="profile-stats">
        <div><strong>{formatPoints(impact?.points ?? 0)}</strong><span>puntos</span></div>
        <div><strong>{impact?.total ?? 0}</strong><span>escaneos</span></div>
        <div><strong>{formatKg(impact?.co2Kg ?? 0)}</strong><span>CO₂ evitado</span></div>
      </section>
      <div className="profile-links">
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
