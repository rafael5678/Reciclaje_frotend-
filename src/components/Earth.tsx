export function Earth({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 420" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#8fd4ff" />
          <stop offset="42%" stopColor="#1b8fe0" />
          <stop offset="100%" stopColor="#0a4f98" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="62%" stopColor="#1fe08a" stopOpacity="0" />
          <stop offset="100%" stopColor="#1fe08a" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b6f5c8" />
          <stop offset="100%" stopColor="#14924f" />
        </linearGradient>
        <clipPath id="disc">
          <circle cx="210" cy="206" r="112" />
        </clipPath>
      </defs>
      <circle cx="210" cy="206" r="168" fill="url(#halo)" />
      <ellipse cx="210" cy="338" rx="78" ry="14" fill="#04110e" opacity="0.35" />
      <circle cx="210" cy="206" r="116" fill="url(#ocean)" />
      <g clipPath="url(#disc)">
        <ellipse cx="176" cy="168" rx="52" ry="28" fill="#3dce78" transform="rotate(-24 176 168)" />
        <ellipse cx="232" cy="188" rx="26" ry="18" fill="#8ee7a4" />
        <ellipse cx="154" cy="214" rx="34" ry="16" fill="#2fbf6c" transform="rotate(18 154 214)" />
        <ellipse cx="214" cy="236" rx="40" ry="15" fill="#57d888" transform="rotate(-8 214 236)" />
        <ellipse cx="188" cy="150" rx="18" ry="10" fill="#d9ffe6" transform="rotate(-20 188 150)" />
        <path d="M120 150c30-40 70-20 90 10" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="10" />
      </g>
      <ellipse cx="176" cy="168" rx="46" ry="18" fill="#ffffff" opacity="0.18" transform="rotate(-32 176 168)" />
      <circle cx="210" cy="206" r="116" stroke="#d7fff0" strokeOpacity="0.25" />
      <Leaf x={78} y={118} rotate={-40} />
      <Leaf x={300} y={86} rotate={20} scale={1.15} />
      <Leaf x={318} y={168} rotate={55} scale={0.9} />
      <Leaf x={292} y={250} rotate={110} />
      <Leaf x={86} y={246} rotate={-120} scale={1.05} />
      <Leaf x={70} y={176} rotate={-80} scale={0.8} />
      <Leaf x={150} y={70} rotate={-10} scale={0.75} />
    </svg>
  );
}

function Leaf({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 0c28-4 48 10 52 32-22 2-42-6-52-32z" fill="url(#leaf)" />
      <path d="M6 2c16 8 28 20 34 32" stroke="#0e6b3d" strokeWidth="1.4" strokeOpacity="0.45" />
    </g>
  );
}
