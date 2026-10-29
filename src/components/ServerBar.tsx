import { useState, type FormEvent } from "react";
import { getApiBase, setApiBase } from "../repositories/http";
import { refreshServerHealth } from "../views/useServerHealth";

export function ServerBar() {
  const [url, setUrl] = useState(getApiBase());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setApiBase(url);
    await refreshServerHealth();
    setBusy(false);
    setNote("URL guardada en este navegador. Vuelve a pulsar Comenzar o Iniciar sesión.");
  }

  return (
    <form className="server-bar" onSubmit={(event) => void save(event)}>
      <p>
        Pega la URL de tu API en Render, la que ves arriba en el servicio y termina en <strong>.onrender.com</strong>.
        Sin barra al final.
      </p>
      <div className="server-bar-row">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://tu-servicio.onrender.com"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="cta cta-sm" disabled={busy}>{busy ? "Guardando…" : "Usar esta URL"}</button>
      </div>
      {note ? <small>{note}</small> : null}
    </form>
  );
}
