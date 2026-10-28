import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ECO_FACTS } from "../models/facts";
import { prefersReducedMotion } from "../services/motion";
import { LAND_STRIP, Planet } from "./Planet";

const VIEW_W = 600;
const BASE_SPEED = 16;
const ORBIT = { cx: 230, cy: 272, a: 215, b: 56, tilt: (-9 * Math.PI) / 180 };
const ORBITERS: ("leaf" | "dot")[] = ["leaf", "dot", "leaf", "dot", "leaf", "dot", "leaf", "dot"];
const STARS = [
  [70, 70, 1.6], [520, 60, 1.2], [560, 220, 1.8], [40, 300, 1.2], [300, 40, 1.4], [470, 470, 1.2], [110, 460, 1.6], [580, 380, 1.1],
];

type Spin = {
  offset: number;
  velocity: number;
  orbit: number;
  dragging: boolean;
  lastX: number;
  lastT: number;
  moved: number;
  handled: number;
};

export function PlanetScene({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const lands = useRef<SVGGElement>(null);
  const back = useRef<(SVGGElement | null)[]>([]);
  const front = useRef<(SVGGElement | null)[]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const spin = useRef<Spin>({ offset: 0, velocity: BASE_SPEED, orbit: 0, dragging: false, lastX: 0, lastT: 0, moved: 0, handled: 0 });
  const [pulse, setPulse] = useState(0);
  const [fact, setFact] = useState(0);
  const [showFact, setShowFact] = useState(false);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = spin.current;
      if (!s.dragging) {
        const target = reduce ? 0 : BASE_SPEED;
        s.velocity += (target - s.velocity) * (1 - Math.exp(-dt * 1.2));
        s.offset += s.velocity * dt;
      }
      s.offset = ((s.offset % LAND_STRIP) + LAND_STRIP) % LAND_STRIP;
      lands.current?.setAttribute("transform", `translate(${-s.offset} 0)`);
      if (!reduce) s.orbit += dt * (0.32 + Math.min(2, Math.abs(s.velocity) / 160));
      placeOrbiters(s.orbit, back.current, front.current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => setShowFact(true), 1400);
    if (prefersReducedMotion()) return () => window.clearTimeout(first);
    const cycle = window.setInterval(() => setFact((value) => value + 1), 9000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(cycle);
    };
  }, []);

  function nextFact() {
    setShowFact(true);
    setFact((value) => value + 1);
  }

  function toggle() {
    setPulse((value) => value + 1);
    onToggle();
  }

  function scale(): number {
    const width = svg.current?.getBoundingClientRect().width || VIEW_W;
    return VIEW_W / width;
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const s = spin.current;
    s.dragging = true;
    s.lastX = event.clientX;
    s.lastT = performance.now();
    s.moved = 0;
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const s = spin.current;
    if (!s.dragging) return;
    const now = performance.now();
    const dx = event.clientX - s.lastX;
    const units = dx * scale();
    s.offset -= units;
    const dt = Math.max(0.008, (now - s.lastT) / 1000);
    s.velocity = s.velocity * 0.6 + (-units / dt) * 0.4;
    s.moved += Math.abs(dx);
    s.lastX = event.clientX;
    s.lastT = now;
  }

  function up() {
    const s = spin.current;
    if (!s.dragging) return;
    s.dragging = false;
    s.velocity = Math.max(-700, Math.min(700, s.velocity));
    s.handled = performance.now();
    if (s.moved < 6) toggle();
    else nextFact();
  }

  function key(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      spin.current.velocity += event.key === "ArrowRight" ? -220 : 220;
      nextFact();
    }
  }

  return (
    <div className="scene">
      <svg ref={svg} className="scene-svg" viewBox="0 0 600 500" aria-hidden="true">
        <defs>
          <linearGradient id="scene-sleeve" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#13a58e" />
            <stop offset="100%" stopColor="#19c5c5" />
          </linearGradient>
          <linearGradient id="scene-bag" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3ef0a6" />
            <stop offset="100%" stopColor="#15b9b9" />
          </linearGradient>
          <linearGradient id="scene-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d6ffe8" />
            <stop offset="100%" stopColor="#1fbf73" />
          </linearGradient>
        </defs>

        <g className="stars">
          {STARS.map(([x, y, r], index) => (
            <circle key={index} cx={x} cy={y} r={r} style={{ animationDelay: `${index * 0.7}s` }} />
          ))}
        </g>

        <g transform={`rotate(-9 ${ORBIT.cx} ${ORBIT.cy})`}>
          <ellipse cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.a} ry={ORBIT.b} className="orbit-line" />
        </g>
        {ORBITERS.map((kind, index) => (
          <g key={`b${index}`} ref={(node) => { back.current[index] = node; }}>
            <Orbiter kind={kind} />
          </g>
        ))}

        <g className={`scene-planet${pulse ? " is-pulse" : ""}`} key={pulse}>
          <Planet ref={lands} x={80} y={110} size={300} />
        </g>

        <g className="arm">
          <path d="M318 196 C 344 182, 372 150, 404 120" stroke="url(#scene-sleeve)" strokeWidth="28" strokeLinecap="round" fill="none" />
          <path d="M398 126 L410 114" stroke="#8ff7d6" strokeWidth="31" strokeLinecap="round" />
          <g transform="translate(392 16) rotate(10)">
            <ellipse cx="27" cy="82" rx="25" ry="21" fill="#f2b98a" />
            <rect x="0" y="0" width="52" height="92" rx="10" fill="#0b1f1a" stroke="#1de28d" strokeWidth="3" />
            <rect x="5" y="9" width="42" height="72" rx="6" fill="#0f3a2e" />
            <circle cx="26" cy="38" r="13" fill="#1de28d" className="phone-glow" />
            <path d="M21 41l-2 2 2 2M19 43h7a1.6 1.6 0 0 0 1.4-2.2M24.5 33.5l-.6-2.2-2.2.6M23.9 31.3l-3.4 6M28.5 35.5l2.2.6.6-2.2" fill="none" stroke="#053222" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="26" y="64" textAnchor="middle" className="phone-text">EcoScan</text>
            <ellipse cx="4" cy="66" rx="7" ry="15" fill="#f6c49b" transform="rotate(-22 4 66)" />
            <rect x="43" y="54" width="15" height="10" rx="5" fill="#f6c49b" />
            <rect x="43" y="66" width="15" height="10" rx="5" fill="#f2b98a" />
            <rect x="42" y="78" width="14" height="10" rx="5" fill="#eeb083" />
          </g>
        </g>

        <g className="drop-item">
          <rect x="-6" y="-14" width="12" height="26" rx="4" fill="#4cc3f0" />
          <rect x="-3.5" y="-19" width="7" height="6" rx="1.5" fill="#1f7fc4" />
          <rect x="-6" y="-4" width="12" height="7" fill="#dff6ff" opacity="0.8" />
        </g>

        <g transform="translate(470 352)">
          <g className="mini-bag">
            <path d="M24 20 C 24 -4, 66 -4, 66 20" stroke="#19c5c5" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M6 20 H84 L78 92 Q77 98 70 98 H20 Q13 98 12 92 Z" fill="url(#scene-bag)" />
            <path d="M14 30 L18 88" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />
            <g transform="translate(31 42) scale(1.2)" fill="none" stroke="#053222" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17l-2 2 2 2" />
              <path d="M10 19h9a2 2 0 0 0 1.75-2.75l-.55-1" />
              <path d="M8.5 11 7.8 8.3 5.1 9" />
              <path d="M7.8 8.3 3.3 16.1a2 2 0 0 0 1.5 2.9l1.2.02" />
              <path d="M15.5 11l2.7.7.7-2.7" />
              <path d="M18.2 11.7 13.7 3.9a2 2 0 0 0-3.3-.1l-.6 1" />
            </g>
          </g>
          <g transform="translate(45 8)">
            <g className="bag-spark">
              <path d="M0 -16V-6M0 6V16M-16 0H-6M6 0H16M-11 -11l5 5M6 6l5 5M11 -11l-5 5M-6 6l-5 5" stroke="#bfffe6" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {ORBITERS.map((kind, index) => (
          <g key={`f${index}`} ref={(node) => { front.current[index] = node; }}>
            <Orbiter kind={kind} />
          </g>
        ))}
      </svg>

      <button
        className="planet-hit"
        type="button"
        aria-label={open ? "Planeta: cerrar el panel Tu impacto" : "Planeta: abrir el panel Tu impacto. Arrástralo o usa las flechas para girarlo"}
        aria-expanded={open}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        onClick={() => {
          if (performance.now() - spin.current.handled > 400) toggle();
        }}
      />

      {showFact ? (
        <p className="fact-bubble" key={fact} aria-live="polite">
          <span>¿Sabías que…?</span>
          {ECO_FACTS[fact % ECO_FACTS.length]}
        </p>
      ) : null}
      <p className="scene-hint">Toca el planeta · arrástralo para girarlo</p>
    </div>
  );
}

