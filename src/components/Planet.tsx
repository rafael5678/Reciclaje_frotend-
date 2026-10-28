import { forwardRef, useId } from "react";

export const LAND_STRIP = 480;

type PlanetProps = {
  size?: number;
  x?: number;
  y?: number;
  spinning?: boolean;
  className?: string;
};

export const Planet = forwardRef<SVGGElement, PlanetProps>(function Planet({ size, x, y, spinning = false, className = "" }, landsRef) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`planet${spinning ? " is-spinning" : ""}${className ? ` ${className}` : ""}`}
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 300 300"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="#1de28d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1de28d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-ocean`} cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#86d8ff" />
          <stop offset="45%" stopColor="#1e8fe6" />
          <stop offset="100%" stopColor="#0a4590" />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="78%" stopColor="#021428" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#021428" stopOpacity="0.72" />
        </radialGradient>
        <clipPath id={`${id}-disc`}>
          <circle cx="150" cy="150" r="118" />
        </clipPath>
      </defs>
      <circle className="planet-halo" cx="150" cy="150" r="148" fill={`url(#${id}-halo)`} />
      <circle cx="150" cy="150" r="118" fill={`url(#${id}-ocean)`} />
      <g clipPath={`url(#${id}-disc)`}>
        <g ref={landsRef} className="planet-lands">
          <Lands />
          <g transform={`translate(${LAND_STRIP} 0)`}>
            <Lands />
          </g>
        </g>
      </g>
      <circle cx="150" cy="150" r="118" fill={`url(#${id}-shade)`} />
      <circle cx="150" cy="150" r="118" fill="none" stroke="#c4ffe8" strokeOpacity="0.35" strokeWidth="2" />
    </svg>
  );
});

function Lands() {
  return (
    <>
      <ellipse cx="80" cy="108" rx="46" ry="30" fill="#3ddc84" transform="rotate(-20 80 108)" />
      <ellipse cx="74" cy="102" rx="20" ry="10" fill="#b8f5cf" opacity="0.55" transform="rotate(-20 74 102)" />
      <ellipse cx="112" cy="192" rx="28" ry="46" fill="#2fbf6c" transform="rotate(16 112 192)" />
      <ellipse cx="192" cy="150" rx="40" ry="25" fill="#57d888" />
      <ellipse cx="252" cy="88" rx="24" ry="13" fill="#8ee7a4" />
      <ellipse cx="292" cy="206" rx="50" ry="27" fill="#3ddc84" transform="rotate(-10 292 206)" />
      <ellipse cx="300" cy="198" rx="18" ry="8" fill="#b8f5cf" opacity="0.5" />
      <ellipse cx="362" cy="118" rx="34" ry="46" fill="#2fbf6c" transform="rotate(25 362 118)" />
      <ellipse cx="430" cy="182" rx="30" ry="20" fill="#57d888" />
      <ellipse cx="452" cy="70" rx="24" ry="11" fill="#8ee7a4" />
      <ellipse cx="160" cy="70" rx="34" ry="7" fill="#ffffff" opacity="0.22" />
      <ellipse cx="330" cy="150" rx="40" ry="7" fill="#ffffff" opacity="0.18" />
      <ellipse cx="60" cy="238" rx="36" ry="7" fill="#ffffff" opacity="0.18" />
    </>
  );
}
