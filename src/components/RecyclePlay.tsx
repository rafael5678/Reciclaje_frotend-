/** Mini-game: drag waste into the bin. */
import { useMemo, useState } from "react";
import { MATERIALS } from "../models/catalog";
import { RecycleBag } from "./RecycleBag";

const TOSS = ["PET", "PAP", "VID", "ORG", "GEN"] as const;

type Piece = {
  code: string;
  left: string;
  top: string;
  inBag: boolean;
};

const START: Record<string, { left: string; top: string }> = {
  PET: { left: "4%", top: "8%" },
  PAP: { left: "72%", top: "4%" },
  VID: { left: "8%", top: "58%" },
  ORG: { left: "78%", top: "52%" },
  GEN: { left: "42%", top: "-2%" },
};

export function RecyclePlay() {
  const [pieces, setPieces] = useState<Piece[]>(() => TOSS.map((code) => ({ code, ...START[code], inBag: false })));
  const [over, setOver] = useState(false);
  const [tip, setTip] = useState<(typeof MATERIALS)[number] | null>(null);

  const remaining = useMemo(() => pieces.filter((piece) => !piece.inBag), [pieces]);

  function drop(code: string) {
    if (!code) return;
    const material = MATERIALS.find((item) => item.code === code);
    if (!material) return;
    setPieces((current) => current.map((piece) => (piece.code === code ? { ...piece, inBag: true } : piece)));
    setTip(material);
    setOver(false);
  }

  return (
    <div className="recycle-play">
      <div
        className={`bag-drop${over ? " is-over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          drop(event.dataTransfer.getData("text/plain"));
        }}
      >
        <RecycleBag center="recycle" float={false} />
        {remaining.map((piece) => {
          const material = MATERIALS.find((item) => item.code === piece.code);
          if (!material) return null;
          return (
            <button
              key={piece.code}
              className="toss-item"
              style={{ left: piece.left, top: piece.top }}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", piece.code)}
              onClick={() => drop(piece.code)}
              title={`Arrastra ${material.objectName} al bolso`}
            >
              <span className="toss-dot" style={{ background: material.accent }} />
              {shortName(material.objectName)}
            </button>
          );
        })}
      </div>
      {tip ? (
        <div className="toss-tip glass-card">
          <strong>{tip.objectName}</strong>
          <p>
            Contenedor <em>{tip.container}</em> · {tip.containerDetail}. {tip.blurb}
          </p>
          <small>{tip.recyclable ? "Suma 10 pts si lo separes bien al escanear." : "No va al reciclaje: llévalo al punto indicado (RAEE o general)."}</small>
        </div>
      ) : (
        <p className="toss-hint">Arrastra cada residuo al bolso (o tócalo) y te decimos a qué contenedor va.</p>
      )}
    </div>
  );
}

function shortName(name: string) {
  return name.replace("Botella plástica PET", "Botella").replace("Caja de cartón", "Cartón").replace("Frasco de vidrio", "Vidrio").replace("Restos orgánicos", "Cáscara").replace("Residuo general", "Cargador");
}
