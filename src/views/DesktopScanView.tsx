import { RecycleBag } from "../components/RecycleBag";
import type { Scan } from "../models/types";
import { ScannerView } from "./ScannerView";

export function DesktopScanView() {
  const last = readLast();
  return (
    <div className="scan-page">
      <header className="page-hero">
        <h1>Escanea un <em>residuo</em></h1>
        <p>Mételo en el bolso: la IA te dice a dónde va.</p>
      </header>
      <section className="hero-trio is-compact">
        <div className="tile-stack">
          <Step title="1 · Toma o sube la foto" text="Buena luz y fondo limpio." />
          <Step title="2 · La IA lo analiza" text="Detecta el tipo de material." />
        </div>
        <div className="bag-stage">
          <RecycleBag center="camera" />
        </div>
        <div className="tile-stack">
          <Step title="3 · Recibe el contenedor" text="Con los pasos para dejarlo bien." />
          <Step
            title="Último resultado"
            text={last ? `${last.objectName} → contenedor ${last.container.toLowerCase()}` : "Aún no hay resultado."}
          />
        </div>
      </section>
      <div className="desk-scan-frame">
        <ScannerView variant="desk" />
      </div>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <article className="glass-card step-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function readLast(): Scan | null {
  try {
    const raw = sessionStorage.getItem("ecoscan.last");
    return raw ? (JSON.parse(raw) as Scan) : null;
  } catch {
    return null;
  }
}
