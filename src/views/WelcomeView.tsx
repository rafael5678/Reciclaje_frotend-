import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImpactPanel } from "../components/ImpactPanel";
import { Brand } from "../components/Logo";
import { PlanetScene } from "../components/PlanetScene";
import type { Impact } from "../models/types";
import { authService } from "../services/authService";
import { impactService } from "../services/impactService";
import { useSession } from "./SessionProvider";

export function WelcomeView() {
  const navigate = useNavigate();
  const { session, setSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [note, setNote] = useState("");
  const wide = window.matchMedia("(min-width: 960px)").matches;

  useEffect(() => {
    if (!open) return;
    if (!session) {
      setImpact(null);
      setNote("Aún no tienes escaneos. Pulsa Comenzar y recicla tu primer residuo: aquí verás tu impacto real.");
      return;
    }
    let alive = true;
    setNote("Cargando tus datos…");
    impactService
      .get()
      .then((data) => {
        if (!alive) return;
        setImpact(data);
        setNote(data.total ? `Así vas, ${session.user.name.split(" ")[0]}. Cada objeto bien separado cuenta.` : "Todavía no escaneas nada. El primer residuo suma 10 puntos.");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setImpact(null);
        setNote(`No pude traer tus datos: ${err.message}`);
      });
    return () => {
      alive = false;
    };
  }, [open, session]);

  async function go(path: string) {
    if (session) {
      navigate(path);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setSession((await authService.guest()).session);
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude entrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="welcome-hero">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className="welcome-top"><Brand /></header>
      <section className={open ? "hero-stage is-open" : "hero-stage"}>
        <PlanetScene open={open} onToggle={() => setOpen((value) => !value)} />
        {open ? <ImpactPanel impact={impact} note={note} onClose={() => setOpen(false)} /> : null}
      </section>
      <section className="welcome-copy">
        <h1>Tu aliado en el <span className="grad">reciclaje inteligente</span></h1>
        <p>Sube una foto del residuo y te decimos en qué contenedor va, con los pasos para dejarlo bien.</p>
        {error ? <p className="sheet-error">{error}</p> : null}
        <button className="cta cta-glow cta-xl" onClick={() => void go(wide ? "/panel" : "/app/escaner")} disabled={busy}>
          {busy ? "Entrando…" : session ? `Seguir como ${session.user.name.split(" ")[0]} →` : "Comenzar →"}
        </button>
        <button className="ghost-link" onClick={() => navigate("/login")}>
          {session ? "Entrar con otra cuenta" : "Iniciar sesión"}
        </button>
        <button className="ghost-link dim" onClick={() => void go("/panel")} disabled={busy}>Abrir panel de escritorio</button>
      </section>
    </main>
  );
}
