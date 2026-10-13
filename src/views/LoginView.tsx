import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Earth } from "../components/Earth";
import { Brand } from "../components/Logo";
import { DEMO, authService } from "../services/authService";
import { useSession } from "./SessionProvider";

export function LoginView() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = mode === "login"
        ? await authService.login(email, password)
        : await authService.register(name, email, password);
      setSession(session);
      navigate("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="welcome">
      <section className="welcome-card auth-card">
        <Brand />
        <Earth className="welcome-earth small" />
        <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p>Tu historial y tu impacto se guardan en tu cuenta. La cámara sigue trabajando en el dispositivo.</p>
        <form onSubmit={(event) => void submit(event)} className="form">
          {mode === "register" ? (
            <label className="field">
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
            </label>
          ) : null}
          <label className="field">
            Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          </label>
          {error ? <p className="sheet-error">{error}</p> : null}
          <button className="cta" disabled={busy}>{busy ? "Espera..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
        </form>
        {mode === "login" ? (
          <button
            className="demo-chip"
            type="button"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
            }}
          >
            Usar la cuenta de demostración
          </button>
        ) : null}
        <button className="ghost-link" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
        </button>
        <Link className="ghost-link dim" to="/">Volver</Link>
      </section>
    </main>
  );
}
