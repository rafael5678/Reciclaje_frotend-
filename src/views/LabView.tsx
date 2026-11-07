/** One lab screen: Pasto route, PET parts, Nariño grove and last AI replay. */
import { useEffect, useMemo, useState } from "react";
import { LoadState } from "../components/LoadState";
import { Planet } from "../components/Planet";
import { useImpact } from "../hooks/useImpact";
import type { BBox, Scan, Score } from "../models/types";
import { scanRepository } from "../repositories/scanRepository";
import { formatConfidence } from "../services/format";

const STOPS = [
  { id: "ucc", name: "UCC Torobajo", detail: "Calle 18 #45-150", lat: 1.22976, lon: -77.2899 },
  { id: "emas", name: "EMAS Pasto", detail: "Cra. 24 #23-51", lat: 1.21402, lon: -77.27853 },
  { id: "uni", name: "Unicentro", detail: "La Aurora · posconsumo", lat: 1.2055, lon: -77.2774 },
] as const;

const PARTS = [
  { id: "body", title: "Cuerpo · PET (N.º 1)", bin: "Contenedor amarillo / envases", text: "Polietileno tereftalato. Enjuaga y aplasta. Es lo que sí entra al lote de botellas." },
  { id: "cap", title: "Tapa · casi siempre PP (N.º 5)", bin: "Quítala; no va mezclada con el cuerpo", text: "Otra resina. Si se deja puesta, contamina el PET. Quítala siempre." },
  { id: "label", title: "Etiqueta · papel o film", bin: "Retírala si se deja fácil", text: "El adhesivo y el papel ensucian el lavado. No es el mismo material que la botella." },
] as const;

type Vision = { scanId?: number; bbox: BBox; scores: Score[]; engine?: string; model?: string };

export function LabView() {
  const { impact, error, retry } = useImpact();
  const last = impact?.recent[0] ?? null;

  return (
    <div className="lab-page">
      <header className="page-hero">
        <h1>Laboratorio <em>EcoScan</em></h1>
        <p>Un solo lugar: ruta real en Pasto, piezas de la botella PET, tu bosque de escaneos y el replay de la última foto.</p>
      </header>
      {!impact && error ? <LoadState error={error} onRetry={retry} /> : null}
      <section className="lab-card">
        <h2>Ciudad y material</h2>
        <p className="lab-lead">La camioneta usa coordenadas reales. La botella muestra por qué se quita tapa y etiqueta.</p>
        <PastoTwin />
        <PetParts />
      </section>
      <section className="lab-card">
        <h2>Planeta y replay</h2>
        <p className="lab-lead">Cada escaneo suma un árbol simbólico. El replay usa la foto y los puntajes del modelo, no capas inventadas.</p>
        <Grove trees={impact?.total ?? 0} />
        {last ? <Replay scan={last} /> : <p className="empty">Escanea un residuo para ver el replay de la IA.</p>}
      </section>
    </div>
  );
}

function PastoTwin() {
  const points = useMemo(() => STOPS.map((stop) => ({ ...stop, ...xy(stop.lat, stop.lon) })), []);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setT((value) => (value + dt * 0.18) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const u = t * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(u));
  const f = u - i;
  const truck = { x: lerp(points[i].x, points[i + 1].x, f), y: lerp(points[i].y, points[i + 1].y, f) };
  const stage = t < 0.45 ? 0 : t < 0.78 ? 1 : 2;

  return (
    <div>
      <svg className="pasto-twin" viewBox="0 0 640 340" role="img" aria-label="Ruta UCC, EMAS y Unicentro">
        <rect width="640" height="340" rx="18" fill="#0b1c18" />
        <text x="24" y="28" fill="#7ee0ff" fontSize="12" fontWeight="700">Pasto · Torobajo → centro → Aurora</text>
        <polyline points={path} fill="none" stroke="rgba(29,226,141,0.35)" strokeWidth="6" strokeLinecap="round" />
        <polyline points={path} fill="none" stroke="#1de28d" strokeWidth="2" strokeDasharray="8 8" />
        {points.map((point, index) => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r={index === stage ? 14 : 10} fill={index === stage ? "#ffe08a" : "#1de28d"} />
            <text x={point.x + 16} y={point.y - 8} fill="#e8fff6" fontSize="13" fontWeight="800">{point.name}</text>
            <text x={point.x + 16} y={point.y + 8} fill="#9ec9bb" fontSize="11">{point.detail}</text>
          </g>
        ))}
        <g transform={`translate(${truck.x} ${truck.y})`}>
          <rect x="-14" y="-8" width="22" height="12" rx="2" fill="#d9ffe9" />
          <rect x="8" y="-6" width="10" height="8" rx="1" fill="#19c5c5" />
          <circle cx="-8" cy="6" r="3" fill="#10241f" />
          <circle cx="10" cy="6" r="3" fill="#10241f" />
        </g>
      </svg>
      <footer className="lab-foot">
        <strong>Ahora: {STOPS[stage].name}</strong>
        <button type="button" className="ghost-btn" onClick={() => setPlaying((value) => !value)}>{playing ? "Pausar" : "Reanudar"}</button>
      </footer>
    </div>
  );
}

