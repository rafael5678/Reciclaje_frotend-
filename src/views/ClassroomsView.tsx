import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons";
import { classroomRepository, type Classroom, type RankingRow } from "../repositories/classroomRepository";
import { formatKg } from "../services/format";
import { useSession } from "./SessionProvider";

const MEDALS = ["🥇", "🥈", "🥉"];

export function ClassroomsView() {
  const { session, revision } = useSession();
  const guest = Boolean(session?.user.guest);
  const [rooms, setRooms] = useState<Classroom[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [ranking, setRanking] = useState<{ classroom: Classroom; rows: RankingRow[] } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadRooms = useCallback(async (focus?: number) => {
    try {
      const list = await classroomRepository.list();
      setRooms(list);
      setSelected((current) => focus ?? (list.some((room) => room.id === current) ? current : list[0]?.id ?? null));
    } catch (err) {
      setRooms([]);
      setError(err instanceof Error ? err.message : "No pude cargar tus salones");
    }
  }, []);

  useEffect(() => {
    if (guest) return;
    void loadRooms();
  }, [guest, loadRooms]);

  useEffect(() => {
    if (selected === null) {
      setRanking(null);
      return;
    }
    let alive = true;
    classroomRepository
      .ranking(selected)
      .then((data) => {
        if (alive) setRanking(data);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [selected, revision]);

  async function run(action: () => Promise<Classroom>, reset: () => void) {
    setBusy(true);
    setError("");
    try {
      const room = await action();
      reset();
      await loadRooms(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar");
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    void run(() => classroomRepository.create(name), () => setName(""));
  }

  function join(event: FormEvent) {
    event.preventDefault();
    void run(() => classroomRepository.join(code), () => setCode(""));
  }

  async function leave(room: Classroom) {
    if (!window.confirm(`¿Salir de «${room.name}»?`)) return;
    try {
      await classroomRepository.leave(room.id);
      setSelected(null);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude sacarte del salón");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (guest) {
    return (
      <div className="rooms-page">
        <header className="page-hero">
          <h1>Salones y <em>ranking</em></h1>
          <p>Compite sanamente con tu salón o tus amigos: gana quien más recicla bien.</p>
        </header>
        <section className="glass-card rooms-guest">
          <span aria-hidden="true">🏆</span>
          <h2>Crea tu cuenta para entrar a un salón</h2>
          <p>El ranking necesita saber quién eres. Tus escaneos de invitado pasan a tu cuenta al crearla.</p>
          <Link className="cta cta-glow" to="/login?modo=registro">Crear mi cuenta</Link>
        </section>
      </div>
    );
  }

  const podium = ranking?.rows.slice(0, 3) ?? [];

  return (
    <div className="rooms-page">
      <header className="page-hero">
        <h1>Salones y <em>ranking</em></h1>
        <p>Compite sanamente con tu salón o tus amigos: gana quien más recicla bien.</p>
      </header>
      {error ? <p className="sheet-error">{error}</p> : null}
      <section className="rooms-grid">
        <aside className="tile-stack">
          <section className="glass-card">
            <h2>Mis salones</h2>
            {rooms === null ? <p className="loading">Cargando…</p> : rooms.length === 0 ? (
              <p className="empty">Aún no estás en ningún salón. Crea uno o únete con un código.</p>
            ) : (
              <ul className="room-list">
                {rooms.map((room) => (
                  <li key={room.id}>
                    <button className={room.id === selected ? "is-on" : ""} onClick={() => setSelected(room.id)}>
                      <strong>{room.name}</strong>
                      <small>{room.members} {room.members === 1 ? "miembro" : "miembros"}{room.isOwner ? " · tú lo creaste" : ""}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <form className="glass-card room-form" onSubmit={create}>
            <h2>Crear salón</h2>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: Séptimo semestre A" minLength={3} maxLength={60} required />
            <button className="cta cta-glow cta-sm" disabled={busy}>Crear</button>
          </form>
          <form className="glass-card room-form" onSubmit={join}>
            <h2>Unirme con código</h2>
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ej: X6WVCC" minLength={4} maxLength={12} required />
            <button className="ghost-btn" disabled={busy}>Unirme</button>
          </form>
        </aside>

        <section className="glass-card ranking-card">
          {!ranking ? (
            <p className="empty">{rooms?.length ? "Cargando ranking…" : "Cuando tengas un salón, aquí verás el ranking."}</p>
          ) : (
            <>
              <header className="ranking-head">
                <div>
                  <h2>{ranking.classroom.name}</h2>
                  <p>{ranking.rows.length} {ranking.rows.length === 1 ? "miembro" : "miembros"} · comparte el código para que se unan</p>
                </div>
                <button className="code-chip" onClick={() => void copy(ranking.classroom.code)} aria-label="Copiar código del salón">
                  <Icon name="copy" size={15} />
                  {copied ? "¡Copiado!" : ranking.classroom.code}
                </button>
              </header>
              <div className="podium">
                {podium.map((row, index) => (
                  <div key={`${row.position}-${row.name}`} className={`podium-step step-${index + 1}${row.isMe ? " is-me" : ""}`}>
                    <span className="medal" aria-hidden="true">{MEDALS[index]}</span>
                    <strong>{row.name}</strong>
                    <small>{row.points} pts</small>
                  </div>
                ))}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Nombre</th><th>Escaneos</th><th>Puntos</th><th>Esta semana</th><th>CO₂ evitado</th></tr>
                  </thead>
                  <tbody>
                    {ranking.rows.map((row) => (
                      <tr key={`${row.position}-${row.name}`} className={row.isMe ? "is-me" : ""}>
                        <td>{row.position}</td>
                        <td>{row.name}{row.isMe ? <span className="me-badge">Tú</span> : null}</td>
                        <td>{row.scans}</td>
                        <td><strong>{row.points}</strong></td>
                        <td>+{row.weekPoints}</td>
                        <td>{formatKg(row.co2Kg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="text-btn leave-btn" onClick={() => void leave(ranking.classroom)}>Salir de este salón</button>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
