import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Earth } from "../components/Earth";
import { Icon } from "../components/Icons";
import { Brand } from "../components/Logo";
import { DEMO, authService } from "../services/authService";
import { useSession } from "./SessionProvider";

export function WelcomeView() {
  const navigate = useNavigate();
  const { session, setSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enter(path: string) {
    if (session) {
      navigate(path);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await authService.login(DEMO.email, DEMO.password);
      setSession(next);
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude iniciar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="welcome">
      <section className="welcome-card">
        <Brand />
        <Earth className="welcome-earth" />
        <h1>Tu aliado en el reciclaje inteligente</h1>
        <p>Usa la cámara de tu celular para identificar y clasificar residuos en tiempo real.</p>
        {error ? <p className="sheet-error">{error}</p> : null}
        <button className="cta" onClick={() => void enter(window.matchMedia("(min-width: 960px)").matches ? "/panel/escanear" : "/app/escaner")} disabled={busy}>
          {busy ? "Entrando..." : "Comenzar"}
          {!busy ? <Icon name="arrow" size={18} /> : null}
        </button>
        <button className="ghost-link" onClick={() => navigate("/login")}>Iniciar sesión</button>
        <button className="ghost-link dim" onClick={() => void enter("/panel")}>Abrir panel de escritorio</button>
      </section>
    </main>
  );
}
