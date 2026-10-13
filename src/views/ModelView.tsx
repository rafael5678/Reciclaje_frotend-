import { useState } from "react";
import { evaluateSample, readVisionMeta, sampleKinds, type SampleKind } from "../services/visionService";

export function ModelView() {
  const meta = readVisionMeta();
  const [rows, setRows] = useState<{ kind: SampleKind; got: string; confidence: number; ok: boolean }[]>([]);

  function run() {
    const next = sampleKinds().map((kind) => {
      const hit = evaluateSample(kind);
      const got = hit?.material.code ?? "—";
      return { kind, got, confidence: hit?.confidence ?? 0, ok: got === kind };
    });
    setRows(next);
  }

  const passed = rows.filter((row) => row.ok).length;

  return (
    <div className="model-page">
      <header className="page-head">
        <div>
          <h1>Modelo en el dispositivo</h1>
          <p>Una sola pasada: localizar el residuo y decir de qué material es. La imagen no viaja al servidor.</p>
        </div>
      </header>
      <section className="model-stats">
        <article className="panel-card"><span>Estado</span><strong>Listo sin conexión</strong></article>
        <article className="panel-card"><span>Última inferencia</span><strong>{meta ? `${meta.ms} ms` : "Aún no corre"}</strong></article>
        <article className="panel-card"><span>Motor</span><strong>MIRA + TrashNet</strong></article>
      </section>
      <section className="panel-card pipeline">
        <h2>Cómo decide</h2>
        <ol>
          <li>MIRA, un YOLO11, localiza el residuo en cualquier parte del encuadre.</li>
          <li>TrashNet mira el recorte: cartón, vidrio, metal, papel, plástico o basura.</li>
          <li>Si hay tapa roja, hoja impresa, lápiz, celular o control, gana esa forma.</li>
          <li>Los dos modelos se ponen de acuerdo y eligen el contenedor.</li>
          <li>La foto no viaja. Recién si confirmas, se guarda el resultado.</li>
        </ol>
        <p className="hint">
          En un empaquetado nativo este mismo contrato se cubre con YOLOv8-Lite exportado a TensorFlow Lite.
          Esta versión web ejecuta el detector dentro del navegador para que funcione en el teléfono sin instalar una tienda de modelos.
        </p>
      </section>
      <section className="panel-card">
        <header className="section-head">
          <h2>Prueba con muestras locales</h2>
          <button className="cta cta-inline" onClick={run}>Probar las 8 clases</button>
        </header>
        {rows.length > 0 ? (
          <>
            <p className="hint">{passed} de {rows.length} muestras coincidieron con su material.</p>
            <ul className="sample-list">
              {rows.map((row) => (
                <li key={row.kind} className={row.ok ? "ok" : "bad"}>
                  <b>{row.kind}</b>
                  <span>detectó {row.got}</span>
                  <small>{Math.round(row.confidence * 100)}%</small>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="empty">Genera ocho imágenes de prueba en el navegador y clasifícalas sin cámara.</p>}
      </section>
    </div>
  );
}
