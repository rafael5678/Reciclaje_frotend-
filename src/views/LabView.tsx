/** Laboratorio: Pasto route, PET parts, Nariño grove and AI replay in one screen. */
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadState } from "../components/LoadState";
import { Planet } from "../components/Planet";
import { useImpact } from "../hooks/useImpact";
import type { BBox, Scan, Score } from "../models/types";
import { scanRepository } from "../repositories/scanRepository";
import { formatConfidence } from "../services/format";

const STOPS = [
  { id: "ucc", name: "UCC Torobajo", place: "Calle 18 #45-150", lat: 1.22976, lon: -77.2899 },
  { id: "emas", name: "EMAS / Veolia", place: "Cra. 24 #23-51", lat: 1.21402, lon: -77.27853 },
  { id: "uni", name: "Unicentro", place: "La Aurora", lat: 1.2055, lon: -77.2774 },
] as const;

const PARTS = [
  { id: "cap", kicker: "PP · N.º 5", title: "Tapa", bin: "Quítala siempre", text: "Otra resina. Si viaja pegada al PET, ensucia el lote en planta." },
  { id: "label", kicker: "Papel o film", title: "Etiqueta", bin: "Pélala si puedes", text: "El adhesivo no es botella. Sale antes del lavado industrial." },
  { id: "body", kicker: "PET · N.º 1", title: "Cuerpo", bin: "Amarillo · envases", text: "Enjuaga, aplasta y deposita. Eso sí se vuelve botella o fibra." },
] as const;

type Vision = { scanId?: number; bbox: BBox; scores: Score[]; engine?: string; model?: string };

export function LabView() {
  const { impact, error, retry } = useImpact();
  const last = impact?.recent[0] ?? null;

  return (
    <div className="lab-page">
      <header className="page-hero">
        <h1>Laboratorio <em>EcoScan</em></h1>
        <p>De la Cooperativa a EMAS, de la tapa al cuerpo PET, del escaneo al bosque. Todo aquí.</p>
      </header>
      {!impact && error ? <LoadState error={error} onRetry={retry} /> : null}
      <RouteScene />
      <div className="lab-grid">
        <PetStudio />
        <ImpactStudio trees={impact?.total ?? 0} scan={last} />
      </div>
    </div>
  );
}

