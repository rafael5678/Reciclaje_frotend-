import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Earth } from "../components/Earth";
import { Icon } from "../components/Icons";
import { Brand } from "../components/Logo";
import { authService } from "../services/authService";
import { useSession } from "./SessionProvider";

export function WelcomeView() {
  const navigate = useNavigate();
  const { session, setSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const home = window.matchMedia("(min-width: 960px)").matches ? "/panel" : "/app/escaner";

  async function tryAsGuest() {
    setBusy(true);
    setError("");
    try {
      setSession(await authService.guest());
      navigate(home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude entrar como invitado");
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
        <p>Sube una foto del residuo y te decimos en qué contenedor va, con los pasos para dejarlo bien.</p>
        {error ? <p className="sheet-error">{error}</p> : null}
        {session ? (
          <button className="cta" onClick={() => navigate(home)}>
            Seguir como {session.user.name}
            <Icon name="arrow" size={18} />
          </button>
        ) : (
          <>
            <button className="cta" onClick={() => navigate("/login")}>
              Iniciar sesión
              <Icon name="arrow" size={18} />
            </button>
            <button className="ghost-btn" onClick={() => void tryAsGuest()} disabled={busy}>
              {busy ? "Entrando..." : "Probar como invitado"}
            </button>
            <button className="ghost-link dim" onClick={() => navigate("/login?modo=registro")}>Crear una cuenta</button>
          </>
        )}
      </section>
    </main>
  );
}
