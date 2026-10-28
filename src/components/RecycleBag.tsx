import { useId } from "react";

type Center = "recycle" | "camera" | "network";

export function RecycleBag({ center = "recycle" }: { center?: Center }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="recycle-bag" viewBox="0 0 300 320" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4af3ad" />
          <stop offset="100%" stopColor="#15b3b8" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#1de28d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1de28d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="200" r="150" fill={`url(#${id}-glow)`} />

      <g className="bag-item" style={{ ["--r" as string]: "-24deg", ["--d" as string]: "0s" }}>
        <g transform="translate(92 62)">
          <rect x="-11" y="-30" width="22" height="58" rx="8" fill="#4cc3f0" />
          <rect x="-6" y="-40" width="12" height="11" rx="2" fill="#2b8fd6" />
          <rect x="-11" y="-6" width="22" height="12" fill="#e4f7ff" opacity="0.75" />
        </g>
      </g>
      <g className="bag-item" style={{ ["--r" as string]: "8deg", ["--d" as string]: "-1.2s" }}>
        <g transform="translate(150 46)">
          <rect x="-22" y="-30" width="44" height="58" rx="4" fill="#f4fbf8" />
          <path d="M-13 -14H13M-13 -4H13M-13 6H6" stroke="#9fb7ae" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <g className="bag-item" style={{ ["--r" as string]: "4deg", ["--d" as string]: "-2.4s" }}>
        <g transform="translate(212 66)">
          <rect x="-18" y="-30" width="36" height="58" rx="6" fill="#d7e2e8" />
          <rect x="-18" y="-10" width="36" height="18" fill="#2fe39a" />
          <ellipse cx="0" cy="-30" rx="18" ry="5" fill="#eef4f7" />
        </g>
      </g>
      <g className="bag-item" style={{ ["--r" as string]: "-18deg", ["--d" as string]: "-0.6s" }}>
        <path transform="translate(62 128)" d="M-18 0C-10 -16 12 -16 18 0C10 14 -12 14 -18 0Z" fill="#8ff0b2" />
      </g>
      <g className="bag-item" style={{ ["--r" as string]: "-30deg", ["--d" as string]: "-1.8s" }}>
        <g transform="translate(240 122)">
          <path d="M-18 0C-10 -16 12 -16 18 0C10 14 -12 14 -18 0Z" fill="#2fe39a" />
          <path d="M-12 8 12 -8" stroke="#f4fbf8" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      <g className="bag-body">
        <path d="M104 156 C 104 104, 196 104, 196 156" stroke="#18a891" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M66 156 H234 L222 298 Q220 310 207 310 H93 Q80 310 78 298 Z" fill={`url(#${id}-body)`} />
        <path d="M66 156 H234 L233 170 H67 Z" fill="#0e8f7d" opacity="0.45" />
        <path d="M82 176 H218 L208 294 H92 Z" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 6" />
        <path d="M88 180 L96 290" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="10" strokeLinecap="round" />
        <g transform="translate(150 238)">
          <BagCenter kind={center} />
        </g>
      </g>
      <ellipse cx="150" cy="316" rx="80" ry="5" fill="#000" opacity="0.25" />
    </svg>
  );
}

function BagCenter({ kind }: { kind: Center }) {
  if (kind === "camera") {
    return (
      <g>
        <rect x="-34" y="-30" width="68" height="60" rx="12" fill="#2a8f7a" stroke="#062a22" strokeWidth="3" strokeDasharray="6 5" />
        <g transform="translate(-16 -15) scale(1.35)" fill="none" stroke="#062a22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
          <circle cx="12" cy="13" r="3.2" />
        </g>
      </g>
    );
  }
  if (kind === "network") {
    const nodes = [0, 60, 120, 180, 240, 300].map((angle) => {
      const rad = (angle - 90) * (Math.PI / 180);
      return [Math.cos(rad) * 34, Math.sin(rad) * 34];
    });
    return (
      <g className="bag-network">
        {nodes.map(([x, y], index) => (
          <line key={`l${index}`} x1="0" y1="0" x2={x} y2={y} stroke="#062a22" strokeWidth="3" />
        ))}
        {nodes.map(([x, y], index) => (
          <circle key={`n${index}`} cx={x} cy={y} r="6" fill="#0d6f61" stroke="#062a22" strokeWidth="2.5" style={{ animationDelay: `${index * 0.25}s` }} />
        ))}
        <circle r="11" fill="#062a22" />
      </g>
    );
  }
  return (
    <g transform="translate(-30 -30) scale(2.5)" fill="none" stroke="#062a22" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17l-2 2 2 2" />
      <path d="M10 19h9a2 2 0 0 0 1.75-2.75l-.55-1" />
      <path d="M8.5 11 7.8 8.3 5.1 9" />
      <path d="M7.8 8.3 3.3 16.1a2 2 0 0 0 1.5 2.9l1.2.02" />
      <path d="M15.5 11l2.7.7.7-2.7" />
      <path d="M18.2 11.7 13.7 3.9a2 2 0 0 0-3.3-.1l-.6 1" />
    </g>
  );
}