function RouteScene() {
  const pathRef = useRef<SVGPathElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [pose, setPose] = useState({ x: 90, y: 70, a: 25 });
  const stops = useMemo(() => STOPS.map((stop) => ({ ...stop, ...project(stop.lat, stop.lon) })), []);
  const d = useMemo(() => roadPath(stops), [stops]);
  const stage = t < 0.42 ? 0 : t < 0.74 ? 1 : 2;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      setT((value) => {
        const next = (value + dt * 0.12) % 1;
        const path = pathRef.current;
        if (path) {
          const len = path.getTotalLength();
          const p = path.getPointAtLength(next * len);
          const q = path.getPointAtLength(Math.min(len, next * len + 8));
          setPose({ x: p.x, y: p.y, a: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI });
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <section className="lab-hero glass-card">
      <div className="lab-hero-copy">
        <p className="lab-kicker">Ruta real · Pasto</p>
        <h2>De Torobajo al posconsumo</h2>
        <p>La camioneta sigue UCC → EMAS → Unicentro, con las coordenadas que ya están en el mapa. Galeras al fondo, ciudad abajo.</p>
        <ol className="lab-stops">
          {STOPS.map((stop, index) => (
            <li key={stop.id} className={index === stage ? "is-on" : ""}>
              <b>0{index + 1}</b>
              <div>
                <strong>{stop.name}</strong>
                <small>{stop.place}</small>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="cta cta-sm" onClick={() => setPlaying((value) => !value)}>
          {playing ? "Pausar viaje" : "Seguir viaje"}
        </button>
      </div>
      <div className="lab-hero-art">
        <svg viewBox="0 0 720 420" className="lab-scene" role="img" aria-label="Viaje del residuo en Pasto">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07141f" />
              <stop offset="55%" stopColor="#0c2430" />
              <stop offset="100%" stopColor="#12352c" />
            </linearGradient>
            <linearGradient id="road" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1de28d" />
              <stop offset="100%" stopColor="#ffe08a" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="720" height="420" rx="24" fill="url(#sky)" />
          {[[40, 36], [90, 70], [160, 28], [240, 54], [400, 22], [520, 48], [640, 30], [680, 80]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#d9ffe9" opacity="0.55" />
          ))}
          <path d="M-20 250 C 80 210, 160 180, 250 200 C 340 220, 380 140, 520 160 L 760 190 L 760 430 L -20 430 Z" fill="#0a1f1a" />
          <path d="M 80 250 L 220 120 L 360 250 Z" fill="#14352c" />
          <path d="M 220 120 L 248 168 L 190 168 Z" fill="#d5eee4" opacity="0.2" />
          <path d="M 40 310 h 40 v -70 h 28 v 70 h 36 v -48 h 24 v 48 h 50 v -90 h 32 v 90 h 44 v -56 h 26 v 56" fill="#102820" />
          <path d="M 480 300 h 50 v -80 h 36 v 80 h 70 v -110 h 40 v 110 h 80" fill="#0e241c" />
          <rect x="0" y="332" width="720" height="88" fill="#081612" />
          <path ref={pathRef} d={d} fill="none" stroke="url(#road)" strokeWidth="14" strokeLinecap="round" opacity="0.35" />
          <path d={d} fill="none" stroke="url(#road)" strokeWidth="4" strokeLinecap="round" strokeDasharray="14 10" filter="url(#glow)" />
          {stops.map((stop, index) => (
            <g key={stop.id}>
              <circle cx={stop.x} cy={stop.y} r={index === stage ? 16 : 11} fill={index === stage ? "#ffe08a" : "#1de28d"} />
              <circle cx={stop.x} cy={stop.y} r={index === stage ? 22 : 16} fill="none" stroke={index === stage ? "#ffe08a" : "#1de28d"} opacity="0.35" />
            </g>
          ))}
          <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.a})`}>
            <ellipse cx="2" cy="10" rx="22" ry="5" fill="#000" opacity="0.35" />
            <rect x="-22" y="-10" width="32" height="16" rx="3" fill="#e8fff6" />
            <rect x="8" y="-8" width="16" height="12" rx="2" fill="#19c5c5" />
            <rect x="12" y="-6" width="8" height="5" rx="1" fill="#7ee0ff" />
            <circle cx="-12" cy="8" r="4.5" fill="#10241f" />
            <circle cx="-12" cy="8" r="1.6" fill="#9ec9bb" />
            <circle cx="14" cy="8" r="4.5" fill="#10241f" />
            <circle cx="14" cy="8" r="1.6" fill="#9ec9bb" />
            <polygon points="24,-2 34,-1 34,3 24,4" fill="#ffe08a" opacity="0.85" />
          </g>
        </svg>
      </div>
    </section>
  );
}

function PetStudio() {
  const [part, setPart] = useState<(typeof PARTS)[number]["id"]>("body");
  const current = PARTS.find((item) => item.id === part) ?? PARTS[2];
  return (
    <section className="glass-card lab-panel">
      <p className="lab-kicker">Química del envase</p>
      <h2>Tres piezas, tres destinos</h2>
      <div className={`pet-stage is-${part}`}>
        <button type="button" className={`pet-bit cap${part === "cap" ? " is-on" : ""}`} onClick={() => setPart("cap")}>Tapa</button>
        <button type="button" className={`pet-bit label${part === "label" ? " is-on" : ""}`} onClick={() => setPart("label")}>Etiqueta</button>
        <button type="button" className={`pet-bit body${part === "body" ? " is-on" : ""}`} onClick={() => setPart("body")}>PET</button>
      </div>
      <div className="pet-caption">
        <small>{current.kicker}</small>
        <strong>{current.title}</strong>
        <span>{current.bin}</span>
        <p>{current.text}</p>
      </div>
    </section>
  );
}

function ImpactStudio({ trees, scan }: { trees: number; scan: Scan | null }) {
  const count = Math.min(18, Math.max(0, trees));
  const spots = Array.from({ length: count }, (_, index) => {
    const angle = (index * 2.399) % (Math.PI * 2);
    const radius = 42 + (index % 4) * 12;
    return { x: 150 + Math.cos(angle) * radius, y: 142 + Math.sin(angle) * radius * 0.55 };
  });
  return (
    <section className="glass-card lab-panel">
      <p className="lab-kicker">Tu impacto</p>
      <h2>Bosque y última foto</h2>
      <div className="impact-split">
        <div className="grove-stage">
          <Planet size={240} spinning />
          <svg className="grove-trees" viewBox="0 0 300 300" aria-hidden="true">
            {spots.map((spot, index) => (
              <g key={index} transform={`translate(${spot.x} ${spot.y})`}>
                <polygon points="0,-16 9,5 -9,5" fill="#1de28d" />
                <rect x="-2" y="5" width="4" height="7" fill="#7a4a2b" />
              </g>
            ))}
          </svg>
          <p className="grove-count">{trees} escaneos</p>
        </div>
        {scan ? <Replay scan={scan} /> : <p className="empty">Escanea para ver el replay.</p>}
      </div>
    </section>
  );
}

function Replay({ scan }: { scan: Scan }) {
  const vision = readVision();
  const matched = vision && (!vision.scanId || vision.scanId === scan.id) ? vision : null;
  const [src, setSrc] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!scan.hasPhoto) return;
    let alive = true;
    let url = "";
    scanRepository.photo(scan.id).then((next) => {
      if (!alive || !next) return;
      url = next;
      setSrc(next);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [scan.id, scan.hasPhoto]);

  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => (value + 1) % 4), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const box = matched?.bbox;
  const scores = (matched?.scores ?? []).slice().sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="ai-stage">
      <div className="ai-frame">
        {src ? <img src={src} alt={scan.objectName} /> : <p className="empty">Sin foto guardada</p>}
        {src && box && step >= 1 ? (
          <i className="ai-box" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />
        ) : null}
        <span className="ai-tag">{["Foto", "Recuadro", "Puntajes", scan.materialCode][step]}</span>
      </div>
      {step >= 2 && scores.length ? (
        <ul className="ai-scores">
          {scores.map((item) => (
            <li key={item.code}>
              <span>{item.code}</span>
              <i style={{ width: `${Math.min(100, item.score * (item.score > 1 ? 10 : 100))}%` }} />
            </li>
          ))}
        </ul>
      ) : null}
      {step >= 3 ? <p className="ai-call">{scan.objectName} · {formatConfidence(scan.confidence)}</p> : null}
    </div>
  );
}

function readVision(): Vision | null {
  try {
    const raw = sessionStorage.getItem("ecoscan.lastVision");
    return raw ? (JSON.parse(raw) as Vision) : null;
  } catch {
    return null;
  }
}

function project(lat: number, lon: number) {
  const lats = STOPS.map((s) => s.lat);
  const lons = STOPS.map((s) => s.lon);
  const minLat = Math.min(...lats) - 0.006;
  const maxLat = Math.max(...lats) + 0.002;
  const minLon = Math.min(...lons) - 0.008;
  const maxLon = Math.max(...lons) + 0.01;
  return {
    x: 90 + ((lon - minLon) / (maxLon - minLon)) * 520,
    y: 70 + ((maxLat - lat) / (maxLat - minLat)) * 230,
  };
}

function roadPath(stops: { x: number; y: number }[]) {
  const [a, b, c] = stops;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 + 36;
  const nx = (b.x + c.x) / 2 + 20;
  const ny = (b.y + c.y) / 2 - 10;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y} Q ${nx} ${ny} ${c.x} ${c.y}`;
}