function PetParts() {
  const [part, setPart] = useState<(typeof PARTS)[number]["id"]>("body");
  const current = PARTS.find((item) => item.id === part) ?? PARTS[0];
  return (
    <div className="pet-lab">
      <svg viewBox="0 0 280 320" className="pet-svg" aria-hidden="true">
        <g className={part === "cap" ? "is-on" : ""} onClick={() => setPart("cap")}>
          <rect x="108" y="18" width="64" height="28" rx="8" fill="#19c5c5" />
          <text x="140" y="37" textAnchor="middle" fill="#053222" fontSize="11" fontWeight="800">Tapa</text>
        </g>
        <g className={part === "label" ? "is-on" : ""} onClick={() => setPart("label")}>
          <rect x="86" y="118" width="108" height="36" rx="4" fill="#ffe08a" />
          <text x="140" y="141" textAnchor="middle" fill="#053222" fontSize="11" fontWeight="800">Etiqueta</text>
        </g>
        <g className={part === "body" ? "is-on" : ""} onClick={() => setPart("body")}>
          <path d="M96 52 h88 v210 a44 20 0 0 1 -88 0 z" fill="rgba(126,224,255,0.35)" stroke="#7ee0ff" strokeWidth="3" />
          <text x="140" y="180" textAnchor="middle" fill="#e8fff6" fontSize="12" fontWeight="800">PET</text>
        </g>
      </svg>
      <div>
        <p className="race-kicker">{current.bin}</p>
        <h3>{current.title}</h3>
        <p>{current.text}</p>
        <div className="pet-picks">
          {PARTS.map((item) => (
            <button key={item.id} type="button" className={item.id === part ? "is-on" : ""} onClick={() => setPart(item.id)}>
              {item.id === "body" ? "Cuerpo" : item.id === "cap" ? "Tapa" : "Etiqueta"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Grove({ trees }: { trees: number }) {
  const count = Math.min(22, Math.max(0, trees));
  const spots = Array.from({ length: count }, (_, index) => {
    const angle = (index * 2.4) % (Math.PI * 2);
    const radius = 38 + (index % 5) * 10;
    return { x: 150 + Math.cos(angle) * radius, y: 150 + Math.sin(angle) * radius * 0.62 };
  });
  return (
    <div className="grove-stage">
      <Planet size={280} />
      <svg className="grove-trees" viewBox="0 0 300 300" aria-hidden="true">
        {spots.map((spot, index) => (
          <g key={index} transform={`translate(${spot.x} ${spot.y})`}>
            <polygon points="0,-14 8,4 -8,4" fill="#1de28d" />
            <rect x="-2" y="4" width="4" height="6" fill="#7a4a2b" />
          </g>
        ))}
      </svg>
    </div>
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
    const timer = window.setInterval(() => setStep((value) => (value + 1) % 4), 2200);
    return () => window.clearInterval(timer);
  }, []);

  if (!src && !matched) return <p className="empty">No hay foto ni puntajes de este escaneo para el replay.</p>;
  const box = matched?.bbox;
  const scores = (matched?.scores ?? []).slice().sort((a, b) => b.score - a.score).slice(0, 4);

  return (
    <div className="ai-stage">
      {src ? (
        <div className="ai-frame">
          <img src={src} alt={scan.objectName} />
          {box && step >= 1 ? (
            <i className="ai-box" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />
          ) : null}
        </div>
      ) : null}
      <ol className="ai-steps">
        <li className={step === 0 ? "is-on" : ""}>1 · Foto</li>
        <li className={step === 1 ? "is-on" : ""}>2 · Recuadro</li>
        <li className={step === 2 ? "is-on" : ""}>3 · Puntajes</li>
        <li className={step === 3 ? "is-on" : ""}>4 · {scan.materialCode}</li>
      </ol>
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

function xy(lat: number, lon: number) {
  const lats = STOPS.map((stop) => stop.lat);
  const lons = STOPS.map((stop) => stop.lon);
  const minLat = Math.min(...lats) - 0.004;
  const maxLat = Math.max(...lats) + 0.004;
  const minLon = Math.min(...lons) - 0.004;
  const maxLon = Math.max(...lons) + 0.004;
  return {
    x: 48 + ((lon - minLon) / (maxLon - minLon)) * 544,
    y: 48 + ((maxLat - lat) / (maxLat - minLat)) * 244,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
