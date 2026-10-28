import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Earth } from "../components/Earth";
import { Brand } from "../components/Logo";
import { authService } from "../services/authService";
import { useSession } from "./SessionProvider";

export function LoginView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useSession();
  const [mode, setMode] = useState<"login" | "register">(params.get("modo") === "registro" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<Parameters<typeof setSession>[0]>) {
    setBusy(true);
    setError("");
    try {
      setSession(await action());
      navigate("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => (mode === "login" ? authService.login(email, password) : authService.register(name, email, password)));
  }

  return (
    <main className="welcome">
      <section className="welcome-card auth-card">
        <Brand />
        <Earth className="welcome-earth small" />
        <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p>Con tu cuenta, cada escaneo queda guardado en tu historial.</p>
        <form onSubmit={submit} className="form">
          {mode === "register" ? (
            <label className="field">
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" />
            </label>
          ) : null}
          <label className="field">
            Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label className="field">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error ? <p className="sheet-error">{error}</p> : null}
          <button className="cta" disabled={busy}>{busy ? "Espera..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
        </form>
        <button className="ghost-btn" type="button" disabled={busy} onClick={() => void run(() => authService.guest())}>
          Probar como invitado
        </button>
        <button className="ghost-link" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
        </button>
        <Link className="ghost-link dim" to="/">Volver</Link>
      </section>
    </main>
  );
}
