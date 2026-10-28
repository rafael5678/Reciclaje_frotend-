import { useCountUp } from "../views/useCountUp";

export function CountUp({ value, decimals = 0, suffix = "", active = true }: { value: number; decimals?: number; suffix?: string; active?: boolean }) {
  const current = useCountUp(value, active);
  return (
    <>
      {current.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

export function Ring({ percent, color, label }: { percent: number; color: string; label: string }) {
  const current = useCountUp(percent);
  const radius = 22;
  const length = 2 * Math.PI * radius;
  return (
    <figure className="ring">
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} className="ring-track" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="ring-bar"
          stroke={color}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - current / 100)}
        />
      </svg>
      <strong>{Math.round(current)}%</strong>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
