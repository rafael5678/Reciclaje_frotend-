export function Logo({ size = 42, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) {
  const tile = tone === "light" ? "#e7f8ef" : "#10241f";
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill={tile} />
      <g transform="translate(16 16)" fill="none" stroke="#14c97a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 17l-2 2 2 2" />
        <path d="M10 19h9a2 2 0 0 0 1.75-2.75l-.55-1" />
        <path d="M8.5 11 7.8 8.3 5.1 9" />
        <path d="M7.8 8.3 3.3 16.1a2 2 0 0 0 1.5 2.9l1.2.02" />
        <path d="M15.5 11l2.7.7.7-2.7" />
        <path d="M18.2 11.7 13.7 3.9a2 2 0 0 0-3.3-.1l-.6 1" />
      </g>
    </svg>
  );
}

export function Brand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className={tone === "light" ? "brand is-light" : "brand"}>
      <Logo tone={tone} />
      <div>
        <strong>EcoScan</strong>
        <span>Recicla con inteligencia</span>
      </div>
    </div>
  );
}
