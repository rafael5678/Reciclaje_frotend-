/** Sorting lab: practice scanned waste on a bench with visible destinations. */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointer } from "react";
import { LoadState } from "../components/LoadState";
import { Planet } from "../components/Planet";
import { WasteArt } from "../components/WasteArt";
import { useImpact } from "../hooks/useImpact";
import { useSession } from "../context/SessionProvider";
import type { LabBin, LabPiece, LabThrowResult, LabSpecimen } from "../models/lab";
import type { Scan } from "../models/types";
import { scanRepository } from "../repositories/scanRepository";
import { groveFrom } from "../services/forest";
import { formatConfidence } from "../services/format";
import { labCatalog } from "../services/labCatalog";
import { labService } from "../services/labService";

export function LabView() {
  const { impact, error, retry } = useImpact();
  const { bump, revision } = useSession();
  const [scans, setScans] = useState<Scan[]>([]);
  const [specimenId, setSpecimenId] = useState("");
  const [prepared, setPrepared] = useState<Set<string>>(() => new Set());
  const [sorted, setSorted] = useState<Set<string>>(() => new Set());
  const [held, setHeld] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hoverBin, setHoverBin] = useState<string | null>(null);
  const [peelId, setPeelId] = useState<string | null>(null);
  const [peelX, setPeelX] = useState(0);
  const [feedback, setFeedback] = useState<LabThrowResult | null>(null);
  const [points, setPoints] = useState(0);
  const binsRef = useRef<HTMLDivElement>(null);
  const heldRef = useRef<string | null>(null);
  const peelRef = useRef<{ id: string | null; x: number }>({ id: null, x: 0 });
  const sortedRef = useRef(sorted);
  const impactRef = useRef(impact);
  heldRef.current = held;
  peelRef.current = { id: peelId, x: peelX };
  sortedRef.current = sorted;
  impactRef.current = impact;

  const queue = useMemo(() => labCatalog.practiceQueue(scans), [scans]);
  const specimen = queue.find((item) => item.id === specimenId) ?? queue[0];
  const pieces = useMemo(() => (specimen ? labCatalog.piecesFor(specimen) : []), [specimen]);
  const heldPiece = held ? labCatalog.piece(held) : undefined;
  const heldBin = heldPiece ? labCatalog.bin(heldPiece.binId) : undefined;

  useEffect(() => {
    let alive = true;
    scanRepository
      .list()
      .then((rows) => {
        if (alive) setScans(rows);
      })
      .catch(() => {
        if (alive) setScans(impactRef.current?.recent ?? []);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  useEffect(() => {
    if (impact) setPoints(impact.points);
  }, [impact]);

  useEffect(() => {
    if (!specimenId && queue[0]) setSpecimenId(queue[0].id);
  }, [queue, specimenId]);

  const actionsRef = useRef<{
    markPrepared: (pieceId: string) => void;
    toss: (pieceId: string, binId: string) => Promise<void>;
  }>({
    markPrepared: () => undefined,
    toss: async () => undefined,
  });

  function markKey(pieceId: string) {
    return `${specimen.id}:${pieceId}`;
  }

  function isPrepared(piece: LabPiece) {
    return piece.prep === "none" || prepared.has(markKey(piece.id));
  }

  function isLocked(piece: LabPiece) {
    return piece.lockedUntil.some((id) => !prepared.has(markKey(id)) && !sorted.has(markKey(id)));
  }

  function isReady(piece: LabPiece) {
    return !sorted.has(markKey(piece.id)) && !isLocked(piece) && isPrepared(piece);
  }

  function markPrepared(pieceId: string) {
    setPrepared((current) => new Set(current).add(`${specimen.id}:${pieceId}`));
    setFeedback(null);
  }

  function onPiecePointer(piece: LabPiece, event: ReactPointer<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (sorted.has(markKey(piece.id))) return;
    if (isLocked(piece)) {
      setFeedback(lockHint(piece));
      return;
    }
    if (!isPrepared(piece) && piece.prep === "unscrew") {
      markPrepared(piece.id);
      return;
    }
    if (!isPrepared(piece) && piece.prep === "peel") {
      setPeelId(piece.id);
      setPeelX(8);
      return;
    }
    if (!isReady(piece)) return;
    setHeld(piece.id);
    setCursor({ x: event.clientX, y: event.clientY });
    setHoverBin(hitBin(event.clientX, event.clientY));
  }

  async function toss(pieceId: string, binId: string) {
    const piece = labCatalog.piece(pieceId);
    const key = markKey(pieceId);
    if (!piece || sortedRef.current.has(key) || isLocked(piece) || !isPrepared(piece)) return;
    const instant = labService.preview(pieceId, binId, impactRef.current?.points ?? points);
    if (instant) {
      setFeedback(instant);
      setPoints(instant.points);
      if (instant.correct) {
        const next = new Set(sortedRef.current).add(key);
        sortedRef.current = next;
        setSorted(next);
      }
    }
    const result = await labService.throw(pieceId, binId, impactRef.current?.points ?? points);
    setFeedback(result);
    setPoints(result.points);
    setSorted((current) => {
      const next = new Set(current);
      if (result.correct) next.add(key);
      else next.delete(key);
      sortedRef.current = next;
      return next;
    });
    bump();
  }

  actionsRef.current = { markPrepared, toss };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (peelRef.current.id) {
        setPeelX((value) => Math.min(140, value + Math.max(0, event.movementX) + Math.abs(event.movementY) * 0.12));
        return;
      }
      if (!heldRef.current) return;
      setCursor({ x: event.clientX, y: event.clientY });
      setHoverBin(hitBin(event.clientX, event.clientY));
    };
    const up = (event: PointerEvent) => {
      const peeling = peelRef.current;
      if (peeling.id) {
        const piece = labCatalog.piece(peeling.id);
        if (piece && peeling.x > 56) actionsRef.current.markPrepared(piece.id);
        setPeelId(null);
        setPeelX(0);
        return;
      }
      const dropping = heldRef.current;
      if (!dropping) return;
      const binId = hitBin(event.clientX, event.clientY);
      setHeld(null);
      setHoverBin(null);
      if (binId) void actionsRef.current.toss(dropping, binId);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  function choose(item: LabSpecimen) {
    setSpecimenId(item.id);
    setHeld(null);
    setFeedback(null);
  }

  const grove = groveFrom(points, impact?.categories[0]?.name);
  const trees = Math.min(18, Math.max(0, Math.floor(points / 20)));
  if (!specimen) {
    return (
      <div className="lab-page">
        <header className="page-hero">
          <h1>Laboratorio <em>EcoScan</em></h1>
        </header>
        {error ? <LoadState error={error} onRetry={retry} /> : <p className="empty">Cargando el taller…</p>}
      </div>
    );
  }

  const history = queue.filter((item) => item.fromScan);
  const extras = queue.filter((item) => !item.fromScan);

  return (
    <div className={`lab-page${held ? " is-dragging" : ""}`}>
      <header className="page-hero">
        <h1>Laboratorio <em>EcoScan</em></h1>
        <p>Lo que ya escaneaste llega aquí. La IA dice el triaje; tú lo separas y lo tiras a la caneca que ves en cada pieza.</p>
      </header>
      {!impact && error ? <LoadState error={error} onRetry={retry} /> : null}

      <section className="lab-workspace glass-card">
        <aside className="lab-rail">
          <p className="lab-kicker">Tu historial</p>
          <h2>A practicar</h2>
          {history.length ? (
            <div className="lab-specimens">
              {history.map((item) => (
                <SpecimenButton key={item.id} item={item} current={specimen.id} sorted={sorted} onChoose={choose} />
              ))}
            </div>
          ) : (
            <p className="lab-lead">Cuando escanees, esos residuos aparecen aquí. Mientras tanto, usa la práctica.</p>
          )}
          {extras.length ? (
            <>
              <p className="lab-kicker lab-kicker-late">Práctica extra</p>
              <div className="lab-specimens">
                {extras.map((item) => (
                  <SpecimenButton key={item.id} item={item} current={specimen.id} sorted={sorted} onChoose={choose} />
                ))}
              </div>
            </>
          ) : null}
        </aside>

        <div className="lab-play">
          <div className="lab-triage">
            <div className="lab-triage-art">
              <WasteArt code={specimen.materialCode} />
            </div>
            <div>
              <p className="lab-kicker">{specimen.fromScan ? "Triaje de la IA" : "Guía del taller"}</p>
              <h2>{specimen.title}</h2>
              <p className="lab-lead">{specimen.blurb}</p>
              <div className="lab-triage-meta">
                <span className="lab-chip">{specimen.materialCode}</span>
                <span className={`lab-chip tone-${labCatalog.bin(binIdFromTitle(specimen.container))?.tone ?? "yellow"}`}>
                  Caneca {specimen.container ?? "—"}
                </span>
                {specimen.confidence != null ? <span className="lab-chip">{formatConfidence(specimen.confidence)}</span> : null}
              </div>
            </div>
          </div>

          <ol className="lab-recipe">
            {pieces.map((piece) => {
              const bin = labCatalog.bin(piece.binId);
              return (
                <li key={piece.id} className={sorted.has(markKey(piece.id)) ? "is-done" : isReady(piece) ? "is-ready" : ""}>
                  <b>{piece.title}</b>
                  <DestBadge bin={bin} />
                  <small>{prepLabel(piece, isPrepared(piece), isLocked(piece))}</small>
                </li>
              );
            })}
          </ol>

          <div className={`lab-stage kind-${specimen.kind}`}>
            {pieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className={[
                  "lab-bit",
                  piece.id,
                  isReady(piece) ? "is-ready" : "",
                  isLocked(piece) ? "is-locked" : "",
                  sorted.has(markKey(piece.id)) ? "is-sorted" : "",
                  held === piece.id ? "is-ghost" : "",
                  isPrepared(piece) && piece.prep !== "none" ? "is-off" : "",
                  peelId === piece.id ? "is-peel" : "",
                ].join(" ")}
                style={peelId === piece.id ? { transform: `translateX(${peelX}px) rotate(${peelX * 0.1}deg)` } : undefined}
                onPointerDown={(event) => onPiecePointer(piece, event)}
              >
                <strong>{piece.title}</strong>
                <DestBadge bin={labCatalog.bin(piece.binId)} />
              </button>
            ))}
            {pieces.every((piece) => sorted.has(markKey(piece.id))) ? (
              <p className="lab-cleared">Separado. Elige otro residuo del historial.</p>
            ) : null}
          </div>

          {feedback ? (
            <div className={`lab-feedback ${feedback.correct ? "is-ok" : feedback.delta < 0 ? "is-bad" : ""}`}>
              <strong>
                {feedback.correct
                  ? `Listo: ${feedback.pieceTitle} → caneca ${feedback.expectedBin}`
                  : feedback.delta < 0
                    ? `Esa no es. Va a ${feedback.expectedBin}. −${Math.abs(feedback.delta)} pts`
                    : "Primero separa las piezas"}
              </strong>
              <p>{feedback.hint}</p>
            </div>
          ) : (
            <p className="lab-hint">Cada pieza dice su caneca. Arrástrala hasta abajo; no se esconde debajo de la mesa.</p>
          )}

          <div className="lab-bins" ref={binsRef}>
            {labCatalog.bins().map((bin) => (
              <button
                key={bin.id}
                type="button"
                data-bin={bin.id}
                className={[
                  "lab-bin",
                  `tone-${bin.tone}`,
                  held ? "is-open" : "",
                  hoverBin === bin.id ? "is-hover" : "",
                  heldBin?.id === bin.id ? "is-target" : "",
                ].join(" ")}
                onClick={() => held && void toss(held, bin.id)}
              >
                <i />
                <b>{bin.title}</b>
                <small>{bin.detail}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card lab-panel lab-planet-card">
        <p className="lab-kicker">Tu impacto</p>
        <h2>Planeta del ranking</h2>
        <div className="grove-stage grove-wide">
          <Planet size={240} spinning />
          <svg className="grove-trees" viewBox="0 0 300 300" aria-hidden="true">
            {Array.from({ length: trees }, (_, index) => {
              const angle = (index * 2.399) % (Math.PI * 2);
              const x = 150 + Math.cos(angle) * (42 + (index % 4) * 12);
              const y = 142 + Math.sin(angle) * (42 + (index % 4) * 12) * 0.55;
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

      {heldPiece && heldBin ? (
        <div className="lab-drag" style={{ left: cursor.x, top: cursor.y }}>
          <strong>{heldPiece.title}</strong>
          <DestBadge bin={heldBin} />
          <small>{hoverBin ? (hoverBin === heldBin.id ? "Suelta: caneca correcta" : "Suelta: esa no es") : "Llévala a la caneca"}</small>
        </div>
      ) : null}
    </div>
  );
}

function SpecimenButton({
  item,
  current,
  sorted,
  onChoose,
}: {
  item: LabSpecimen;
  current: string;
  sorted: Set<string>;
  onChoose: (item: LabSpecimen) => void;
}) {
  const done = item.pieceIds.every((id) => sorted.has(`${item.id}:${id}`));
  return (
    <button type="button" className={`lab-specimen${item.id === current ? " is-on" : ""}${done ? " is-done" : ""}`} onClick={() => onChoose(item)}>
      <span className="lab-ico">
        <WasteArt code={item.materialCode} />
      </span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.fromScan ? `IA · caneca ${item.container}` : item.blurb}</small>
      </span>
    </button>
  );
}

function DestBadge({ bin }: { bin?: LabBin }) {
  if (!bin) return null;
  return <em className={`lab-dest tone-${bin.tone}`}>→ {bin.title}</em>;
}

function prepLabel(piece: LabPiece, prepared: boolean, locked: boolean) {
  if (locked) return "Primero quita tapa y etiqueta";
  if (piece.prep === "unscrew" && !prepared) return "Toca para girar la tapa";
  if (piece.prep === "peel" && !prepared) return "Arrastra para pelar";
  return piece.hint;
}

function binIdFromTitle(title?: string) {
  const found = labCatalog.bins().find((bin) => bin.title === title);
  return found?.id ?? "yellow";
}

function lockHint(piece: LabPiece): LabThrowResult {
  return {
    correct: false,
    delta: 0,
    points: 0,
    labPenalty: 0,
    hint: "Primero quita tapa y etiqueta. Cada una va a su caneca; el cuerpo no se tira entero.",
    pieceTitle: piece.title,
    binTitle: "",
    expectedBin: labCatalog.bin(piece.binId)?.title ?? "",
  };
}

function hitBin(x: number, y: number): string | null {
  const node = document.elementFromPoint(x, y);
  const bin = node?.closest("[data-bin]") as HTMLElement | null;
  return bin?.dataset.bin ?? null;
}
