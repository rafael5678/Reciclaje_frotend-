export function WasteArt({ code }: { code: string }) {
  return (
    <div className="art" data-code={code} aria-hidden="true">
      <svg viewBox="0 0 120 150">
        {code === "HDPE" ? <Jug /> : null}
        {code === "PAP" ? <Box /> : null}
        {code === "VID" ? <Glass /> : null}
        {code === "MET" ? <Can /> : null}
        {code === "MLT" ? <Carton /> : null}
        {code === "ORG" ? <Peel /> : null}
        {code === "GEN" ? <Bag /> : null}
        {code !== "HDPE" && code !== "PAP" && code !== "VID" && code !== "MET" && code !== "MLT" && code !== "ORG" && code !== "GEN" ? <Bottle /> : null}
      </svg>
    </div>
  );
}

function Bottle() {
  return (
    <g>
      <rect x="50" y="18" width="20" height="10" rx="3" fill="#8fd4ea" />
      <path d="M52 28h16l6 12v70c0 8-6 14-14 14s-14-6-14-14V40z" fill="#e7f7fc" stroke="#7ec4da" />
      <path d="M60 46c6 8 6 40 0 62" fill="none" stroke="#ffffff" strokeWidth="3" />
      <path d="M46 86h28" fill="none" stroke="#9ed7ea" />
    </g>
  );
}

function Jug() {
  return (
    <g>
      <rect x="48" y="22" width="22" height="10" rx="3" fill="#d9fff2" />
      <path d="M40 36h40l6 16v58c0 12-10 18-26 18S34 122 34 110V52z" fill="#f4fffb" stroke="#b7e6d8" />
      <path d="M78 58h12v24c0 8-6 12-12 12" fill="none" stroke="#9fd8c8" strokeWidth="4" />
    </g>
  );
}

function Box() {
  return (
    <g>
      <path d="M28 48 60 32l32 16v58L60 122 28 106z" fill="#e7c49a" />
      <path d="M28 48 60 64l32-16" fill="none" stroke="#c89662" />
      <path d="M60 64v58" stroke="#c89662" />
      <path d="M40 70h18M40 80h12" stroke="#a87442" strokeWidth="3" />
    </g>
  );
}

function Glass() {
  return (
    <g>
      <path d="M48 20h24l6 18v62c0 16-8 26-18 26s-18-10-18-26V38z" fill="#b7f0c4" stroke="#6fbf7c" />
      <path d="M56 36h10v70" fill="none" stroke="#ffffff" strokeOpacity="0.7" />
      <rect x="52" y="14" width="16" height="8" rx="2" fill="#8dcea0" />
    </g>
  );
}

function Can() {
  return (
    <g>
      <ellipse cx="60" cy="36" rx="22" ry="8" fill="#d5dbe2" />
      <rect x="38" y="36" width="44" height="78" fill="#c5ced6" />
      <ellipse cx="60" cy="114" rx="22" ry="8" fill="#aeb8c2" />
      <rect x="38" y="58" width="44" height="16" fill="#8fd0b0" />
      <path d="M48 40v68" fill="none" stroke="#ffffff" strokeOpacity="0.7" />
    </g>
  );
}

function Carton() {
  return (
    <g>
      <path d="M36 40h48l8 12v70H36z" fill="#f7f4ea" stroke="#e4d7bf" />
      <path d="M36 40 60 28l32 16" fill="#fff" stroke="#e4d7bf" />
      <rect x="44" y="62" width="34" height="28" rx="4" fill="#7ec8ef" />
      <rect x="44" y="96" width="22" height="8" rx="2" fill="#f0c14d" />
    </g>
  );
}

function Peel() {
  return (
    <g>
      <path d="M70 30c20 20 18 58-8 78-30-6-42-40-28-62 8-8 24-14 36-16z" fill="#f0d15a" />
      <path d="M62 48c8 16 8 36-2 52" fill="none" stroke="#d7a63a" />
      <path d="M48 96c10 8 24 8 34-2" fill="#ffe38a" />
    </g>
  );
}

function Bag() {
  return (
    <g>
      <path d="M34 48h52l-6 74H40z" fill="#f2f4f3" stroke="#c5ccc8" />
      <path d="M48 48c0-12 24-12 24 0" fill="none" stroke="#c5ccc8" strokeWidth="3" />
      <circle cx="52" cy="78" r="6" fill="#ef6d6d" />
      <circle cx="70" cy="92" r="5" fill="#f2c14d" />
      <circle cx="58" cy="104" r="4" fill="#6aa7e8" />
    </g>
  );
}
