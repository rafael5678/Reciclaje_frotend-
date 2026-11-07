/** Sorting lab: take pieces apart and throw them into the right bin. */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { LoadState } from "../components/LoadState";
import { Planet } from "../components/Planet";
import { useImpact } from "../hooks/useImpact";
import { useSession } from "../context/SessionProvider";
import type { LabPiece, LabThrowResult, LabSpecimen } from "../models/lab";
import { groveFrom } from "../services/forest";
import { labCatalog } from "../services/labCatalog";
import { labService } from "../services/labService";

export function LabView() {
  const { impact, error, retry } = useImpact();
  const { bump } = useSession();
  const [specimenId, setSpecimenId] = useState(labCatalog.specimens()[0].id);
  const [prepared, setPrepared] = useState<Set<string>>(() => new Set());
  const [sorted, setSorted] = useState<Set<string>>(() => new Set());
  const [held, setHeld] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [peelId, setPeelId] = useState<string | null>(null);
  const [peelX, setPeelX] = useState(0);
  const [feedback, setFeedback] = useState<LabThrowResult | null>(null);
  const [points, setPoints] = useState(0);
  const binsRef = useRef<HTMLDivElement>(null);

  const specimen = labCatalog.specimens().find((item) => item.id === specimenId) ?? labCatalog.specimens()[0];
  const pieces = useMemo(() => labCatalog.piecesFor(specimen), [specimen]);

  useEffect(() => {
    if (impact) setPoints(impact.points);
  }, [impact]);

  function isPrepared(piece: LabPiece) {
    return piece.prep === "none" || prepared.has(piece.id);
  }

  function isLocked(piece: LabPiece) {
    return piece.lockedUntil.some((id) => !prepared.has(id) && !sorted.has(id));
  }

  function isReady(piece: LabPiece) {
    return !sorted.has(piece.id) && !isLocked(piece) && isPrepared(piece);
  }

  function prepare(piece: LabPiece) {
    setPrepared((current) => {
      const next = new Set(current);
      next.add(piece.id);
      return next;
    });
    setFeedback(null);
  }

  function onPiecePointer(piece: LabPiece, event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    if (sorted.has(piece.id)) return;
    if (isLocked(piece)) {
      setFeedback(lockHint(piece));
      return;
    }
    if (!isPrepared(piece) && piece.prep === "unscrew") {
      prepare(piece);
      return;
    }
    if (!isPrepared(piece) && piece.prep === "peel") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setPeelId(piece.id);
      setPeelX(8);
      return;
    }
    if (!isReady(piece)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(piece.id);
    setCursor({ x: event.clientX, y: event.clientY });
  }

  function onMove(event: PointerEvent<HTMLElement>) {
    if (peelId) {
      setPeelX((value) => Math.min(130, value + Math.max(0, event.movementX) + Math.abs(event.movementY) * 0.15));
      return;
    }
    if (!held) return;
    setCursor({ x: event.clientX, y: event.clientY });
  }

  function onUp(event: PointerEvent<HTMLElement>) {
    if (peelId) {
      const piece = labCatalog.piece(peelId);
      if (piece && peelX > 64) prepare(piece);
      setPeelId(null);
      setPeelX(0);
      return;
    }
    if (!held) return;
    const binId = hitBin(binsRef.current, event.clientX, event.clientY);
    const dropping = held;
    setHeld(null);
    if (binId) void toss(dropping, binId);
  }

  async function toss(pieceId: string, binId: string) {
    const piece = labCatalog.piece(pieceId);
    if (!piece || sorted.has(pieceId) || isLocked(piece) || !isPrepared(piece)) return;
    const scanPoints = impact?.points ?? points;
    const result = await labService.throw(pieceId, binId, scanPoints);
    setFeedback(result);
    setPoints(result.points);
    if (result.correct) {
      setSorted((current) => {
        const next = new Set(current);
        next.add(pieceId);
        return next;
      });
    }
    bump();
  }

  const grove = groveFrom(points, impact?.categories[0]?.name);
  const trees = Math.min(18, Math.max(0, Math.floor(points / 20)));

  return (
    <div className="lab-page">
      <header className="page-hero">
        <h1>Laboratorio <em>EcoScan</em></h1>
        <p>Aprende a desarmar cada residuo y a tirarlo a la caneca correcta. Un error resta puntos del ranking y se lleva arbolitos del planeta.</p>
      </header>
      {!impact && error ? <LoadState error={error} onRetry={retry} /> : null}

      <section className="lab-bench glass-card">
        <aside className="lab-rail">
          <p className="lab-kicker">Residuos del taller</p>
          <h2>Elige y desarma</h2>
          <p>Empieza por el vidrio o la botella. Quita tapa y etiqueta antes de tirar el cuerpo.</p>
          <div className="lab-specimens">
            {labCatalog.specimens().map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lab-specimen${item.id === specimen.id ? " is-on" : ""}${allSorted(item, sorted) ? " is-done" : ""}`}
                onClick={() => setSpecimenId(item.id)}
              >
                <SpecimenIcon kind={item.kind} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.blurb}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="lab-table" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <p className="lab-kicker">Mesa de separación</p>
          <h2>{specimen.title}</h2>
          <p className="lab-lead">{specimen.blurb}</p>
          <div className={`lab-stage kind-${specimen.kind}${held ? " is-holding" : ""}`}>
            {pieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className={[
                  "lab-bit",
                  piece.id,
                  isReady(piece) ? "is-ready" : "",
                  isLocked(piece) ? "is-locked" : "",
                  sorted.has(piece.id) ? "is-sorted" : "",
                  held === piece.id ? "is-held" : "",
                  prepared.has(piece.id) ? "is-off" : "",
                  peelId === piece.id ? "is-peel" : "",
                ].join(" ")}
                style={
                  held === piece.id
                    ? { left: cursor.x, top: cursor.y }
                    : peelId === piece.id
                      ? { transform: `translateX(${peelX}px) rotate(${peelX * 0.12}deg)` }
                      : undefined
                }
                onPointerDown={(event) => onPiecePointer(piece, event)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                {piece.title}
              </button>
            ))}
            <SpecimenArt kind={specimen.kind} hidden={pieces.every((piece) => sorted.has(piece.id))} />
          </div>
          {feedback ? (
            <div className={`lab-feedback ${feedback.correct ? "is-ok" : feedback.delta < 0 ? "is-bad" : ""}`}>
              <strong>
                {feedback.correct
                  ? `Bien: ${feedback.pieceTitle} → ${feedback.expectedBin}`
                  : feedback.delta < 0
                    ? `Error: −${Math.abs(feedback.delta)} pts`
                    : "Aún no"}
              </strong>
              <p>{feedback.hint}</p>
            </div>
          ) : (
            <p className="lab-hint">Gira, pela o arrastra cada pieza hasta la caneca.</p>
          )}
        </div>
      </section>

      <section className="lab-bins-wrap glass-card">
        <p className="lab-kicker">Canecas</p>
        <h2>Tira aquí</h2>
        <div className="lab-bins" ref={binsRef}>
          {labCatalog.bins().map((bin) => (
            <button
              key={bin.id}
              type="button"
              data-bin={bin.id}
              className={`lab-bin tone-${bin.tone}${held ? " is-open" : ""}`}
              onClick={() => held && void toss(held, bin.id)}
            >
              <i />
              <b>{bin.title}</b>
              <small>{bin.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card lab-panel lab-planet-card">
        <p className="lab-kicker">Tu impacto</p>
        <h2>Planeta del ranking</h2>
        <p className="lab-lead">Los puntos son los mismos del salón. Un error en el laboratorio quita arbolitos.</p>
        <div className="grove-stage grove-wide">
          <Planet size={260} spinning />
          <svg className="grove-trees" viewBox="0 0 300 300" aria-hidden="true">
            {Array.from({ length: trees }, (_, index) => {
              const angle = (index * 2.399) % (Math.PI * 2);
              const radius = 42 + (index % 4) * 12;
              const x = 150 + Math.cos(angle) * radius;
              const y = 142 + Math.sin(angle) * radius * 0.55;
              return (
                <g key={index} transform={`translate(${x} ${y})`}>
                  <polygon points="0,-16 9,5 -9,5" fill="#1de28d" />
                  <rect x="-2" y="5" width="4" height="7" fill="#7a4a2b" />
                </g>
              );
            })}
          </svg>
        </div>
        <p className="grove-count">{points} pts · {grove.label} · {trees} árboles</p>
      </section>
    </div>
  );
}

function allSorted(specimen: LabSpecimen, sorted: Set<string>) {
  return specimen.pieceIds.every((id) => sorted.has(id));
}

function lockHint(piece: LabPiece): LabThrowResult {
  return {
    correct: false,
    delta: 0,
    points: 0,
    labPenalty: 0,
    hint: "Primero quita tapa y etiqueta. El cuerpo no se tira entero.",
    pieceTitle: piece.title,
    binTitle: "",
    expectedBin: "",
  };
}

function hitBin(root: HTMLDivElement | null, x: number, y: number): string | null {
  if (!root) return null;
  const node = document.elementFromPoint(x, y);
  const bin = node?.closest("[data-bin]") as HTMLElement | null;
  return bin?.dataset.bin ?? null;
}

function SpecimenIcon({ kind }: { kind: LabSpecimen["kind"] }) {
  return <span className={`lab-ico kind-${kind}`} aria-hidden="true" />;
}

function SpecimenArt({ kind, hidden }: { kind: LabSpecimen["kind"]; hidden: boolean }) {
  if (hidden) return <p className="lab-cleared">Listo. Elige otro residuo.</p>;
  return <div className={`lab-ghost kind-${kind}`} aria-hidden="true" />;
}
