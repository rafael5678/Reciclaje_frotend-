import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "close"
  | "gear"
  | "drop"
  | "cap"
  | "crush"
  | "leaf"
  | "ban"
  | "check"
  | "scan"
  | "impact"
  | "guide"
  | "user"
  | "home"
  | "camera"
  | "history"
  | "chart"
  | "cpu"
  | "settings"
  | "book"
  | "bell"
  | "chevron"
  | "bin"
  | "logout"
  | "spark"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "download"
  | "users"
  | "map"
  | "copy"
  | "pin";

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function stepIcon(step: string): IconName {
  const value = step.toLowerCase();
  if (value.includes("enju")) return "drop";
  if (value.includes("tapa")) return "cap";
  if (value.includes("aplast")) return "crush";
  if (value.includes("compost") || value.includes("empaque") || value.includes("grasa")) return "leaf";
  if (value.includes("no se") || value.includes("mezclar") || value.includes("bolsa")) return "ban";
  return "check";
}

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 7.2l1.8 1.1M17.4 15.7l1.8 1.1M4.8 16.8l1.8-1.1M17.4 8.3l1.8-1.1" />
    </>
  ),
  drop: <path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z" />,
  cap: <path d="M8 10h8v2a4 4 0 0 1-8 0v-2zM9 10V8a3 3 0 0 1 6 0v2" />,
  crush: <path d="M7 7h10v3H7zM6 14h12v3H6zM8 10.5 12 13l4-2.5" />,
  leaf: <path d="M5 19C14 19 19 12 19 5 12 5 5 10 5 19zM8 16c2-2 4-4 7-6" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m7 7 10 10" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  scan: (
    <>
      <path d="M4 8V5h3M16 5h3v3M20 16v3h-3M8 19H5v-3" />
      <path d="M4 12h16" />
    </>
  ),
  impact: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  guide: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5zM5 5.5V21" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.2c1.4-3 3.8-4.5 7-4.5s5.6 1.5 7 4.5" />
    </>
  ),
  home: <path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
  camera: (
    <>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  chart: <path d="M4 19h16M7 16v-4M12 16V7M17 16v-6" />,
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 7.2l1.8 1.1M17.4 15.7l1.8 1.1M4.8 16.8l1.8-1.1M17.4 8.3l1.8-1.1" />
    </>
  ),
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5z" />,
  bell: (
    <>
      <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  bin: <path d="M5 8h14M9 8V6h6v2M7 8l1 12h8l1-12" />,
  logout: <path d="M10 7V5H5v14h5v-2M10 12h9M16 9l3 3-3 3" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.2 2.2M15.8 15.8 18 18M18 6l-2.2 2.2M8.2 15.8 6 18" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.9-3 3-4.5 5.5-4.5s4.6 1.5 5.5 4.5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.8 14.2c2.2-.2 4 .9 4.7 3.6" />
    </>
  ),
  map: <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M10.6 6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 7.6A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.3-1.1" />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
    </>
  ),
};
