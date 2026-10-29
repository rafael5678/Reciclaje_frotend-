import { useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon, type IconName } from "../components/Icons";
import { Brand } from "../components/Logo";
import { ServerBar } from "../components/ServerBar";
import { Planet } from "../components/Planet";
import { authService, type AuthResult } from "../services/authService";
import { prefersReducedMotion } from "../services/motion";
import { useSession } from "./SessionProvider";

const LEAVES = Array.from({ length: 9 }, (_, index) => index);

export function LoginView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session: current, setSession } = useSession();
  const card = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"login" | "register">(params.get("modo") === "registro" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [moved, setMoved] = useState(0);
  const fromGuest = Boolean(current?.user.guest);

  async function run(action: () => Promise<AuthResult>) {
    setBusy(true);
    setError("");
    try {
      const { session, moved: count } = await action();
      setMoved(count);
      setDone(true);
      window.setTimeout(() => {
        setSession(session);
        navigate("/panel");
      }, prefersReducedMotion() ? 0 : count ? 1600 : 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => (mode === "login" ? authService.login(email, password) : authService.register(name, email, password)));
  }

  function tilt(event: PointerEvent<HTMLElement>) {
    if (!card.current || prefersReducedMotion() || event.pointerType !== "mouse") return;
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    card.current.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
    card.current.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
  }

  function resetTilt() {
    card.current?.style.setProperty("--ry", "0deg");
    card.current?.style.setProperty("--rx", "0deg");
  }

  const label = mode === "login" ? "Entrar" : "Crear cuenta";

  return (
    <main className="auth" onPointerMove={tilt} onPointerLeave={resetTilt}>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="leaf-rain" aria-hidden="true">
        {LEAVES.map((index) => <span key={index} style={{ ["--i" as string]: index }} />)}
      </div>
      <section ref={card} className={`auth-card glass${shake ? " is-shake" : ""}${done ? " is-done" : ""}`}>
        <div className="auth-planet">
          <Planet spinning size={112} />
          <span className="auth-orbit" />
        </div>
        <Brand />
        <div className="auth-tabs" role="tablist" data-mode={mode}>
          <span className="auth-tabs-pill" />
          <button role="tab" type="button" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Iniciar sesión</button>
          <button role="tab" type="button" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Crear cuenta</button>
        </div>
        <p className="auth-lead">
          {mode === "login" ? "Qué bueno verte de nuevo. Tu historial te espera." : "Crea tu cuenta y guarda cada residuo que separes."}
        </p>
        {fromGuest ? <p className="auth-guest-note">🌱 Estás como invitado: al entrar o crear tu cuenta, tus escaneos de invitado pasan a ella.</p> : null}
        {done && moved ? <p className="auth-moved" role="status">Pasamos {moved} {moved === 1 ? "escaneo" : "escaneos"} de invitado a tu cuenta.</p> : null}
        <form onSubmit={submit} className="form auth-form" key={mode}>
          {mode === "register" ? (
            <Field icon="user" label="Nombre">
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" placeholder=" " />
            </Field>
          ) : null}
          <Field icon="mail" label="Correo">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder=" " />
          </Field>
          <Field
            icon="lock"
            label="Contraseña"
            action={
              <button type="button" className="field-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            }
          >
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder=" "
            />
          </Field>
          {error ? <p className="sheet-error auth-error" role="alert">{error}</p> : null}
          {error ? <ServerBar /> : null}
          <button className="cta cta-glow auth-submit" disabled={busy}>
            {done ? <><Icon name="check" size={18} /> ¡Listo!</> : busy ? <span className="spinner" aria-label="Cargando" /> : label}
          </button>
        </form>
        <div className="auth-divider"><span>o</span></div>
        {fromGuest ? (
          <button className="ghost-btn" type="button" disabled={busy} onClick={() => navigate("/panel")}>
            Seguir como invitado
          </button>
        ) : (
          <button className="ghost-btn" type="button" disabled={busy} onClick={() => void run(() => authService.guest())}>
            🌱 Probar como invitado
          </button>
        )}
        <Link className="ghost-link dim" to="/">Volver al inicio</Link>
      </section>
    </main>
  );
}

function Field({ icon, label, action, children }: { icon: IconName; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <label className="float-field">
      <Icon name={icon} size={18} />
      {children}
      <span>{label}</span>
      {action}
    </label>
  );
}