function Orbiter({ kind }: { kind: "leaf" | "dot" }) {
  if (kind === "dot") return <circle r="3.2" fill="#8ff7d6" />;
  return (
    <g>
      <path d="M-12 0C-6 -10 8 -10 12 0C6 9 -8 9 -12 0Z" fill="url(#scene-leaf)" />
      <path d="M-10 0H10" stroke="#0e6b3d" strokeOpacity="0.5" strokeWidth="1.2" />
    </g>
  );
}

function placeOrbiters(orbit: number, back: (SVGGElement | null)[], front: (SVGGElement | null)[]) {
  const cos = Math.cos(ORBIT.tilt);
  const sin = Math.sin(ORBIT.tilt);
  for (let index = 0; index < ORBITERS.length; index += 1) {
    const angle = orbit + (index * Math.PI * 2) / ORBITERS.length;
    const ex = ORBIT.a * Math.cos(angle);
    const ey = ORBIT.b * Math.sin(angle);
    const x = ORBIT.cx + ex * cos - ey * sin;
    const y = ORBIT.cy + ex * sin + ey * cos;
    const depth = Math.sin(angle);
    const size = 0.75 + 0.3 * (depth + 1) * 0.5;
    const transform = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((angle * 180) / Math.PI).toFixed(0)}) scale(${size.toFixed(2)})`;
    const isFront = depth > 0;
    back[index]?.setAttribute("transform", transform);
    front[index]?.setAttribute("transform", transform);
    back[index]?.setAttribute("opacity", isFront ? "0" : "0.5");
    front[index]?.setAttribute("opacity", isFront ? "1" : "0");
  }
}
